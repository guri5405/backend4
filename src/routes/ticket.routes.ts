import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTicketSchema,
  listTicketsSchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  ticketIdParamSchema,
} from '../validators/ticket.validator';

const router = Router();

router.use(authenticate);

router.post('/', authorize('user'), rateLimiter, validate(createTicketSchema), ticketController.create);

router.get('/', validate(listTicketsSchema), ticketController.list);

router.get('/:id', validate(ticketIdParamSchema), ticketController.getById);

router.put('/:id/assign',authorize('admin'),rateLimiter,validate(assignTicketSchema),ticketController.assign);

router.put('/:id/status',  authorize('agent', 'admin'), rateLimiter,
  validate(updateTicketStatusSchema), ticketController.updateStatus);

export default router;
