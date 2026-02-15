import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../infrastructure/config/jwt.config';
import { UnauthorizedError } from '../../../domain/shared/errors/UnauthorizedError';
import { JwtPayload as CustomJwtPayload } from '../../../application/auth/types/JwtPayload';

/**
 * Extend Express Request to include user from JWT
 */
declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 *
 * Usage:
 * router.get('/protected', authenticate, controller.method);
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      algorithms: [jwtConfig.algorithm],
    }) as CustomJwtPayload;

    // Attach user to request for downstream use
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 * Useful for endpoints that work both with and without auth
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      algorithms: [jwtConfig.algorithm],
    }) as CustomJwtPayload;

    req.user = decoded;

    next();
  } catch {
    // Silently ignore auth errors for optional auth
    next();
  }
}
