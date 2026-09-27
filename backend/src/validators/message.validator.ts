import { z } from "zod";

export const createConversationSchema = z.object({
  participantId: z.string().min(1, "participantId is required"),
  exchangeId: z.string().min(1).optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(100),
});
export type MessageQuery = z.infer<typeof messageQuerySchema>;