import { messageRepository } from '../repositories/message.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { messageQueueService } from './messageQueue.service';
import { ApiError } from '../utils/ApiError';
import { Message, JwtPayload, PaginationParams, PaginatedResult, Ticket } from '../types';

function assertCanAccessTicket(ticket: Ticket, requester: JwtPayload) {
  const isOwner = ticket.user_id === requester.id;
  const isAssignedAgent = ticket.agent_id === requester.id;
  const isAdmin = requester.role === 'admin';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw ApiError.forbidden('You do not have access to this ticket');
  }
}

export const messageService = {
  async sendMessage(ticketId: string, requester: JwtPayload, text: string): Promise<Message> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    assertCanAccessTicket(ticket, requester);

   
    const message = await messageRepository.create({
      ticket_id: ticketId,
      sender_id: requester.id,
      message: text,
    });

    
    const queuedPayload = {
      ticketId,
      senderId: requester.id,
      message: text,
      timestamp: message.created_at,
    };
    await messageQueueService.enqueue(queuedPayload);
    await messageQueueService.publish(queuedPayload);

    return message;
  },

  async getMessages(
    ticketId: string,
    requester: JwtPayload,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Message>> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    assertCanAccessTicket(ticket, requester);

    return messageRepository.findByTicketId(ticketId, pagination);
  },
};
