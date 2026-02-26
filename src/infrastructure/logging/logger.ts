import winston from 'winston';
import { env } from '../config/environment';

const isDevelopment = env.NODE_ENV === 'development';

/**
 * Winston logger configuration
 * - Development: colorized console logs
 * - Production: JSON logs for log aggregation (CloudWatch, Datadog, etc.)
 */
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isDevelopment
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
  transports: [new winston.transports.Console()],
});

export { logger };
