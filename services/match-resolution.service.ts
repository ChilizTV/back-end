/**
 * Match Resolution Service
 * Resolves betting markets on-chain (resolveMarket) for finished matches (FT)
 * with scores in DB. Handles WINNER (1X2), GOALS_TOTAL (Over/Under 2.5), BOTH_SCORE (BTTS).
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chiliz } from 'viem/chains';
import { supabase } from '../config/supabase';
import { chilizConfig, networkType } from '../config/chiliz.config';
import { baseSepolia } from '../utils/chains';
import { FOOTBALL_MATCH_ABI } from '../utils/abis';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;

// MarketState.Resolved = 4
const MARKET_STATE_RESOLVED = 4;

const TX_DELAY_MS = 4000;
function delay(ms: number = TX_DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface MatchToResolve {
    api_football_id: number;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    betting_contract_address: string;
}

export interface ResolveFinishedMatchesResult {
    matchesProcessed: number;
    marketsResolved: number;
}

export class MatchResolutionService {
    private walletClient: ReturnType<typeof createWalletClient>;
    private publicClient: ReturnType<typeof createPublicClient>;
    private chain: typeof baseSepolia | typeof chiliz;

    constructor() {
        if (!ADMIN_PRIVATE_KEY) {
            throw new Error('ADMIN_PRIVATE_KEY environment variable is required for match resolution');
        }
        this.chain = networkType === 'testnet' ? baseSepolia : chiliz;
        const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
        this.walletClient = createWalletClient({
            account,
            chain: this.chain,
            transport: http(chilizConfig.rpcUrl),
        });
        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http(chilizConfig.rpcUrl),
        });
        console.log(`🔧 MatchResolutionService initialized on ${networkType} (${this.chain.name})`);
    }

    /**
     * Get matches that are finished (FT) with scores and a betting contract.
     */
    async getMatchesToResolve(): Promise<MatchToResolve[]> {
        const { data, error } = await supabase
            .from('matches')
            .select('api_football_id, home_team, away_team, home_score, away_score, betting_contract_address')
            .eq('status', 'FT')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .not('betting_contract_address', 'is', null);

        if (error) {
            console.error('❌ Error fetching matches to resolve:', error);
            return [];
        }

        const matches = (data || []).filter(
            (m: any) => m.betting_contract_address && String(m.betting_contract_address).trim() !== ''
        ) as MatchToResolve[];

        return matches;
    }

    /**
     * Compute result for a market from scores.
     * marketId 0 = WINNER (0=home, 1=draw, 2=away)
     * marketId 1 = GOALS_TOTAL line 2.5 (0=under, 1=over)
     * marketId 2 = BOTH_SCORE (0=no, 1=yes)
     */
    private computeResultForMarket(marketId: number, homeScore: number, awayScore: number): number {
        if (marketId === 0) {
            if (homeScore > awayScore) return 0;
            if (awayScore > homeScore) return 2;
            return 1;
        }
        if (marketId === 1) {
            const total = homeScore + awayScore;
            return total > 2 ? 1 : 0;
        }
        if (marketId === 2) {
            return homeScore > 0 && awayScore > 0 ? 1 : 0;
        }
        return 0;
    }

    /**
     * Resolve all non-resolved markets for a single match contract.
     * Returns the number of markets resolved.
     */
    async resolveMarketsForMatch(
        contractAddress: string,
        homeScore: number,
        awayScore: number
    ): Promise<number> {
        const addr = contractAddress as `0x${string}`;
        let resolvedCount = 0;

        const marketCount = await this.publicClient.readContract({
            address: addr,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'marketCount',
        });
        const count = Number(marketCount);
        if (count === 0) return 0;

        for (let marketId = 0; marketId < count; marketId++) {
            try {
                const core = await this.publicClient.readContract({
                    address: addr,
                    abi: FOOTBALL_MATCH_ABI,
                    functionName: 'getMarketCore',
                    args: [BigInt(marketId)],
                }) as readonly [number, bigint, number, number, bigint];
                const state = core[0];
                if (state === MARKET_STATE_RESOLVED) continue;

                const result = BigInt(this.computeResultForMarket(marketId, homeScore, awayScore));
                const hash = await this.walletClient.writeContract({
                    account: this.walletClient.account!,
                    address: addr,
                    abi: FOOTBALL_MATCH_ABI,
                    functionName: 'resolveMarket',
                    args: [BigInt(marketId), result],
                    chain: this.chain,
                });
                await this.publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
                await delay();
                resolvedCount++;
                console.log(`   ✅ Resolved market ${marketId} for ${contractAddress.slice(0, 10)}...`);
            } catch (err: any) {
                console.error(`   ❌ Failed to resolve market ${marketId} for ${contractAddress}:`, err.message);
            }
        }
        return resolvedCount;
    }

    /**
     * Find all finished matches with contracts and resolve their markets on-chain.
     */
    async resolveFinishedMatches(): Promise<ResolveFinishedMatchesResult> {
        const matches = await this.getMatchesToResolve();
        let marketsResolved = 0;

        if (matches.length === 0) {
            console.log('📋 No finished matches to resolve on-chain.');
            return { matchesProcessed: 0, marketsResolved: 0 };
        }

        console.log(`📋 Found ${matches.length} finished match(es) to resolve on-chain.`);

        for (const match of matches) {
            try {
                const count = await this.resolveMarketsForMatch(
                    match.betting_contract_address,
                    match.home_score,
                    match.away_score
                );
                marketsResolved += count;
                if (count > 0) {
                    console.log(`   Match ${match.home_team} vs ${match.away_team}: ${count} market(s) resolved.`);
                }
            } catch (err: any) {
                console.error(`   ❌ Error resolving match ${match.api_football_id}:`, err.message);
            }
        }

        return { matchesProcessed: matches.length, marketsResolved };
    }
}

export const matchResolutionService = new MatchResolutionService();
