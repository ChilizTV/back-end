/**
 * Betting Event Indexer Service
 * Listens to BetPlaced events from betting contracts and stores them in the database.
 * Replaces frontend → backend call for saving predictions.
 */

import { supabase } from '../config/supabase';
import { createPublicClient, http, parseAbiItem, Log, defineChain } from 'viem';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../config/chiliz.config';
import { baseSepolia } from '../utils/chains';
import { BET_PLACED_EVENT } from '../utils/abis';

const POLLING_INTERVAL_MS = 6000;

interface MatchWithContract {
    api_football_id: number;
    home_team: string;
    away_team: string;
    match_date: string;
    betting_contract_address: string;
    odds?: { match_winner?: { home?: number; draw?: number; away?: number } } | null;
}

export class BettingEventIndexerService {
    private publicClient: ReturnType<typeof createPublicClient>;
    private isIndexing = false;
    private lastIndexedBlock: bigint = BigInt(0);
    private pollingTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const chain = networkType === 'testnet' ? baseSepolia : chiliz;
        this.publicClient = createPublicClient({
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        console.log(`🔧 BettingEventIndexerService initialized on ${networkType}`);
    }

    async startEventIndexing(): Promise<void> {
        if (this.isIndexing) {
            console.log('⚠️ Betting event indexing already running');
            return;
        }

        console.log('🎯 Starting Betting event indexing...');
        this.isIndexing = true;

        try {
            const currentBlock = await this.publicClient.getBlockNumber();
            this.lastIndexedBlock = currentBlock - BigInt(100);
            await this.indexHistoricalEvents();
            this.startPollingNewEvents();
        } catch (error) {
            console.error('❌ Error starting betting event indexing:', error);
            this.isIndexing = false;
        }
    }

    private async getBettingContracts(): Promise<MatchWithContract[]> {
        const { data, error } = await supabase
            .from('matches')
            .select('api_football_id, home_team, away_team, match_date, betting_contract_address, odds')
            .not('betting_contract_address', 'is', null);

        if (error || !data?.length) return [];
        return data as MatchWithContract[];
    }

    /** Get odds for WINNER market by selection (0=home, 1=draw, 2=away). Uses DB odds so dashboard shows correct cote per outcome. */
    private getOddsForSelection(selection: number, match: MatchWithContract): number | null {
        const mw = match.odds?.match_winner;
        if (!mw) return null;
        if (selection === 0) return mw.home ?? null;
        if (selection === 1) return mw.draw ?? null;
        if (selection === 2) return mw.away ?? null;
        return null;
    }

    private async indexHistoricalEvents(): Promise<void> {
        const matches = await this.getBettingContracts();
        if (matches.length === 0) {
            console.log('📋 No betting contracts to index');
            return;
        }

        const addresses = matches.map(m => m.betting_contract_address as `0x${string}`);
        const currentBlock = await this.publicClient.getBlockNumber();
        const fromBlock = this.lastIndexedBlock + BigInt(1);
        const toBlock = currentBlock;

        try {
            const logs = await this.publicClient.getLogs({
                address: addresses,
                event: BET_PLACED_EVENT,
                fromBlock,
                toBlock
            });

            if (logs.length > 0) {
                console.log(`📊 Found ${logs.length} historical BetPlaced event(s)`);
                for (const log of logs) {
                    await this.indexBetPlacedEvent(log as any, matches);
                }
            }
            this.lastIndexedBlock = toBlock;
        } catch (error) {
            console.error('❌ Error indexing historical betting events:', error);
        }
    }

    private startPollingNewEvents(): void {
        console.log(`👀 Polling for new BetPlaced events every ${POLLING_INTERVAL_MS / 1000}s...`);

        this.pollingTimer = setInterval(async () => {
            try {
                const matches = await this.getBettingContracts();
                if (matches.length === 0) return;

                const currentBlock = await this.publicClient.getBlockNumber();
                if (currentBlock <= this.lastIndexedBlock) return;

                const addresses = matches.map(m => m.betting_contract_address as `0x${string}`);
                const fromBlock = this.lastIndexedBlock + BigInt(1);
                const toBlock = currentBlock;

                const logs = await this.publicClient.getLogs({
                    address: addresses,
                    event: BET_PLACED_EVENT,
                    fromBlock,
                    toBlock
                });

                if (logs.length > 0) {
                    console.log(`📥 ${logs.length} new BetPlaced event(s) detected`);
                    for (const log of logs) {
                        await this.indexBetPlacedEvent(log as any, matches);
                    }
                }
                this.lastIndexedBlock = toBlock;
            } catch (error) {
                console.error('❌ Error polling BetPlaced events:', error);
            }
        }, POLLING_INTERVAL_MS);
    }

    stopEventIndexing(): void {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        this.isIndexing = false;
        console.log('⏹️ Betting event indexing stopped');
    }

    private getMatchForContract(contractAddress: string, matches: MatchWithContract[]): MatchWithContract | undefined {
        const addr = contractAddress.toLowerCase();
        return matches.find(m => m.betting_contract_address?.toLowerCase() === addr);
    }

    private selectionToPrediction(selection: number, match: MatchWithContract): { subType: string; team: string } {
        switch (selection) {
            case 0: return { subType: 'home', team: match.home_team };
            case 1: return { subType: 'draw', team: 'Draw' };
            case 2: return { subType: 'away', team: match.away_team };
            default: return { subType: 'home', team: match.home_team };
        }
    }

    private async getUsernameForWallet(walletAddress: string): Promise<string | null> {
        try {
            const { data: chatRows } = await supabase
                .from('chat_messages')
                .select('username')
                .eq('wallet_address', walletAddress.toLowerCase())
                .order('created_at', { ascending: false })
                .limit(1);
            if (chatRows?.[0]?.username) return chatRows[0].username;

            const { data: predRows } = await supabase
                .from('predictions')
                .select('username')
                .eq('wallet_address', walletAddress.toLowerCase())
                .order('placed_at', { ascending: false })
                .limit(1);
            return predRows?.[0]?.username ?? null;
        } catch {
            return null;
        }
    }

    async indexBetPlacedEvent(log: Log, matches: MatchWithContract[]): Promise<void> {
        try {
            const { args, transactionHash, address } = log as any;
            if (!args || !transactionHash || !address) return;

            const { user, amount, selection, odds: oddsX10000 } = args;
            const contractAddress = (typeof address === 'string' ? address : address?.address) ?? address;
            const match = this.getMatchForContract(contractAddress, matches);
            if (!match) {
                console.warn(`⚠️ No match found for contract ${contractAddress}`);
                return;
            }

            const { data: existing } = await supabase
                .from('predictions')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .maybeSingle();

            if (existing) {
                console.log(`⏭️ Bet ${transactionHash.slice(0, 10)}... already indexed`);
                return;
            }

            const amountWei = BigInt(amount);
            const amountCHZ = Number(amountWei) / 1e18;
            const selectionNum = Number(selection);
            const { subType, team } = this.selectionToPrediction(selectionNum, match);

            // Use DB odds for this selection (home/draw/away) so dashboard shows correct cote; contract emits single "current" odds per market
            const oddsForSelection = this.getOddsForSelection(selectionNum, match);
            const oddsToStore = oddsForSelection ?? (oddsX10000 != null ? Number(oddsX10000) / 10000 : 2.0);

            const username = await this.getUsernameForWallet(user) ?? `${user.slice(0, 6)}...${user.slice(-4)}`;

            const { error: predError } = await supabase.from('predictions').insert({
                user_id: 'wallet:' + user.toLowerCase(),
                wallet_address: user.toLowerCase(),
                username,
                match_id: match.api_football_id,
                match_name: `${match.home_team} vs ${match.away_team}`,
                prediction_type: 'match_winner',
                prediction_value: subType,
                predicted_team: team,
                odds: oddsToStore,
                transaction_hash: transactionHash,
                placed_at: new Date().toISOString(),
                match_start_time: match.match_date,
                status: 'PENDING'
            });

            if (predError) {
                console.error('❌ Error inserting prediction:', predError);
                return;
            }

            console.log(`✅ Indexed bet: ${transactionHash.slice(0, 10)}... (${amountCHZ.toFixed(4)} CHZ on ${team})`);

            await this.insertBetSystemMessage(
                match.api_football_id,
                user.toLowerCase(),
                username,
                amountCHZ.toFixed(4),
                team
            );
        } catch (error) {
            console.error('❌ Error indexing BetPlaced event:', error);
        }
    }

    private async insertBetSystemMessage(
        matchId: number,
        userAddress: string,
        displayName: string,
        amountFormatted: string,
        selection: string
    ): Promise<void> {
        try {
            // Format aligned with donation (🎁) and subscription (⭐) for consistent chat design
            const message = `🎯 ${displayName} bet ${amountFormatted} CHZ on ${selection}`;

            const { error } = await supabase.from('chat_messages').insert({
                match_id: matchId,
                user_id: 'system',
                username: 'System',
                message,
                message_type: 'system',
                system_type: 'bet',
                wallet_address: userAddress,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('❌ Failed to insert bet chat message:', error.message);
            } else {
                console.log(`💬 Bet system message posted for match ${matchId}`);
            }
        } catch (err) {
            console.error('❌ Error inserting bet chat message:', err);
        }
    }
}

export const bettingEventIndexerService = new BettingEventIndexerService();
