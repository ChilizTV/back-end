import { Router } from 'express';
import { container } from 'tsyringe';
import multer from 'multer';
import { StreamController } from '../controllers/stream.controller';

const router = Router();
const streamController = container.resolve(StreamController);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 } }); // 200KB max

router.post('/', streamController.createStream.bind(streamController));
router.get('/', streamController.getActiveStreams.bind(streamController));
router.delete('/', streamController.endStream.bind(streamController));
router.put('/:streamId/viewers', streamController.updateViewerCount.bind(streamController));
router.post('/:id/join', streamController.joinViewer.bind(streamController));
router.post('/:id/leave', streamController.leaveViewer.bind(streamController));
router.put('/:id/thumbnail', upload.single('file'), streamController.uploadThumbnail.bind(streamController));

export { router as streamRoutes };
