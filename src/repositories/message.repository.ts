import { supabase } from '../db/supabase';
import { Message, PaginationParams, PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { toRange, buildPaginationMeta } from '../utils/pagination';

const TABLE = 'messages';

export const messageRepository = {
  async create(input: { ticket_id: string; sender_id: string; message: string }): Promise<Message> {
    const { data, error } = await supabase.from(TABLE).insert(input).select().single();

    if (error) throw ApiError.internal(`Failed to save message: ${error.message}`);
    return data as Message;
  },

  async findByTicketId(
    ticketId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Message>> {
    const { from, to } = toRange(pagination);

    const { data, error, count } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw ApiError.internal(`Failed to fetch messages: ${error.message}`);

    return {
      data: (data as Message[]) || [],
      pagination: buildPaginationMeta(pagination, count || 0),
    };
  },
};
