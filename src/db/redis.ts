import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redis: RedisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

export function createRedisConnection(): RedisClient {
  const connection = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  connection.on('error', (err) => logger.error(`Redis (dedicated) error: ${err.message}`));
  return connection;
}

export const REDIS_KEYS = {
  ticketCache: (ticketId: string) => `ticket:${ticketId}`,
  ticketMessagesQueue: 'ticket_messages',
  ticketChannel: 'ticket_channel',
  rateLimit: (identifier: string) => `ratelimit:${identifier}`,
};
