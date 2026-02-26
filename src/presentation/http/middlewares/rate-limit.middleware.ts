import rateLimit from 'express-rate-limit';
import { env } from '../../../infrastructure/config/environment';

const isDevelopment = env.NODE_ENV === 'development';

/**
 * Global rate limiter - applies to all routes
 * 1000 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 1000, // Higher limit in dev
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Don't rate limit health checks
});

/**
 * Auth rate limiter - strict limits to prevent brute force
 * 5 requests per minute per IP
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 100 : 5,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again in 1 minute',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

/**
 * Predictions rate limiter - moderate limits
 * 20 requests per minute per IP
 */
export const predictionsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 200 : 20,
  message: {
    success: false,
    error: {
      code: 'PREDICTIONS_RATE_LIMIT_EXCEEDED',
      message: 'Too many prediction requests, please slow down',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Chat rate limiter - generous limits for messaging
 * 100 messages per minute per IP
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100,
  message: {
    success: false,
    error: {
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      message: 'Too many messages, please slow down',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stream creation rate limiter - strict limits
 * 5 streams per hour per IP
 */
export const streamCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 50 : 5,
  message: {
    success: false,
    error: {
      code: 'STREAM_CREATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many streams created, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
