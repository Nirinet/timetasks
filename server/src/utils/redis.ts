import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

/**
 * Get or create a Redis client singleton.
 * Returns null if REDIS_URL is not configured (falls back to in-memory).
 */
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });
  }

  return redisClient;
}

/**
 * Disconnect Redis client gracefully.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
