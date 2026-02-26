import { Router } from 'express';
import { container } from 'tsyringe';
import { PredictionController } from '../controllers/prediction.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  createPredictionSchema,
  getUserPredictionsSchema,
  getUserStatsSchema
} from '../validation/schemas/prediction.schemas';

const router = Router();
const predictionController = container.resolve(PredictionController);

router.post(
  '/',
  validate(createPredictionSchema),
  predictionController.createPrediction.bind(predictionController)
);

router.get(
  '/:userId',
  validate(getUserPredictionsSchema),
  predictionController.getUserPredictions.bind(predictionController)
);

router.get(
  '/stats/:userId',
  validate(getUserStatsSchema),
  predictionController.getUserStats.bind(predictionController)
);

export { router as predictionRoutes };
