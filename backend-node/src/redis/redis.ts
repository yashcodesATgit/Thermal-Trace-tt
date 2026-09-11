import { createClient } from 'redis';
import { env } from '../config/env';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully.');
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function closeRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

/**
 * Validates connectivity to Redis.
 */
export async function checkRedisHealth(): Promise<{ status: string; error?: string }> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.ping();
    return { status: 'healthy' };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}
