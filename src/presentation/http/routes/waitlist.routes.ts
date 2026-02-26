import { Router } from 'express';
import { container } from 'tsyringe';
import { WaitlistController } from '../controllers/waitlist.controller';

const router = Router();
const waitlistController = container.resolve(WaitlistController);

router.post('/', waitlistController.joinWaitlist.bind(waitlistController));
router.get('/check-access', waitlistController.checkAccess.bind(waitlistController));
router.get('/stats', waitlistController.getStats.bind(waitlistController));

export { router as waitlistRoutes };
