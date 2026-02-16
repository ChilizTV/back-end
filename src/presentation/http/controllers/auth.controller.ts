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
   * Generates JWT token after verifying user access via waitlist
   */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, walletAddress } = req.body;

      // Verify access via use case
      const accessResult = await this.checkAccessUseCase.execute(email, walletAddress);

      if (!accessResult.hasAccess || !accessResult.entry) {
        next(new UnauthorizedError('Access denied - not whitelisted'));
        return;
      }

      const { entry } = accessResult;

      // Generate JWT
      const payload = {
        email: entry.getEmail(),
        walletAddress: entry.getWalletAddress(),
        role: 'USER', // Default role - can be enriched later
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        algorithm: jwtConfig.algorithm,
      });

      logger.info('JWT token generated', {
        email: entry.getEmail(),
        walletAddress: entry.getWalletAddress(),
      });

      res.json({
        success: true,
        token,
        expiresIn: jwtConfig.expiresIn,
        user: {
          email: entry.getEmail(),
          walletAddress: entry.getWalletAddress(),
          isWhitelisted: entry.hasAccess(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
