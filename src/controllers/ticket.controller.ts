import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { TicketStatus } from '../types';

export const ticketController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketService.createTicket(req.user!.id, req.body.subject);
    res.status(201).json(new ApiResponse('Ticket created successfully', ticket));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    const status = req.query.status as TicketStatus | undefined;

    const result = await ticketService.getTickets(req.user!, { status }, pagination);
    res.status(200).json(new ApiResponse('Tickets fetched successfully', result));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketService.getTicketById(req.params.id, req.user!);
    res.status(200).json(new ApiResponse('Ticket fetched successfully', ticket));
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketService.assignTicket(req.params.id, req.body.agentId);
    res.status(200).json(new ApiResponse('Ticket assigned successfully', ticket));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketService.updateStatus(req.params.id, req.body.status, req.user!);
    res.status(200).json(new ApiResponse('Ticket status updated successfully', ticket));
  }),
};
