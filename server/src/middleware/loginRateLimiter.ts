import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Separate rate limiter for login attempts
const loginLimiter = new RateLimiterMemory({
  keyPrefix: 'login',
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
  blockDuration: 900, // block for 15 minutes after limit reached
});

// Track consecutive failed attempts by IP and email
const failedAttempts = new Map<string, number>();

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
    
    // Log suspicious activity
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      retriesRemaining,
      blockDuration: msBeforeNext / 1000,
    });

    // Track failed attempts
    const attemptKey = `${req.ip}_${req.body.email}`;
    const attempts = (failedAttempts.get(attemptKey) || 0) + 1;
    failedAttempts.set(attemptKey, attempts);

    // Alert admins if threshold exceeded
    if (attempts > 10) {
      logger.error('Potential brute force attack detected', {
        ip: req.ip,
        email: req.body.email,
        attempts,
      });
      // TODO: Send email alert to admins
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

// Clean up old entries periodically
setInterval(() => {
  // Clear failed attempts older than 1 hour
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, _] of failedAttempts) {
    // In production, you'd want to track timestamps too
    failedAttempts.delete(key);
  }
}, 3600000); // Run every hour