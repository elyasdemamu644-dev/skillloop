import { z } from "zod";

export const createPaymentSchema = z.object({
  amount: z.number().int().min(1, "Amount must be at least 1 credit").max(100000, "Amount is too large"),
  recipientId: z.string().min(1).optional(),
  exchangeId: z.string().min(1).optional(),
  method: z.enum(["CREDITS", "CARD", "MANUAL"]).optional(),
  description: z.string().trim().max(500).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;