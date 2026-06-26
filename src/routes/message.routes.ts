import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendMessageSchema, listMessagesSchema } from '../validators/message.validator';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', rateLimiter, validate(sendMessageSchema), messageController.send);
router.get('/', validate(listMessagesSchema), messageController.list);

export default router;
