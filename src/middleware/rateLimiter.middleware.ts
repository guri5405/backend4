import { Request, Response, NextFunction } from 'express';
import { redis, REDIS_KEYS } from '../db/redis';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const identifier = req.user?.id || req.ip || 'anonymous';
  const key = REDIS_KEYS.rateLimit(identifier);

  redis
    .multi()
    .incr(key)
    .ttl(key)
    .exec()
    .then(async (results) => {
      if (!results) throw new Error('Redis multi-exec returned null');

      const [[incrErr, count], [ttlErr, ttl]] = results as [
        [Error | null, number],
        [Error | null, number]
      ];
      if (incrErr || ttlErr) throw incrErr || ttlErr;

      // First request in this window - set the expiry.
      if (count === 1 || ttl === -1) {
        await redis.expire(key, env.rateLimitWindowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', env.rateLimitMaxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, env.rateLimitMaxRequests - count));

      if (count > env.rateLimitMaxRequests) {
        return next(ApiError.tooManyRequests('Rate limit exceeded. Please try again later.'));
      }

      next();
    })
    .catch((err) => {
      // Fail-open: if Redis is unreachable, don't block the whole API on it.
      logger.error(`Rate limiter error (failing open): ${err.message}`);
      next();
    });
}
