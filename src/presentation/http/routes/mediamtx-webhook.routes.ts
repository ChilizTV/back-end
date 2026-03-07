import { Router } from 'express';
import { container } from '../../../infrastructure/config/di-container';
import { MediamtxWebhookController } from '../controllers/mediamtx-webhook.controller';

export const mediamtxWebhookRoutes = Router();

const ctrl = container.resolve(MediamtxWebhookController);

// mediamtx calls this endpoint to validate every publisher attempt
mediamtxWebhookRoutes.post('/auth', (req, res, next) =>
  ctrl.auth(req, res).catch(next),
);

// mediamtx calls this when a publisher disconnects (runOnDisconnect)
mediamtxWebhookRoutes.post('/disconnect', (req, res, next) =>
  ctrl.disconnect(req, res).catch(next),
);
