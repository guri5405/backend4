export type UserRole = 'user' | 'agent' | 'admin';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface Ticket {
  id: string;
  user_id: string;
  agent_id: string | null;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface QueuedMessage {
  ticketId: string;
  senderId: string;
  message: string;
  timestamp: string;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  email: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Augment Express's Request type with the authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
