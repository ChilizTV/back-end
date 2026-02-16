import { supabaseClient as supabase } from '../src/infrastructure/database/supabase/client';
import { createPublicClient, http, parseAbiItem, Log, defineChain } from 'viem';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../src/infrastructure/config/chiliz.config';
import { 
    Donation, 
    Subscription, 
    StreamerStats,
    DonationListResponse,
    SubscriptionListResponse,
    StreamerStatsResponse
} from '../models/stream-wallet.model';

const FACTORY_ADDRESS = (process.env.STREAM_WALLET_FACTORY_ADDRESS || 
    '0x7310cE3bD564fA63587a388b87a8C973a0BA3d7B') as `0x${string}`;

// Event signatures from StreamWalletFactory
const DONATION_EVENT = parseAbiItem('event DonationProcessed(address indexed streamer, address indexed donor, uint256 amount, string message)');
const SUBSCRIPTION_EVENT = parseAbiItem('event SubscriptionProcessed(address indexed streamer, address indexed subscriber, uint256 amount)');
const WALLET_CREATED_EVENT = parseAbiItem('event StreamWalletCreated(address indexed streamer, address indexed wallet)');

// Define Base Sepolia chain for viem
const baseSepolia = defineChain({
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://sepolia.base.org'],
        },
    },
    blockExplorers: {
        default: {
            name: 'BaseScan',
            url: 'https://sepolia.basescan.org',
        },
    },
    testnet: true,
});

// Polling interval in ms (Base Sepolia ~2s/block, we poll every 6s)
const POLLING_INTERVAL_MS = 6000;
// Interval for checking expired subscriptions (every 60s)
const EXPIRY_CHECK_INTERVAL_MS = 60000;

export class StreamWalletService {
    private publicClient;
    private isIndexing = false;
    private lastIndexedBlock: bigint = BigInt(0);
    private pollingTimer: ReturnType<typeof setInterval> | null = null;
    private expiryCheckTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Use testnet (baseSepolia) or mainnet (chiliz) based on environment
        const chain = networkType === 'testnet' ? baseSepolia : chiliz;
        
