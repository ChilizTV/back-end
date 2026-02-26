import { Router } from 'express';
import { container } from 'tsyringe';
import { ChatController } from '../controllers/chat.controller';

const router = Router();
const chatController = container.resolve(ChatController);

router.post('/join/:matchId', chatController.joinRoom.bind(chatController));
router.post('/leave/:matchId', chatController.leaveRoom.bind(chatController));
router.post('/message/:matchId', chatController.sendMessage.bind(chatController));
router.post('/bet/:matchId', chatController.sendBetMessage.bind(chatController));
router.get('/messages/:matchId', chatController.getRoomMessages.bind(chatController));
router.get('/users/:matchId', chatController.getConnectedUsers.bind(chatController));
router.get('/stats', chatController.getChatStats.bind(chatController));

export { router as chatRoutes };
