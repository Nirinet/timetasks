import { RateLimiterRedis, RateLimiterMemory, IRateLimiterOptions } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';

const MAX_FAILED_ATTEMPTS_MAP_SIZE = 10000;

const loginOptions: IRateLimiterOptions = {
  keyPrefix: 'login',
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
  blockDuration: 900, // block for 15 minutes after limit reached
};

// Use Redis when available (required for cluster mode), fallback to Memory for dev
const redis = getRedisClient();
let loginLimiter: RateLimiterRedis | RateLimiterMemory;

if (redis) {
  loginLimiter = new RateLimiterRedis({
    ...loginOptions,
    storeClient: redis,
    insuranceLimiter: new RateLimiterMemory(loginOptions),
  });
} else {
  loginLimiter = new RateLimiterMemory(loginOptions);
}

// Track consecutive failed attempts by IP and email
const failedAttempts = new Map<string, number>();

/**
 * Redact email for logging: user@example.com → us***@example.com
 */
function redactEmail(email: string | undefined): string {
  if (!email) return '[unknown]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid]';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ipKey = `login_ip_${req.ip}`;
  const emailKey = `login_email_${req.body.email?.toLowerCase()}`;

  try {
    // Check both IP and email rate limits
    await Promise.all([
      loginLimiter.consume(ipKey),
      req.body.email ? loginLimiter.consume(emailKey) : Promise.resolve(),
    ]);

    next();
  } catch (rejRes: any) {
    const msBeforeNext = rejRes.msBeforeNext || 900000; // default 15 minutes
    const retriesRemaining = rejRes.remainingPoints || 0;

    // Log suspicious activity with redacted email
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      email: redactEmail(req.body.email),
      retriesRemaining,
      blockDuration: msBeforeNext / 1000,
    });

    // Track failed attempts with size limit
    const attemptKey = `${req.ip}_${req.body.email}`;
    const attempts = (failedAttempts.get(attemptKey) || 0) + 1;

    if (failedAttempts.size >= MAX_FAILED_ATTEMPTS_MAP_SIZE) {
      // Evict oldest entries (first 20% of map)
      const entriesToDelete = Math.floor(MAX_FAILED_ATTEMPTS_MAP_SIZE * 0.2);
      let deleted = 0;
      for (const key of failedAttempts.keys()) {
        if (deleted >= entriesToDelete) break;
        failedAttempts.delete(key);
        deleted++;
      }
    }
    failedAttempts.set(attemptKey, attempts);

    // Alert admins if threshold exceeded
    if (attempts > 10) {
      logger.error('Potential brute force attack detected', {
        ip: req.ip,
        email: redactEmail(req.body.email),
        attempts,
      });
    }

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': retriesRemaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });

    res.status(429).json({
      success: false,
      message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
  }
};

// Reset failed attempts on successful login
export const resetLoginAttempts = (ip: string, email: string) => {
  const attemptKey = `${ip}_${email?.toLowerCase()}`;
  failedAttempts.delete(attemptKey);

  // Also reset rate limiter points
  const ipKey = `login_ip_${ip}`;
  const emailKey = `login_email_${email?.toLowerCase()}`;

  loginLimiter.delete(ipKey);
  if (email) {
    loginLimiter.delete(emailKey);
  }
};

// Clean up old entries periodically - export for graceful shutdown cleanup
export const cleanupInterval = setInterval(() => {
  failedAttempts.clear();
}, 3600000); // Run every hour
