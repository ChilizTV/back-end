export interface Donation {
    id: string;
    streamerAddress: string;
    donorAddress: string;
    streamWalletAddress: string;
    amount: string;
    message?: string;
    transactionHash: string;
    platformFee: string;
    streamerAmount: string;
    createdAt: string;
}

export interface Subscription {
    id: string;
    streamerAddress: string;
    subscriberAddress: string;
    streamWalletAddress: string;
    amount: string;
    durationSeconds: number;
    startTime: string;
    expiryTime: string;
    transactionHash: string;
    platformFee: string;
    streamerAmount: string;
    status: 'active' | 'expired' | 'cancelled';
    createdAt: string;
}

export interface StreamerStats {
    streamerAddress: string;
    totalRevenue: string;
    totalDonations: number;
    totalSubscribers: number;
    activeDonations: number;
    activeSubscriptions: number;
}

export interface DonationListResponse {
    success: boolean;
    donations: Donation[];
    error?: string;
}

export interface SubscriptionListResponse {
    success: boolean;
    subscriptions: Subscription[];
    error?: string;
}

export interface StreamerStatsResponse {
    success: boolean;
    stats?: StreamerStats;
    error?: string;
}
