import { Router } from 'express';
import { container } from 'tsyringe';
import { StreamController } from '../controllers/stream.controller';

const router = Router();
const streamController = container.resolve(StreamController);

router.post('/', streamController.createStream.bind(streamController));
router.get('/', streamController.getActiveStreams.bind(streamController));
router.delete('/', streamController.endStream.bind(streamController));
router.put('/:streamId/viewers', streamController.updateViewerCount.bind(streamController));

export { router as streamRoutes };
