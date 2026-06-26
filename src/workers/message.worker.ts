import { EventEmitter } from 'events';
import { createRedisConnection, REDIS_KEYS } from '../db/redis';
import { QueuedMessage } from '../types';
import { logger } from '../utils/logger';


const BLOCK_TIMEOUT_SECONDS = 5;

export const deliveryEvents = new EventEmitter();

function processMessage(raw: string) {
  let payload: QueuedMessage;
  try {
    payload = JSON.parse(raw);
  } catch {
    logger.error(`Worker received malformed queue payload: ${raw}`);
    return;
  }

  // Simulated delivery: in a real system this might push to a websocket,
  // send a push notification, trigger an email, etc.
  logger.info(
    `[DELIVERED] ticket=${payload.ticketId} sender=${payload.senderId} at=${payload.timestamp} -> "${payload.message}"`
  );
  deliveryEvents.emit('delivered', payload);
}

async function runQueueConsumer() {
  const queueConnection = createRedisConnection();
  logger.info(`Message worker started. Watching list "${REDIS_KEYS.ticketMessagesQueue}"...`);

  let running = true;
  process.on('SIGINT', () => (running = false));
  process.on('SIGTERM', () => (running = false));

  while (running) {
    try {
      // BRPOP blocks until an item is available or the timeout elapses,
      // so this loop doesn't busy-poll Redis.
      const result = await queueConnection.brpop(REDIS_KEYS.ticketMessagesQueue, BLOCK_TIMEOUT_SECONDS);
      if (result) {
        const [, raw] = result; // [listName, value]
        processMessage(raw);
      }
    } catch (err) {
      logger.error(`Queue consumer error: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000)); // brief backoff before retrying
    }
  }

  await queueConnection.quit();
  logger.info('Queue consumer stopped.');
}

function runPubSubSubscriber() {
  const subscriber = createRedisConnection();

  subscriber.subscribe(REDIS_KEYS.ticketChannel, (err) => {
    if (err) {
      logger.error(`Failed to subscribe to ${REDIS_KEYS.ticketChannel}: ${err.message}`);
      return;
    }
    logger.info(`Subscribed to pub/sub channel "${REDIS_KEYS.ticketChannel}"`);
  });

  subscriber.on('message', (_channel, raw) => {
    try {
      const payload: QueuedMessage = JSON.parse(raw);
      logger.info(`[PUB/SUB] live notification for ticket=${payload.ticketId} from sender=${payload.senderId}`);
    } catch {
      logger.error(`Worker received malformed pub/sub payload: ${raw}`);
    }
  });

  return subscriber;
}

async function main() {
  runPubSubSubscriber();
  await runQueueConsumer();
  process.exit(0);
}

main().catch((err) => {
  logger.error(`Worker crashed: ${err.message}`);
  process.exit(1);
});
