/**
 * Market Odds Service
 * Syncs API Football odds to on-chain contracts (setMarketOdds).
 * The contract stores a single "current" odds per market; we push the representative odds
 * (WINNER = homeWin, GOALS_TOTAL = over25, BOTH_SCORE = bttsYes).
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../config/chiliz.config';
import { baseSepolia } from '../utils/chains';
import { FOOTBALL_MATCH_ABI } from '../utils/abis';
import type { ExtendedOdds } from '../models/ApiFootball.model';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;

const TX_DELAY_MS = 4000;
function delay(ms: number = TX_DELAY_MS) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOddsX10000(decimal: number): number {
    return Math.round(decimal * 10000);
}

/** Representative odds per market (one odds value per market on-chain). */
function getRepresentativeOdds(extendedOdds: ExtendedOdds | null): { marketId: number; decimal: number }[] {
    if (!extendedOdds) return [];
    const out: { marketId: number; decimal: number }[] = [];
    if (extendedOdds.match_winner?.home != null) {
        out.push({ marketId: 0, decimal: extendedOdds.match_winner.home });
    }
    if (extendedOdds.over_under?.over_2_5 != null) {
        out.push({ marketId: 1, decimal: extendedOdds.over_under.over_2_5 });
    }
    if (extendedOdds.both_teams_score?.yes != null) {
        out.push({ marketId: 2, decimal: extendedOdds.both_teams_score.yes });
    }
    return out;
}

export class MarketOddsService {
    private walletClient: ReturnType<typeof createWalletClient>;
    private publicClient: ReturnType<typeof createPublicClient>;
    private chain: typeof baseSepolia | typeof chiliz;

    constructor() {
        if (!ADMIN_PRIVATE_KEY) {
            throw new Error('ADMIN_PRIVATE_KEY required for market odds sync');
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
        console.log(`🔧 MarketOddsService initialized on ${networkType} (${this.chain.name})`);
    }

    /**
     * Syncs API odds to the contract: for each market (0=WINNER, 1=GOALS_TOTAL, 2=BOTH_SCORE),
     * if on-chain odds differ from API, calls setMarketOdds(marketId, newOdds).
     * @returns Number of markets updated on-chain.
     */
    async syncOddsForMatch(contractAddress: string, extendedOdds: ExtendedOdds | null): Promise<number> {
        const addr = contractAddress as `0x${string}`;
        const reps = getRepresentativeOdds(extendedOdds);
        if (reps.length === 0) return 0;

        let marketCount: number;
        try {
            const count = await this.publicClient.readContract({
                address: addr,
                abi: FOOTBALL_MATCH_ABI,
                functionName: 'marketCount',
            });
            marketCount = Number(count);
        } catch (e) {
            console.warn(`⚠️ [MarketOdds] Cannot read marketCount for ${contractAddress}:`, (e as Error).message);
            return 0;
        }

        let updated = 0;
        for (const { marketId, decimal } of reps) {
            if (marketId >= marketCount) continue;
            const newOddsX10000 = toOddsX10000(decimal);
            let currentX10000: number;
            try {
                const current = await this.publicClient.readContract({
                    address: addr,
                    abi: FOOTBALL_MATCH_ABI,
                    functionName: 'getCurrentOdds',
                    args: [BigInt(marketId)],
                });
                currentX10000 = Number(current);
            } catch {
                continue;
            }
            if (currentX10000 === newOddsX10000) continue;
            try {
                await this.walletClient.writeContract({
                    account: this.walletClient.account!,
                    address: addr,
                    abi: FOOTBALL_MATCH_ABI,
                    functionName: 'setMarketOdds',
                    args: [BigInt(marketId), newOddsX10000],
                    chain: this.chain,
                });
                await delay();
                updated++;
                console.log(`   📊 [MarketOdds] ${contractAddress.slice(0, 10)}… market ${marketId}: ${currentX10000 / 10000} → ${decimal}`);
            } catch (err: any) {
                console.warn(`   ⚠️ [MarketOdds] setMarketOdds(${marketId}) failed for ${contractAddress}:`, err?.message ?? err);
            }
        }
        return updated;
    }
}

export const marketOddsService = new MarketOddsService();
