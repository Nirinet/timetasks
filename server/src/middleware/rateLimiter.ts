import { RateLimiterRedis, RateLimiterMemory, IRateLimiterOptions } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';

const points = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const duration = parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60; // 15 minutes in seconds

const baseOptions: IRateLimiterOptions = {
  points,
  duration,
};

// Use Redis when available (required for cluster mode), fallback to Memory for dev
const redis = getRedisClient();
let rateLimiter: RateLimiterRedis | RateLimiterMemory;

if (redis) {
  rateLimiter = new RateLimiterRedis({
    ...baseOptions,
    storeClient: redis,
    keyPrefix: 'rl_general',
    insuranceLimiter: new RateLimiterMemory(baseOptions), // Fallback if Redis is down
  });
  logger.info('Rate limiter using Redis store');
} else {
  rateLimiter = new RateLimiterMemory(baseOptions);
  logger.warn('Rate limiter using in-memory store (not suitable for cluster mode)');
}

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.ip || 'default-key';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const totalHits = Number(rejRes.totalHits);
    const remainingPoints = Number(rejRes.remainingPoints);
    const msBeforeNext = Number(rejRes.msBeforeNext);

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      'X-RateLimit-Remaining': remainingPoints < 0 ? 0 : remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });

    res.status(429).json({
      success: false,
      message: 'יותר מדי בקשות. נסה שוב מאוחר יותר',
      retryAfter: Math.round(msBeforeNext / 1000) || 1,
    });
  }
};

export { rateLimiterMiddleware as rateLimiter };