        // Initialize viem public client for reading blockchain data
        this.publicClient = createPublicClient({
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        
        console.log(`🔧 StreamWalletService initialized on ${networkType} (${chain.name})`);
    }

    /**
     * Start indexing blockchain events
     */
    async startEventIndexing(): Promise<void> {
        if (this.isIndexing) {
            console.log('⚠️ Event indexing already running');
            return;
        }

        console.log('🔍 Starting StreamWallet event indexing...');
        this.isIndexing = true;

        try {
            // Get the latest block we indexed
            const { data: lastBlock } = await supabase
                .from('donations')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Start from the last indexed block or a recent block
            const currentBlock = await this.publicClient.getBlockNumber();
            this.lastIndexedBlock = lastBlock ? currentBlock - BigInt(1000) : currentBlock - BigInt(10000);

            console.log(`📊 Starting from block ${this.lastIndexedBlock}`);

            // Index historical events first
            await this.indexHistoricalEvents();

            // Start polling for new real-time events
            this.startPollingNewEvents();

            // Start periodic check for expired subscriptions
            this.startExpiredSubscriptionsCheck();
        } catch (error) {
            console.error('❌ Error starting event indexing:', error);
            this.isIndexing = false;
        }
    }

    /**
     * Index historical events from past blocks
     */
    private async indexHistoricalEvents(): Promise<void> {
        try {
            const currentBlock = await this.publicClient.getBlockNumber();
            const fromBlock = this.lastIndexedBlock;
            const toBlock = currentBlock;

            console.log(`📜 Indexing historical events from block ${fromBlock} to ${toBlock}`);

            // Get donation events
            const donationLogs = await this.publicClient.getLogs({
                address: FACTORY_ADDRESS,
                event: DONATION_EVENT,
                fromBlock,
                toBlock
            });

            // Get subscription events
            const subscriptionLogs = await this.publicClient.getLogs({
                address: FACTORY_ADDRESS,
                event: SUBSCRIPTION_EVENT,
                fromBlock,
                toBlock
            });

            // Get wallet created events
            const walletCreatedLogs = await this.publicClient.getLogs({
                address: FACTORY_ADDRESS,
                event: WALLET_CREATED_EVENT,
                fromBlock,
                toBlock
            });

            console.log(`📊 Found ${donationLogs.length} donations, ${subscriptionLogs.length} subscriptions, and ${walletCreatedLogs.length} wallet creations`);

            // Index all events
            for (const log of donationLogs) {
                await this.indexDonationEvent(log as any);
            }

            for (const log of subscriptionLogs) {
                await this.indexSubscriptionEvent(log as any);
            }

            for (const log of walletCreatedLogs) {
                await this.indexWalletCreatedEvent(log as any);
            }

            this.lastIndexedBlock = toBlock;
            console.log('✅ Historical events indexed');
        } catch (error) {
            console.error('❌ Error indexing historical events:', error);
        }
    }

    /**
     * Polling to capture new events in real-time.
     * watchEvent with HTTP does not work well (eth_newFilter not supported by most public RPCs).
     * Polling with getLogs is reliable and works with any RPC.
     */
    private startPollingNewEvents(): void {
        console.log(`👀 Polling for new events every ${POLLING_INTERVAL_MS / 1000}s...`);

        this.pollingTimer = setInterval(async () => {
            try {
                const currentBlock = await this.publicClient.getBlockNumber();
                if (currentBlock <= this.lastIndexedBlock) return;

                const fromBlock = this.lastIndexedBlock + BigInt(1);
                const toBlock = currentBlock;

                const [donationLogs, subscriptionLogs, walletCreatedLogs] = await Promise.all([
                    this.publicClient.getLogs({
                        address: FACTORY_ADDRESS,
                        event: DONATION_EVENT,
                        fromBlock,
                        toBlock
                    }),
                    this.publicClient.getLogs({
                        address: FACTORY_ADDRESS,
                        event: SUBSCRIPTION_EVENT,
                        fromBlock,
                        toBlock
                    }),
                    this.publicClient.getLogs({
                        address: FACTORY_ADDRESS,
                        event: WALLET_CREATED_EVENT,
                        fromBlock,
                        toBlock
                    })
                ]);

                const totalNew = donationLogs.length + subscriptionLogs.length + walletCreatedLogs.length;
                if (totalNew > 0) {
                    console.log(`📥 ${totalNew} new event(s) detected (blocks ${fromBlock}-${toBlock})`);
                }

                for (const log of donationLogs) {
                    await this.indexDonationEvent(log as any);
                }
                for (const log of subscriptionLogs) {
                    await this.indexSubscriptionEvent(log as any);
                }
                for (const log of walletCreatedLogs) {
                    await this.indexWalletCreatedEvent(log as any);
                }

                this.lastIndexedBlock = toBlock;
            } catch (error) {
                console.error('❌ Error polling events:', error);
            }
        }, POLLING_INTERVAL_MS);
    }

    /**
     * Stop polling (useful for tests or graceful shutdown)
     */
    stopEventIndexing(): void {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        if (this.expiryCheckTimer) {
            clearInterval(this.expiryCheckTimer);
            this.expiryCheckTimer = null;
        }
        this.isIndexing = false;
        console.log('⏹️ Event indexing stopped');
    }

    /**
     * Periodically check and update expired subscriptions in the database
     */
    private startExpiredSubscriptionsCheck(): void {
        console.log(`⏰ Expired subscriptions check every ${EXPIRY_CHECK_INTERVAL_MS / 1000}s`);

        this.expiryCheckTimer = setInterval(async () => {
            try {
                await this.updateExpiredSubscriptions();
            } catch (error) {
                console.error('❌ Error updating expired subscriptions:', error);
            }
        }, EXPIRY_CHECK_INTERVAL_MS);

        // Run once immediately on startup
        this.updateExpiredSubscriptions().catch(err =>
            console.error('❌ Error on initial expiry check:', err)
        );
    }

    /**
     * Update subscriptions that have passed their expiry_time to status 'expired'
     */
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
                console.error('❌ Error updating expired subscriptions:', error);
                return;
            }

