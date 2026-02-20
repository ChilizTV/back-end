import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';
import { CheckAccessUseCase } from '../../../application/waitlist/use-cases/CheckAccessUseCase';
import { jwtConfig } from '../../../infrastructure/config/jwt.config';
import { UnauthorizedError } from '../../../domain/shared/errors/UnauthorizedError';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Auth controller - handles JWT token generation
 */
@injectable()
export class AuthController {
  constructor(
    @inject(CheckAccessUseCase) private checkAccessUseCase: CheckAccessUseCase
  ) {}
  /**
   * POST /auth/token
   * Generates JWT token for authentication (Authentication layer)
   * Authorization (whitelist check) happens separately in protected routes
   */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, walletAddress } = req.body;

      // Basic validation
      if (!walletAddress) {
        next(new UnauthorizedError('Wallet address is required'));
        return;
      }

      // Check whitelist status (but don't block token generation)
      const accessResult = await this.checkAccessUseCase.execute(email, walletAddress);
      const isWhitelisted = accessResult.hasAccess && !!accessResult.entry;

      // Generate JWT for EVERYONE (Authentication)
      // Whitelist status is included in token for Authorization later
      const payload = {
        email: email || null,
        walletAddress: walletAddress.toLowerCase(),
        isWhitelisted, // Authorization claim
        role: 'USER',
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn as any,
        issuer: jwtConfig.issuer,
        algorithm: jwtConfig.algorithm,
      });

      logger.info('JWT token generated', {
        email,
        walletAddress,
        isWhitelisted,
      });

      res.json({
        success: true,
        token,
        expiresIn: jwtConfig.expiresIn,
        user: {
          email: email || null,
          walletAddress: walletAddress.toLowerCase(),
          isWhitelisted,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
