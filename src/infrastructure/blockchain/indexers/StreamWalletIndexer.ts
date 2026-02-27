import { injectable } from 'tsyringe';
import { createPublicClient, http, parseAbiItem, Log, defineChain } from 'viem';
import { chiliz } from 'viem/chains';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { chilizConfig, networkType } from '../../config/chiliz.config';
import { logger } from '../../logging/logger';

const FACTORY_ADDRESS = (process.env.STREAM_WALLET_FACTORY_ADDRESS ||
    '0x7310cE3bD564fA63587a388b87a8C973a0BA3d7B') as `0x${string}`;

const DONATION_EVENT = parseAbiItem('event DonationProcessed(address indexed streamer, address indexed donor, uint256 amount, string message)');
const SUBSCRIPTION_EVENT = parseAbiItem('event SubscriptionProcessed(address indexed streamer, address indexed subscriber, uint256 amount)');
const WALLET_CREATED_EVENT = parseAbiItem('event StreamWalletCreated(address indexed streamer, address indexed wallet)');

const baseSepolia = defineChain({
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
    blockExplorers: { default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' } },
    testnet: true,
});

const POLLING_INTERVAL_MS = 6000;
const EXPIRY_CHECK_INTERVAL_MS = 60000;

/**
 * Stream Wallet Indexer
 * Listens to blockchain events for donations, subscriptions and wallet creations
 */
@injectable()
export class StreamWalletIndexer {
    private publicClient;
    private isRunning = false;
    private lastIndexedBlock: bigint = BigInt(0);
    private pollingTimer: ReturnType<typeof setInterval> | null = null;
    private expiryCheckTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const chain = networkType === 'testnet' ? baseSepolia : chiliz;
        this.publicClient = createPublicClient({
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        logger.info('StreamWalletIndexer initialized', { network: networkType, chain: chain.name });
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('StreamWalletIndexer already running');
            return;
        }

        logger.info('Starting Stream Wallet event indexing');
        this.isRunning = true;

        try {
            const { data: lastBlock } = await supabase
                .from('donations')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const currentBlock = await this.publicClient.getBlockNumber();
            this.lastIndexedBlock = lastBlock ? currentBlock - BigInt(1000) : currentBlock - BigInt(10000);

            logger.info('Starting from block', { block: this.lastIndexedBlock.toString() });

            await this.indexHistoricalEvents();
            this.startPollingNewEvents();
            this.startExpiredSubscriptionsCheck();

            logger.info('Stream Wallet event indexing started successfully');
        } catch (error) {
            this.isRunning = false;
            logger.error('Failed to start Stream Wallet event indexing', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }

        logger.info('Stopping Stream Wallet event indexing');

        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        if (this.expiryCheckTimer) {
            clearInterval(this.expiryCheckTimer);
            this.expiryCheckTimer = null;
        }

        this.isRunning = false;
    }

    private async indexHistoricalEvents(): Promise<void> {
        try {
            const currentBlock = await this.publicClient.getBlockNumber();
            const fromBlock = this.lastIndexedBlock;
            const toBlock = currentBlock;

            logger.info('Indexing historical events', { fromBlock: fromBlock.toString(), toBlock: toBlock.toString() });

            const [donationLogs, subscriptionLogs, walletCreatedLogs] = await Promise.all([
                this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: DONATION_EVENT, fromBlock, toBlock }),
                this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: SUBSCRIPTION_EVENT, fromBlock, toBlock }),
                this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: WALLET_CREATED_EVENT, fromBlock, toBlock })
            ]);

            logger.info('Found historical events', {
                donations: donationLogs.length,
                subscriptions: subscriptionLogs.length,
                walletCreations: walletCreatedLogs.length
            });

            for (const log of donationLogs) await this.indexDonationEvent(log as any);
            for (const log of subscriptionLogs) await this.indexSubscriptionEvent(log as any);
            for (const log of walletCreatedLogs) await this.indexWalletCreatedEvent(log as any);

            this.lastIndexedBlock = toBlock;
            logger.info('Historical events indexed');
        } catch (error) {
            logger.error('Error indexing historical events', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private startPollingNewEvents(): void {
        logger.info('Polling for new events', { intervalMs: POLLING_INTERVAL_MS });

        this.pollingTimer = setInterval(async () => {
            try {
                const currentBlock = await this.publicClient.getBlockNumber();
                if (currentBlock <= this.lastIndexedBlock) return;

                const fromBlock = this.lastIndexedBlock + BigInt(1);
                const toBlock = currentBlock;

                const [donationLogs, subscriptionLogs, walletCreatedLogs] = await Promise.all([
                    this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: DONATION_EVENT, fromBlock, toBlock }),
                    this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: SUBSCRIPTION_EVENT, fromBlock, toBlock }),
                    this.publicClient.getLogs({ address: FACTORY_ADDRESS, event: WALLET_CREATED_EVENT, fromBlock, toBlock })
                ]);

                const totalNew = donationLogs.length + subscriptionLogs.length + walletCreatedLogs.length;
                if (totalNew > 0) {
                    logger.info('New events detected', { count: totalNew, blocks: `${fromBlock}-${toBlock}` });
                }

                for (const log of donationLogs) await this.indexDonationEvent(log as any);
                for (const log of subscriptionLogs) await this.indexSubscriptionEvent(log as any);
                for (const log of walletCreatedLogs) await this.indexWalletCreatedEvent(log as any);

                this.lastIndexedBlock = toBlock;
            } catch (error) {
                logger.error('Error polling events', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, POLLING_INTERVAL_MS);
    }

    private startExpiredSubscriptionsCheck(): void {
        logger.info('Starting expired subscriptions check', { intervalMs: EXPIRY_CHECK_INTERVAL_MS });

        this.expiryCheckTimer = setInterval(async () => {
            try {
                await this.updateExpiredSubscriptions();
            } catch (error) {
                logger.error('Error updating expired subscriptions', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, EXPIRY_CHECK_INTERVAL_MS);

        // Run once immediately
        this.updateExpiredSubscriptions().catch(err => logger.error('Error on initial expiry check', { error: err.message }));
    }

    private async updateExpiredSubscriptions(): Promise<void> {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('subscriptions')
                .update({ status: 'expired' })
                .eq('status', 'active')
                .lt('expiry_time', now)
                .select('id');

            if (error) {
                logger.error('Error updating expired subscriptions', { error: error.message });
                return;
            }

            if (data && data.length > 0) {
                logger.info('Marked subscriptions as expired', { count: data.length });
            }
        } catch (err) {
            logger.error('Error in updateExpiredSubscriptions', {
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    }

    async indexWalletCreatedEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            if (!args || !transactionHash) {
                logger.error('Invalid wallet created event log', { log });
                return;
            }

            const { streamer, wallet } = args;

            const { data: existing } = await supabase
                .from('stream_wallets')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                logger.debug('Wallet creation already indexed', { txHash: transactionHash });
                return;
            }

            const { error } = await supabase.from('stream_wallets').insert({
                streamer_address: streamer.toLowerCase(),
                wallet_address: wallet.toLowerCase(),
                transaction_hash: transactionHash
            });

            if (error && error.code !== '23505') {
                logger.error('Error indexing wallet creation', { error: error.message });
            } else {
                logger.info('Indexed wallet creation', { streamer, wallet });
            }
        } catch (error) {
            logger.error('Error in indexWalletCreatedEvent', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async indexDonationEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            if (!args || !transactionHash) {
                logger.error('Invalid donation event log', { log });
                return;
            }

            const { streamer, donor, amount, message } = args;

            const { data: existing } = await supabase
                .from('donations')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                logger.debug('Donation already indexed', { txHash: transactionHash });
                return;
            }

            const receipt = await this.publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
            const block = await this.publicClient.getBlock({ blockHash: receipt.blockHash });

            const platformFeeBps = 500;
            const amountBigInt = BigInt(amount);
            const platformFee = (amountBigInt * BigInt(platformFeeBps)) / BigInt(10000);
            const streamerAmount = amountBigInt - platformFee;

            const streamWalletAddress = await this.getStreamerWallet(streamer);

            const { error } = await supabase.from('donations').insert({
                streamer_address: streamer.toLowerCase(),
                donor_address: donor.toLowerCase(),
                stream_wallet_address: streamWalletAddress?.toLowerCase() || '',
                amount: (Number(amountBigInt) / 1e18).toString(),
                message: message || null,
                transaction_hash: transactionHash,
                platform_fee: (Number(platformFee) / 1e18).toString(),
                streamer_amount: (Number(streamerAmount) / 1e18).toString(),
                created_at: new Date(Number(block.timestamp) * 1000).toISOString()
            });

            if (error) {
                logger.error('Error inserting donation', { error: error.message });
            } else {
                logger.info('Indexed donation', { txHash: transactionHash.slice(0, 10), amount: (Number(amountBigInt) / 1e18).toFixed(4) });

                let matchId = await this.getMatchIdForStreamer(streamer.toLowerCase(), streamWalletAddress?.toLowerCase() || null);
                if (!matchId && networkType === 'testnet') {
                    matchId = 999001;
                }
                if (matchId) {
                    // Verify match exists before inserting chat message
                    const matchExists = await this.verifyMatchExists(matchId);
                    if (matchExists) {
                        await this.insertChatMessageForStreamerEvent(
                            matchId,
                            'donation',
                            donor.toLowerCase(),
                            (Number(amountBigInt) / 1e18).toString(),
                            message || undefined
                        );
                    } else {
                        logger.warn('Match not found for donation chat message', { matchId });
                    }
                }
            }
        } catch (error) {
            logger.error('Error indexing donation event', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async indexSubscriptionEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            if (!args || !transactionHash) {
                logger.error('Invalid subscription event log', { log });
                return;
            }

            const { streamer, subscriber, amount } = args;

            const { data: existing } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                logger.debug('Subscription already indexed', { txHash: transactionHash });
                return;
            }

            const receipt = await this.publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
            const block = await this.publicClient.getBlock({ blockHash: receipt.blockHash });

            const platformFeeBps = 500;
            const amountBigInt = BigInt(amount);
            const platformFee = (amountBigInt * BigInt(platformFeeBps)) / BigInt(10000);
            const streamerAmount = amountBigInt - platformFee;

            const streamWalletAddress = await this.getStreamerWallet(streamer);

            const durationSeconds = 30 * 24 * 60 * 60;
            const startTime = new Date(Number(block.timestamp) * 1000);
            const expiryTime = new Date(startTime.getTime() + durationSeconds * 1000);

            const { error } = await supabase.from('subscriptions').insert({
                streamer_address: streamer.toLowerCase(),
                subscriber_address: subscriber.toLowerCase(),
                stream_wallet_address: streamWalletAddress?.toLowerCase() || '',
                amount: (Number(amountBigInt) / 1e18).toString(),
                duration_seconds: durationSeconds,
                start_time: startTime.toISOString(),
                expiry_time: expiryTime.toISOString(),
                transaction_hash: transactionHash,
                platform_fee: (Number(platformFee) / 1e18).toString(),
                streamer_amount: (Number(streamerAmount) / 1e18).toString(),
                status: 'active',
                created_at: startTime.toISOString()
            });

            if (error) {
                logger.error('Error inserting subscription', { error: error.message });
            } else {
                logger.info('Indexed subscription', { txHash: transactionHash.slice(0, 10), amount: (Number(amountBigInt) / 1e18).toFixed(4) });

                let matchId = await this.getMatchIdForStreamer(streamer.toLowerCase(), streamWalletAddress?.toLowerCase() || null);
                if (!matchId && networkType === 'testnet') {
                    matchId = 999001;
                }
                if (matchId) {
                    // Verify match exists before inserting chat message
                    const matchExists = await this.verifyMatchExists(matchId);
                    if (matchExists) {
                        await this.insertChatMessageForStreamerEvent(
                            matchId,
                            'subscription',
                            subscriber.toLowerCase(),
                            (Number(amountBigInt) / 1e18).toString()
                        );
                    } else {
                        logger.warn('Match not found for subscription chat message', { matchId });
                    }
                }
            }
        } catch (error) {
            logger.error('Error indexing subscription event', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async getMatchIdForStreamer(streamerAddress: string, streamWalletAddress: string | null): Promise<number | null> {
        try {
            const addresses = [streamerAddress.toLowerCase()];
            if (streamWalletAddress) addresses.push(streamWalletAddress.toLowerCase());

            const { data, error } = await supabase
                .from('live_streams')
                .select('match_id')
                .in('streamer_wallet_address', addresses)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) return null;
            return data.match_id;
        } catch {
            return null;
        }
    }

    private async verifyMatchExists(matchId: number): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('api_football_id')
                .eq('api_football_id', matchId)
                .maybeSingle();

            return !error && !!data;
        } catch {
            return false;
        }
    }

    private async getUsernameForWallet(walletAddress: string): Promise<string | null> {
        try {
            const addrPattern = walletAddress.toLowerCase();
            const { data: chatMessages } = await supabase
                .from('chat_messages')
                .select('username')
                .ilike('wallet_address', addrPattern)
                .not('username', 'eq', 'System')
                .order('created_at', { ascending: false })
                .limit(1);

            if (chatMessages?.[0]?.username) return chatMessages[0].username;

            const { data: predRows } = await supabase
                .from('predictions')
                .select('username')
                .ilike('wallet_address', addrPattern)
                .order('created_at', { ascending: false })
                .limit(1);

            if (predRows?.[0]?.username) return predRows[0].username;

            const { data: connectedRows } = await supabase
                .from('chat_connected_users')
                .select('username')
                .ilike('wallet_address', addrPattern)
                .not('username', 'eq', 'System')
                .order('last_activity', { ascending: false })
                .limit(1);

            return connectedRows?.[0]?.username ?? null;
        } catch {
            return null;
        }
    }

    private async insertChatMessageForStreamerEvent(
        matchId: number,
        type: 'donation' | 'subscription',
        userAddress: string,
        amount: string,
        extraMessage?: string
    ): Promise<void> {
        try {
            const displayName = await this.getUsernameForWallet(userAddress)
                ?? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            const amountFormatted = parseFloat(amount).toFixed(4);
            const message = type === 'donation'
                ? `🎁 ${displayName} donated ${amountFormatted} CHZ${extraMessage ? `: "${extraMessage}"` : ''}`
                : `⭐ ${displayName} subscribed for ${amountFormatted} CHZ`;

            const { error } = await supabase.from('chat_messages').insert({
                match_id: matchId,
                user_id: 'system',
                username: 'System',
                message,
                message_type: 'system',
                system_type: type,
                wallet_address: userAddress,
                created_at: new Date().toISOString()
            });

            if (error) {
                logger.error(`Failed to insert chat message for ${type}`, { error: error.message });
            } else {
                logger.info(`Chat message posted for ${type}`, { matchId });
            }
        } catch (err) {
            logger.error(`Error inserting chat message for ${type}`, {
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    }

    private async getStreamerWallet(streamerAddress: string): Promise<string | null> {
        try {
            const wallet = await this.publicClient.readContract({
                address: FACTORY_ADDRESS,
                abi: [{
                    name: 'getWallet',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'streamer', type: 'address' }],
                    outputs: [{ name: 'wallet', type: 'address' }]
                }],
                functionName: 'getWallet',
                args: [streamerAddress as `0x${string}`]
            });

            return wallet as string;
        } catch (error) {
            logger.error('Error getting streamer wallet', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
}
