import { supabase } from '../db/supabase';
import { User, UserRole } from '../types';
import { ApiError } from '../utils/ApiError';

const TABLE = 'users';

export const userRepository = {
  async create(input: {
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
  }): Promise<User> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(input)
      .select()
      .single();

    if (error) {
      // Unique violation on email
      if (error.code === '23505') {
        throw ApiError.conflict('An account with this email already exists');
      }
      throw ApiError.internal(`Failed to create user: ${error.message}`);
    }
    return data as User;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw ApiError.internal(`Failed to look up user: ${error.message}`);
    return (data as User) || null;
  },

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw ApiError.internal(`Failed to look up user: ${error.message}`);
    return (data as User) || null;
  },

  async findAgentWithFewestOpenTickets(): Promise<User | null> {
    const { data: agents, error: agentsError } = await supabase
      .from(TABLE)
      .select('id, name, email, role, created_at')
      .eq('role', 'agent');

    if (agentsError) throw ApiError.internal(`Failed to load agents: ${agentsError.message}`);
    if (!agents || agents.length === 0) return null;

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('agent_id, status')
      .in('status', ['open', 'in_progress'])
      .not('agent_id', 'is', null);

    if (ticketsError) throw ApiError.internal(`Failed to load ticket load: ${ticketsError.message}`);

    const loadByAgent = new Map<string, number>();
    for (const agent of agents) loadByAgent.set(agent.id, 0);
    for (const t of tickets || []) {
      if (t.agent_id) loadByAgent.set(t.agent_id, (loadByAgent.get(t.agent_id) || 0) + 1);
    }

    const leastBusy = agents.reduce((best, current) => {
      const bestLoad = loadByAgent.get(best.id) ?? 0;
      const currentLoad = loadByAgent.get(current.id) ?? 0;
      return currentLoad < bestLoad ? current : best;
    });

    return leastBusy as User;
  },
};
