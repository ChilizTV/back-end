import { Router } from 'express';
import { container } from 'tsyringe';
import { StreamWalletController } from '../controllers/stream-wallet.controller';

const router = Router();
const streamWalletController = container.resolve(StreamWalletController);

router.get('/donations/:streamerAddress', streamWalletController.getStreamerDonations.bind(streamWalletController));
router.get('/subscriptions/:streamerAddress', streamWalletController.getStreamerSubscriptions.bind(streamWalletController));
router.get('/stats/:streamerAddress', streamWalletController.getStreamerStats.bind(streamWalletController));
router.get('/donor/:donorAddress/donations', streamWalletController.getDonorHistory.bind(streamWalletController));
router.get('/subscriber/:subscriberAddress/subscriptions', streamWalletController.getSubscriberHistory.bind(streamWalletController));

export { router as streamWalletRoutes };
