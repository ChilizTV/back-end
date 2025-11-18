export enum PredictionStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    WON = 'WON',
    LOST = 'LOST',
    CANCELLED = 'CANCELLED'
}

export interface Prediction {
    id: string;
    userId: string;
    walletAddress: string;
    username: string;
    matchId: number;
    matchName: string;
    predictionType: string;
    predictionValue: string;
    predictedTeam: string;
    odds: number;
    status: PredictionStatus;
    actualResult?: string;
    transactionHash: string;
    placedAt: Date;
    matchStartTime: Date;
    settledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePredictionRequest {
    userId: string;
    walletAddress: string;
    username: string;
    matchId: number;
    matchName: string;
    predictionType: string;
    predictionValue: string;
    predictedTeam: string;
    odds: number;
    transactionHash: string;
    matchStartTime: Date;
}

export interface UserPredictionStats {
    userId: string;
    walletAddress: string;
    totalPredictions: number;
    totalWins: number;
    totalLosses: number;
    activePredictions: number;
    winRate: number;
}

export interface PendingSettlementPrediction extends Prediction {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    matchStatus: string;
}

