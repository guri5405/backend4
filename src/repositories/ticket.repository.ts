import { supabase } from '../db/supabase';
import { Ticket, TicketStatus, PaginationParams, PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { toRange, buildPaginationMeta } from '../utils/pagination';

const TABLE = 'tickets';

export interface TicketFilters {
  status?: TicketStatus;
  userId?: string; // restrict to tickets created by this user
  agentId?: string; // restrict to tickets assigned to this agent
}

export const ticketRepository = {
  async create(input: { user_id: string; subject: string; agent_id?: string | null }): Promise<Ticket> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.user_id,
        subject: input.subject,
        agent_id: input.agent_id ?? null,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw ApiError.internal(`Failed to create ticket: ${error.message}`);
    return data as Ticket;
  },

  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw ApiError.internal(`Failed to fetch ticket: ${error.message}`);
    return (data as Ticket) || null;
  },

  async findAll(
    filters: TicketFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Ticket>> {
    const { from, to } = toRange(pagination);

    let query = supabase.from(TABLE).select('*', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.agentId) query = query.eq('agent_id', filters.agentId);

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw ApiError.internal(`Failed to list tickets: ${error.message}`);

    return {
      data: (data as Ticket[]) || [],
      pagination: buildPaginationMeta(pagination, count || 0),
    };
  },

  async assignAgent(id: string, agentId: string): Promise<Ticket> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ agent_id: agentId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw ApiError.internal(`Failed to assign ticket: ${error.message}`);
    return data as Ticket;
  },

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw ApiError.internal(`Failed to update ticket status: ${error.message}`);
    return data as Ticket;
  },
};