            if (data && data.length > 0) {
                console.log(`📅 Marked ${data.length} subscription(s) as expired`);
            }
        } catch (err) {
            console.error('❌ Error in updateExpiredSubscriptions:', err);
        }
    }

    /**
     * Index a wallet created event
     */
    async indexWalletCreatedEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            
            if (!args || !transactionHash) {
                console.error('❌ Invalid wallet created event log:', log);
                return;
            }

            const { streamer, wallet } = args;

            // Check if already indexed
            const { data: existing } = await supabase
                .from('stream_wallets')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                console.log(`⏭️ Wallet creation ${transactionHash} already indexed`);
                return;
            }

            // Insert wallet creation record
            const { error } = await supabase
                .from('stream_wallets')
                .insert({
                    streamer_address: streamer.toLowerCase(),
                    wallet_address: wallet.toLowerCase(),
                    transaction_hash: transactionHash
                });

            if (error) {
                // If it's a duplicate key error, it's okay (already indexed)
                if (error.code === '23505') {
                    console.log(`⏭️ Wallet ${wallet} for streamer ${streamer} already exists`);
                } else {
                    console.error('❌ Error indexing wallet creation:', error);
                }
                return;
            }

            console.log(`✅ Indexed wallet creation: ${wallet} for streamer ${streamer}`);
        } catch (error) {
            console.error('❌ Error in indexWalletCreatedEvent:', error);
        }
    }

    /**
     * Index a donation event
     */
    async indexDonationEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            
            if (!args || !transactionHash) {
                console.error('❌ Invalid donation event log:', log);
                return;
            }

            const { streamer, donor, amount, message } = args;

            // Check if already indexed
            const { data: existing } = await supabase
                .from('donations')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                console.log(`⏭️ Donation ${transactionHash} already indexed`);
                return;
            }

            // Get transaction receipt for more details
            const receipt = await this.publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
            const block = await this.publicClient.getBlock({ blockHash: receipt.blockHash });

            // Calculate fees (assuming 5% platform fee)
            const platformFeeBps = 500; // 5%
            const amountBigInt = BigInt(amount);
            const platformFee = (amountBigInt * BigInt(platformFeeBps)) / BigInt(10000);
            const streamerAmount = amountBigInt - platformFee;

            // Get stream wallet address from factory
            const streamWalletAddress = await this.getStreamerWallet(streamer);

            // Insert into database
            const { error } = await supabase
                .from('donations')
                .insert({
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
                console.error('❌ Error inserting donation:', error);
            } else {
                console.log(`✅ Indexed donation: ${transactionHash.slice(0, 10)}... (${(Number(amountBigInt) / 1e18).toFixed(4)} CHZ)`);
                let matchId = await this.getMatchIdForStreamer(streamer.toLowerCase(), streamWalletAddress?.toLowerCase() || null);
                if (!matchId && networkType === 'testnet') {
                    matchId = 1;
                    console.log(`📋 No stream found for streamer ${streamer}, using default match 1 for chat message`);
                }
                if (matchId) {
                    await this.insertChatMessageForStreamerEvent(
                        matchId,
                        'donation',
                        donor.toLowerCase(),
                        (Number(amountBigInt) / 1e18).toString(),
                        message || undefined
                    );
                }
            }
        } catch (error) {
            console.error('❌ Error indexing donation event:', error);
        }
    }

    /**
     * Index a subscription event
     */
    async indexSubscriptionEvent(log: Log): Promise<void> {
        try {
            const { args, transactionHash } = log as any;
            
            if (!args || !transactionHash) {
                console.error('❌ Invalid subscription event log:', log);
                return;
            }

            const { streamer, subscriber, amount } = args;

            // Check if already indexed
            const { data: existing } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('transaction_hash', transactionHash)
                .single();

            if (existing) {
                console.log(`⏭️ Subscription ${transactionHash} already indexed`);
                return;
            }

            // Get transaction receipt for more details
            const receipt = await this.publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
            const block = await this.publicClient.getBlock({ blockHash: receipt.blockHash });

            // Calculate fees (assuming 5% platform fee)
            const platformFeeBps = 500; // 5%
            const amountBigInt = BigInt(amount);
            const platformFee = (amountBigInt * BigInt(platformFeeBps)) / BigInt(10000);
            const streamerAmount = amountBigInt - platformFee;

            // Get stream wallet address from factory
            const streamWalletAddress = await this.getStreamerWallet(streamer);

            // Default duration 30 days (we'll need to get this from contract call data)
            const durationSeconds = 30 * 24 * 60 * 60;
            const startTime = new Date(Number(block.timestamp) * 1000);
            const expiryTime = new Date(startTime.getTime() + durationSeconds * 1000);

            // Insert into database
            const { error } = await supabase
                .from('subscriptions')
                .insert({
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
                console.error('❌ Error inserting subscription:', error);
            } else {
                console.log(`✅ Indexed subscription: ${transactionHash.slice(0, 10)}... (${(Number(amountBigInt) / 1e18).toFixed(4)} CHZ)`);
                let matchId = await this.getMatchIdForStreamer(streamer.toLowerCase(), streamWalletAddress?.toLowerCase() || null);
                if (!matchId && networkType === 'testnet') {
                    matchId = 1;
                    console.log(`📋 No stream found for streamer ${streamer}, using default match 1 for chat message`);
                }
                if (matchId) {
                    await this.insertChatMessageForStreamerEvent(
                        matchId,
                        'subscription',
                        subscriber.toLowerCase(),
                        (Number(amountBigInt) / 1e18).toString()
                    );
                }
            }
        } catch (error) {
            console.error('❌ Error indexing subscription event:', error);
        }
    }

    /**
     * Get match_id for a streamer (from their active or most recent stream)
     */
    private async getMatchIdForStreamer(streamerAddress: string, streamWalletAddress: string | null): Promise<number | null> {
        try {
            const addresses = [streamerAddress.toLowerCase()];
            if (streamWalletAddress) {
                addresses.push(streamWalletAddress.toLowerCase());
            }

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

    /**
     * Get username from wallet address (from chat_messages or predictions).
     * Uses ilike for case-insensitive match (wallet can be stored as checksummed or lowercase).
     */
    private async getUsernameForWallet(walletAddress: string): Promise<string | null> {
        try {
            // Normalize: Ethereum addresses - use lowercase for consistent ilike pattern
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

            return predRows?.[0]?.username ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Insert a gold donation/subscription message into the chat
     */
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

            const { error } = await supabase
                .from('chat_messages')
                .insert({
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
                console.error(`❌ Failed to insert chat message for ${type}:`, error.message);
            } else {
                console.log(`💬 Chat message posted for ${type} (match ${matchId})`);
            }
        } catch (err) {
            console.error(`❌ Error inserting chat message for ${type}:`, err);
        }
    }

    /**
     * Get streamer's wallet address from factory
     */
    private async getStreamerWallet(streamerAddress: string): Promise<string | null> {
        try {
            // Call factory.getWallet(streamer)
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
            console.error('❌ Error getting streamer wallet:', error);
            return null;
        }
    }

    /**
     * Get donations for a streamer
     */
    async getStreamerDonations(streamerAddress: string): Promise<DonationListResponse> {
        try {
            const { data, error } = await supabase
                .from('donations')
                .select('*')
                .eq('streamer_address', streamerAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching donations:', error);
                return {
                    success: false,
                    donations: [],
                    error: error.message
                };
            }

            const donations: Donation[] = (data || []).map(row => ({
                id: row.id,
                streamerAddress: row.streamer_address,
                donorAddress: row.donor_address,
                streamWalletAddress: row.stream_wallet_address,
                amount: row.amount,
                message: row.message,
                transactionHash: row.transaction_hash,
                platformFee: row.platform_fee,
                streamerAmount: row.streamer_amount,
                createdAt: row.created_at
            }));

            return {
                success: true,
                donations
            };
        } catch (error) {
            console.error('❌ Error in getStreamerDonations:', error);
            return {
                success: false,
                donations: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get subscriptions for a streamer
     */
    async getStreamerSubscriptions(streamerAddress: string): Promise<SubscriptionListResponse> {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('streamer_address', streamerAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching subscriptions:', error);
                return {
                    success: false,
                    subscriptions: [],
                    error: error.message
                };
            }

            const subscriptions: Subscription[] = (data || []).map(row => ({
                id: row.id,
                streamerAddress: row.streamer_address,
                subscriberAddress: row.subscriber_address,
                streamWalletAddress: row.stream_wallet_address,
                amount: row.amount,
                durationSeconds: row.duration_seconds,
                startTime: row.start_time,
                expiryTime: row.expiry_time,
                transactionHash: row.transaction_hash,
                platformFee: row.platform_fee,
                streamerAmount: row.streamer_amount,
                status: row.status,
                createdAt: row.created_at
            }));

            return {
                success: true,
                subscriptions
            };
        } catch (error) {
            console.error('❌ Error in getStreamerSubscriptions:', error);
            return {
                success: false,
                subscriptions: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get streamer statistics
     */
    async getStreamerStats(streamerAddress: string): Promise<StreamerStatsResponse> {
        try {
            // Get donations
            const donationsResult = await this.getStreamerDonations(streamerAddress);
            const donations = donationsResult.donations || [];

            // Get subscriptions
            const subscriptionsResult = await this.getStreamerSubscriptions(streamerAddress);
            const subscriptions = subscriptionsResult.subscriptions || [];

            // Calculate total revenue
            const totalDonationRevenue = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            const totalSubscriptionRevenue = subscriptions.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            const totalRevenue = totalDonationRevenue + totalSubscriptionRevenue;

            // Count active subscriptions
            const now = new Date();
            const activeSubscriptions = subscriptions.filter(s => 
                s.status === 'active' && new Date(s.expiryTime) > now
            ).length;

            const stats: StreamerStats = {
                streamerAddress,
                totalRevenue: totalRevenue.toFixed(8),
                totalDonations: donations.length,
                totalSubscribers: subscriptions.length,
                activeDonations: donations.length,
                activeSubscriptions
            };

            return {
                success: true,
                stats
            };
        } catch (error) {
            console.error('❌ Error in getStreamerStats:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get donor's donation history
     */
    async getDonorHistory(donorAddress: string): Promise<DonationListResponse> {
        try {
            const { data, error } = await supabase
                .from('donations')
                .select('*')
                .eq('donor_address', donorAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching donor history:', error);
                return {
                    success: false,
                    donations: [],
                    error: error.message
                };
            }

            const donations: Donation[] = (data || []).map(row => ({
                id: row.id,
                streamerAddress: row.streamer_address,
                donorAddress: row.donor_address,
                streamWalletAddress: row.stream_wallet_address,
                amount: row.amount,
                message: row.message,
                transactionHash: row.transaction_hash,
                platformFee: row.platform_fee,
                streamerAmount: row.streamer_amount,
                createdAt: row.created_at
            }));

            return {
                success: true,
                donations
            };
        } catch (error) {
            console.error('❌ Error in getDonorHistory:', error);
            return {
                success: false,
                donations: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get subscriber's subscription history
     */
    async getSubscriberHistory(subscriberAddress: string): Promise<SubscriptionListResponse> {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('subscriber_address', subscriberAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching subscriber history:', error);
                return {
                    success: false,
                    subscriptions: [],
                    error: error.message
                };
            }

            const subscriptions: Subscription[] = (data || []).map(row => ({
                id: row.id,
                streamerAddress: row.streamer_address,
                subscriberAddress: row.subscriber_address,
                streamWalletAddress: row.stream_wallet_address,
                amount: row.amount,
                durationSeconds: row.duration_seconds,
                startTime: row.start_time,
                expiryTime: row.expiry_time,
                transactionHash: row.transaction_hash,
                platformFee: row.platform_fee,
                streamerAmount: row.streamer_amount,
                status: row.status,
                createdAt: row.created_at
            }));

            return {
                success: true,
                subscriptions
            };
        } catch (error) {
            console.error('❌ Error in getSubscriberHistory:', error);
            return {
                success: false,
                subscriptions: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export singleton instance
export const streamWalletService = new StreamWalletService();
