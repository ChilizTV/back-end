import { Prediction } from '../entities/Prediction';
import { TransactionHash } from '../value-objects/TransactionHash';

export interface UserPredictionStats {
  userId: string;
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalLosses: number;
  activePredictions: number;
  winRate: number;
}

export interface IPredictionRepository {
  save(prediction: Prediction): Promise<Prediction>;
  findById(id: string): Promise<Prediction | null>;
  findByTransactionHash(transactionHash: TransactionHash): Promise<Prediction | null>;
  findByUserId(userId: string, walletAddress: string, limit: number, offset: number): Promise<Prediction[]>;
  findPendingForSettlement(): Promise<Prediction[]>;
  getUserStats(userId: string, walletAddress: string): Promise<UserPredictionStats | null>;
  update(prediction: Prediction): Promise<Prediction>;
}
