import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';

export const messageController = {
  send: asyncHandler(async (req: Request, res: Response) => {
    const message = await messageService.sendMessage(req.params.id, req.user!, req.body.message);
    res.status(201).json(new ApiResponse('Message sent successfully', message));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    const result = await messageService.getMessages(req.params.id, req.user!, pagination);
    res.status(200).json(new ApiResponse('Messages fetched successfully', result));
  }),
};
