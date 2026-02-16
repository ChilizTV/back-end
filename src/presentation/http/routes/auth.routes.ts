import { Router } from 'express';
import { container } from 'tsyringe';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { generateTokenSchema } from '../validation/schemas/auth.schemas';

const router = Router();
const authController = container.resolve(AuthController);

/**
 * POST /auth/token
 * Generate JWT token after verifying access
 */
router.post('/token', validate(generateTokenSchema), authController.generateToken.bind(authController));

export { router as authRoutes };
