export interface WaitlistEntry {
    id: string;
    email: string;
    walletAddress?: string;
    source?: string;
    isWhitelisted: boolean;
    registeredAt: Date;
    whitelistedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWaitlistRequest {
    email: string;
    walletAddress?: string;
    source?: string;
}

