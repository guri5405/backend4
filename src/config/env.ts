import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',

  autoAssignEnabled: (process.env.AUTO_ASSIGN_ENABLED || 'false') === 'true',

  rateLimitWindowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  ticketCacheTtlSeconds: parseInt(process.env.TICKET_CACHE_TTL_SECONDS || '300', 10),

  isProduction: process.env.NODE_ENV === 'production',
};
