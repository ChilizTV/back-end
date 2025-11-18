import { Request, Response, Router } from 'express';
import { predictionService } from '../services/prediction.service';
import { CreatePredictionRequest } from '../models/prediction.model';
import { ServiceErrorCode } from '../services/service.result';

export class PredictionController {
    private router: Router;

    constructor() {
        this.router = Router();
        this.buildRoutes();
    }

    private buildRoutes(): void {
        this.router.post('/', this.createPrediction.bind(this));
        this.router.get('/:userId', this.getUserPredictions.bind(this));
        this.router.get('/stats/:userId', this.getUserStats.bind(this));
    }

    getRouter(): Router {
        return this.router;
    }

    /**
     * POST /predictions
     * Save a new prediction
     */
    private async createPrediction(req: Request, res: Response): Promise<void> {
        try {
            console.log('📥 POST /predictions - Creating new prediction');

            const {
                userId,
                walletAddress,
                username,
                matchId,
                matchName,
                predictionType,
                predictionValue,
                predictedTeam,
                odds,
                transactionHash,
                matchStartTime
            } = req.body;

            // Validate required fields
            if (!userId || !walletAddress || !username || !matchId || !matchName || 
                !predictionType || !predictionValue || !predictedTeam || !odds || 
                !transactionHash || !matchStartTime) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    errorCode: 1
                });
                return;
            }

            const predictionData: CreatePredictionRequest = {
                userId,
                walletAddress,
                username,
                matchId: parseInt(matchId),
                matchName,
                predictionType,
                predictionValue,
                predictedTeam,
                odds: parseFloat(odds),
                transactionHash,
                matchStartTime: new Date(matchStartTime)
            };

            const result = await predictionService.savePrediction(predictionData);

            if (result.errorCode === ServiceErrorCode.success && result.result) {
                res.status(201).json({ 
                    success: true, 
                    data: result.result,
                    errorCode: 0
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to save prediction',
                    errorCode: 1
                });
            }
        } catch (error: any) {
            console.error('❌ Error in createPrediction:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error',
                errorCode: 1
            });
        }
    }

    /**
     * GET /predictions/:userId
     * Get user's prediction history
     */
    private async getUserPredictions(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { walletAddress, limit, offset } = req.query;

            console.log(`📥 GET /predictions/${userId} - Fetching predictions`);

            if (!walletAddress) {
                res.status(400).json({
                    success: false,
                    error: 'walletAddress query parameter is required',
                    errorCode: 1
                });
                return;
            }

            const limitNum = limit ? parseInt(limit as string) : 50;
            const offsetNum = offset ? parseInt(offset as string) : 0;

            const result = await predictionService.getUserPredictions(
                userId,
                walletAddress as string,
                limitNum,
                offsetNum
            );

            if (result.errorCode === ServiceErrorCode.success && result.result) {
                res.status(200).json({ 
                    success: true, 
                    data: result.result,
                    errorCode: 0
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch predictions',
                    errorCode: 1
                });
            }
        } catch (error: any) {
            console.error('❌ Error in getUserPredictions:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error',
                errorCode: 1
            });
        }
    }

    /**
     * GET /predictions/stats/:userId
     * Get user's prediction statistics
     */
    private async getUserStats(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { walletAddress } = req.query;

            console.log(`📥 GET /predictions/stats/${userId} - Fetching stats`);

            if (!walletAddress) {
                res.status(400).json({
                    success: false,
                    error: 'walletAddress query parameter is required',
                    errorCode: 1
                });
                return;
            }

            const result = await predictionService.getUserStats(
                userId,
                walletAddress as string
            );

            if (result.errorCode === ServiceErrorCode.success && result.result) {
                res.status(200).json({ 
                    success: true, 
                    data: result.result,
                    errorCode: 0
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch stats',
                    errorCode: 1
                });
            }
        } catch (error: any) {
            console.error('❌ Error in getUserStats:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error',
                errorCode: 1
            });
        }
    }
}

export const predictionController = new PredictionController();

