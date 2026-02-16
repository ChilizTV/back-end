import { TransactionHash } from '../value-objects/TransactionHash';
import { Odds } from '../value-objects/Odds';
import { PredictionStatus } from '../value-objects/PredictionStatus';
import { ValidationError } from '../../shared/errors/ValidationError';

export interface PredictionProps {
  id: string;
  userId: string;
  walletAddress: string;
  username: string;
  matchId: number;
  matchName: string;
  predictionType: string;
  predictionValue: string;
  predictedTeam: string;
  odds: Odds;
  status: PredictionStatus;
  actualResult?: string;
  transactionHash: TransactionHash;
  placedAt: Date;
  matchStartTime: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Prediction {
  private constructor(private readonly props: PredictionProps) {}

  static create(props: Omit<PredictionProps, 'createdAt' | 'updatedAt' | 'placedAt'>): Prediction {
    const now = new Date();

    if (!props.userId || !props.walletAddress) {
      throw new ValidationError('User ID and wallet address are required');
    }

    if (!props.matchId || !props.matchName) {
      throw new ValidationError('Match ID and name are required');
    }

    if (props.matchStartTime < now) {
      throw new ValidationError('Cannot place prediction on past matches');
    }

    return new Prediction({
      ...props,
      placedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PredictionProps): Prediction {
    return new Prediction(props);
  }

  settle(actualResult: string, isWin: boolean): void {
    if (this.props.status !== PredictionStatus.PENDING && this.props.status !== PredictionStatus.IN_PROGRESS) {
      throw new ValidationError('Can only settle pending or in-progress predictions');
    }

    this.props.actualResult = actualResult;
    this.props.status = isWin ? PredictionStatus.WON : PredictionStatus.LOST;
    this.props.settledAt = new Date();
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status !== PredictionStatus.PENDING) {
      throw new ValidationError('Can only cancel pending predictions');
    }

    this.props.status = PredictionStatus.CANCELLED;
    this.props.updatedAt = new Date();
  }

  markInProgress(): void {
    if (this.props.status !== PredictionStatus.PENDING) {
      throw new ValidationError('Can only mark pending predictions as in-progress');
    }

    this.props.status = PredictionStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  getId(): string {
    return this.props.id;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getWalletAddress(): string {
    return this.props.walletAddress;
  }

  getMatchId(): number {
    return this.props.matchId;
  }

  getPredictionType(): string {
    return this.props.predictionType;
  }

  getPredictionValue(): string {
    return this.props.predictionValue;
  }

  getTransactionHash(): TransactionHash {
    return this.props.transactionHash;
  }

  getStatus(): PredictionStatus {
    return this.props.status;
  }

  getOdds(): Odds {
    return this.props.odds;
  }

  getMatchStartTime(): Date {
    return this.props.matchStartTime;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      userId: this.props.userId,
      walletAddress: this.props.walletAddress,
      username: this.props.username,
      matchId: this.props.matchId,
      matchName: this.props.matchName,
      predictionType: this.props.predictionType,
      predictionValue: this.props.predictionValue,
      predictedTeam: this.props.predictedTeam,
      odds: this.props.odds.getValue(),
      status: this.props.status,
      actualResult: this.props.actualResult,
      transactionHash: this.props.transactionHash.getValue(),
      placedAt: this.props.placedAt,
      matchStartTime: this.props.matchStartTime,
      settledAt: this.props.settledAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
