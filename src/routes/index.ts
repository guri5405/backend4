import { Router } from 'express';
import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import messageRoutes from './message.routes';
import { messageQueueService } from '../services/messageQueue.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/tickets/:id/messages', messageRoutes);

router.get('/health', asyncHandler(async (_req, res) => {
    const queueLength = await messageQueueService.queueLength();
    res.status(200).json(
      new ApiResponse('OK', {
        uptime: process.uptime(),
        pendingQueueMessages: queueLength,
      })
    );
  })
);

export default router;
