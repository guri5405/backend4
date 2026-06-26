import { redis, REDIS_KEYS } from '../db/redis';
import { Ticket } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const ticketCacheService = {
  async get(ticketId: string): Promise<Ticket | null> {
    try {
      const raw = await redis.get(REDIS_KEYS.ticketCache(ticketId));
      return raw ? (JSON.parse(raw) as Ticket) : null;
    } catch (err) {
      logger.warn(`Ticket cache read failed for ${ticketId}: ${(err as Error).message}`);
      return null; // cache is best-effort; fall back to DB on failure
    }
  },

  async set(ticket: Ticket): Promise<void> {
    try {
      await redis.set(
        REDIS_KEYS.ticketCache(ticket.id),
        JSON.stringify(ticket),
        'EX',
        env.ticketCacheTtlSeconds
      );
    } catch (err) {
      logger.warn(`Ticket cache write failed for ${ticket.id}: ${(err as Error).message}`);
    }
  },

  async invalidate(ticketId: string): Promise<void> {
    try {
      await redis.del(REDIS_KEYS.ticketCache(ticketId));
    } catch (err) {
      logger.warn(`Ticket cache invalidation failed for ${ticketId}: ${(err as Error).message}`);
    }
  },
};
