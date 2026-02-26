import { Router } from 'express';
import { container } from 'tsyringe';
import { FollowController } from '../controllers/follow.controller';

const router = Router();
const followController = container.resolve(FollowController);

// Named routes BEFORE param routes to avoid conflicts
router.get('/is-following', followController.isFollowing.bind(followController));
router.get('/following/:followerId', followController.getFollowedStreamers.bind(followController));
router.get('/count/:streamerId', followController.getFollowerCount.bind(followController));
router.post('/', followController.follow.bind(followController));
router.delete('/', followController.unfollow.bind(followController));

export { router as followRoutes };
