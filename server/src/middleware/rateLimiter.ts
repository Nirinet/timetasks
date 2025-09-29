import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60, // 15 minutes in seconds
});

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