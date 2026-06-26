import { z } from 'zod';

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  }),
});

export const listTicketsSchema = z.object({
  query: z.object({
    status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const assignTicketSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
  body: z.object({
    agentId: z.string().uuid('Invalid agent id'),
  }),
});

export const updateTicketStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved']),
  }),
});

export const ticketIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>['body'];
