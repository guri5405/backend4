import { ticketRepository, TicketFilters } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { ticketCacheService } from './ticketCache.service';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  Ticket,
  TicketStatus,
  JwtPayload,
  PaginationParams,
  PaginatedResult,
} from '../types';

/**
 * Ticket lifecycle state machine.
 * open -> in_progress -> resolved (forward only, no skipping, no reopening).
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
};

function assertCanViewTicket(ticket: Ticket, requester: JwtPayload) {
  const isOwner = ticket.user_id === requester.id;
  const isAssignedAgent = ticket.agent_id === requester.id;
  const isAdmin = requester.role === 'admin';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw ApiError.forbidden('You do not have access to this ticket');
  }
}

export const ticketService = {
  async createTicket(userId: string, subject: string): Promise<Ticket> {
    let agentId: string | null = null;

    if (env.autoAssignEnabled) {
      const agent = await userRepository.findAgentWithFewestOpenTickets();
      if (agent) {
        agentId = agent.id;
        logger.info(`Auto-assigned new ticket to agent ${agent.id}`);
      }
    }

    const ticket = await ticketRepository.create({ user_id: userId, subject, agent_id: agentId });
    await ticketCacheService.set(ticket);
    return ticket;
  },

  async getTickets(requester: JwtPayload, filters: TicketFilters, pagination: PaginationParams): Promise<PaginatedResult<Ticket>> {
    // Scope results by role: users only ever see their own tickets,
    // agents only see tickets assigned to them. Admins see everything
    // (optionally still narrowed by the status/agent filters provided).
    const scopedFilters: TicketFilters = { ...filters };

    if (requester.role === 'user') {
      scopedFilters.userId = requester.id;
    } else if (requester.role === 'agent') {
      scopedFilters.agentId = requester.id;
    }
    // admin: no extra scoping beyond whatever filters they passed in.

    return ticketRepository.findAll(scopedFilters, pagination);
  },

  async getTicketById(ticketId: string, requester: JwtPayload): Promise<Ticket> {
    // Cache-aside pattern: check Redis first, fall back to Supabase.
    let ticket = await ticketCacheService.get(ticketId);

    if (!ticket) {
      const fromDb = await ticketRepository.findById(ticketId);
      if (!fromDb) throw ApiError.notFound('Ticket not found');
      ticket = fromDb;
      await ticketCacheService.set(ticket);
    }

    assertCanViewTicket(ticket, requester);
    return ticket;
  },

  async assignTicket(ticketId: string, agentId: string): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (ticket.status === 'resolved') {
      throw ApiError.badRequest('Cannot reassign a resolved ticket');
    }

    const agent = await userRepository.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      throw ApiError.badRequest('Provided agentId does not belong to a valid agent');
    }

    const updated = await ticketRepository.assignAgent(ticketId, agentId);
    await ticketCacheService.set(updated);
    return updated;
  },

  async updateStatus(
    ticketId: string,
    nextStatus: TicketStatus,
    requester: JwtPayload
  ): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    const isAssignedAgent = ticket.agent_id === requester.id;
    const isAdmin = requester.role === 'admin';
    if (!isAssignedAgent && !isAdmin) {
      throw ApiError.forbidden('Only the assigned agent or an admin can update ticket status');
    }

    if (ticket.status === nextStatus) {
      throw ApiError.badRequest(`Ticket is already '${nextStatus}'`);
    }

    const allowedNext = ALLOWED_TRANSITIONS[ticket.status];
    if (!allowedNext.includes(nextStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition: '${ticket.status}' -> '${nextStatus}'. Allowed next state(s): ${
          allowedNext.length ? allowedNext.join(', ') : 'none (terminal state)'
        }`
      );
    }

    const updated = await ticketRepository.updateStatus(ticketId, nextStatus);
    await ticketCacheService.set(updated);
    return updated;
  },
};
