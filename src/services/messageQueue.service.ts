import { redis, REDIS_KEYS } from '../db/redis';
import { QueuedMessage } from '../types';
import { logger } from '../utils/logger';

export const messageQueueService = {
  async enqueue(message: QueuedMessage): Promise<void> {
    try {
      await redis.lpush(REDIS_KEYS.ticketMessagesQueue, JSON.stringify(message));
    } catch (err) {
      
      logger.error(`Failed to enqueue message for ticket ${message.ticketId}: ${(err as Error).message}`);
    }
  },

  async publish(message: QueuedMessage): Promise<void> {
    try {
      await redis.publish(REDIS_KEYS.ticketChannel, JSON.stringify(message));
    } catch (err) {
      logger.error(`Failed to publish message for ticket ${message.ticketId}: ${(err as Error).message}`);
    }
  },

  async queueLength(): Promise<number> {
    return redis.llen(REDIS_KEYS.ticketMessagesQueue);
  },
};
