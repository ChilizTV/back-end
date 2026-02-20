import { Router } from 'express';
import { container } from 'tsyringe';
import { FanTokensController } from '../controllers/fan-tokens.controller';

const router = Router();
const fanTokensController = container.resolve(FanTokensController);

router.get('/balances/:walletAddress', fanTokensController.getUserBalances.bind(fanTokensController));

export { router as fanTokensRoutes };
