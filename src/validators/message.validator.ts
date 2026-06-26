import { z } from 'zod';

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
  body: z.object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(5000),
  }),
});

export const listMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
