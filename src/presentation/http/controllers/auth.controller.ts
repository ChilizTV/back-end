import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { waitlistService } from '../../../../services/waitlist.service';
import { ServiceErrorCode } from '../../../../services/service.result';
import { jwtConfig } from '../../../infrastructure/config/jwt.config';
import { UnauthorizedError } from '../../../domain/shared/errors/UnauthorizedError';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Auth controller - handles JWT token generation
 */
export class AuthController {
  /**
   * POST /auth/token
   * Generates JWT token after verifying user access via waitlist
   */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, walletAddress } = req.body;

      // Verify access via existing waitlist service
      const accessResult = await waitlistService.checkAccess({ email, walletAddress });

      if (accessResult.errorCode !== ServiceErrorCode.success || !accessResult.result) {
        next(new UnauthorizedError('Failed to verify access'));
        return;
      }

      const { hasAccess, entry } = accessResult.result;

      if (!hasAccess || !entry) {
        next(new UnauthorizedError('Access denied - not whitelisted'));
        return;
      }

      // Generate JWT
      const payload = {
        email: entry.email,
        walletAddress: entry.walletAddress,
        role: 'USER', // Default role - can be enriched later
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        algorithm: jwtConfig.algorithm,
      });

      logger.info('JWT token generated', {
        email: entry.email,
        walletAddress: entry.walletAddress,
      });

      res.json({
        success: true,
        token,
        expiresIn: jwtConfig.expiresIn,
        user: {
          email: entry.email,
          walletAddress: entry.walletAddress,
          isWhitelisted: entry.isWhitelisted,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
