import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreatePredictionUseCase } from '../../../application/predictions/use-cases/CreatePredictionUseCase';
import { GetUserPredictionsUseCase } from '../../../application/predictions/use-cases/GetUserPredictionsUseCase';
import { GetUserStatsUseCase } from '../../../application/predictions/use-cases/GetUserStatsUseCase';
import { CreatePredictionDto } from '../../../application/predictions/dto/CreatePredictionDto';

@injectable()
export class PredictionController {
  constructor(
    @inject(CreatePredictionUseCase)
    private readonly createPredictionUseCase: CreatePredictionUseCase,
    @inject(GetUserPredictionsUseCase)
    private readonly getUserPredictionsUseCase: GetUserPredictionsUseCase,
    @inject(GetUserStatsUseCase)
    private readonly getUserStatsUseCase: GetUserStatsUseCase
  ) {}

  async createPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreatePredictionDto = {
        userId: req.body.userId,
        walletAddress: req.body.walletAddress,
        username: req.body.username,
        matchId: parseInt(req.body.matchId),
        matchName: req.body.matchName,
        predictionType: req.body.predictionType,
        predictionValue: req.body.predictionValue,
        predictedTeam: req.body.predictedTeam,
        odds: parseFloat(req.body.odds),
        transactionHash: req.body.transactionHash,
        matchStartTime: new Date(req.body.matchStartTime),
      };

      const prediction = await this.createPredictionUseCase.execute(dto);

      res.status(201).json({
        success: true,
        data: prediction.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserPredictions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Extract walletAddress from JWT token (set by authenticate middleware)
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        throw new Error('Wallet address not found in token');
      }

      const predictions = await this.getUserPredictionsUseCase.execute(
        userId,
        walletAddress,
        Number(limit),
        Number(offset)
      );

      res.json({
        success: true,
        data: predictions.map(p => p.toJSON()),
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // Extract walletAddress from JWT token (set by authenticate middleware)
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        throw new Error('Wallet address not found in token');
      }

      const stats = await this.getUserStatsUseCase.execute(userId, walletAddress);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
