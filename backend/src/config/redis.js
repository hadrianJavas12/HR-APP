import Redis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

/** @type {Redis} */
let redisClient;

/**
 * Initialize the Redis connection.
 * @returns {Redis}
 */
export function initRedis() {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  return redisClient;
}

/**
 * Get the current Redis client.
 * @returns {Redis}
 */
export function getRedis() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Gracefully close Redis.
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

export default { initRedis, getRedis, closeRedis };
