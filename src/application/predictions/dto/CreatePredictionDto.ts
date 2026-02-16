export interface CreatePredictionDto {
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
