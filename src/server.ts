import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { redis } from './db/redis';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port} [${env.nodeEnv}]`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => logger.info('HTTP server closed'));
  await redis.quit();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
});
