import { injectable, inject } from 'tsyringe';
import { Prediction } from '../../../domain/predictions/entities';
import { IPredictionRepository } from '../../../domain/predictions/repositories';
import { TransactionHash, Odds, PredictionStatus } from '../../../domain/predictions/value-objects';
import { CreatePredictionDto } from '../dto';
import { ConflictError } from '../../../domain/shared/errors/ConflictError';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class CreatePredictionUseCase {
  constructor(
    @inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository
  ) {}

  async execute(dto: CreatePredictionDto): Promise<Prediction> {
    const transactionHash = TransactionHash.create(dto.transactionHash);

    const existing = await this.predictionRepository.findByTransactionHash(transactionHash);
    if (existing) {
      throw new ConflictError('Prediction already exists for this transaction');
    }

    const odds = Odds.create(dto.odds);

    const prediction = Prediction.create({
      id: uuidv4(),
      userId: dto.userId,
      walletAddress: dto.walletAddress,
      username: dto.username,
      matchId: dto.matchId,
      matchName: dto.matchName,
      predictionType: dto.predictionType,
      predictionValue: dto.predictionValue,
      predictedTeam: dto.predictedTeam,
      odds,
      status: PredictionStatus.PENDING,
      transactionHash,
      matchStartTime: dto.matchStartTime,
    });

    return await this.predictionRepository.save(prediction);
  }
}
