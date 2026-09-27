import { z } from "zod";

export const createReviewSchema = z
  .object({
    recipientId: z.string().min(1, "recipientId is required"),
    exchangeId: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
    rating: z.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
    content: z.string().trim().min(3, "Review is too short").max(2000, "Review is too long"),
  })
  .refine((value) => value.exchangeId || value.sessionId, {
    message: "Attach the review to an exchange or session",
    path: ["exchangeId"],
  });
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().trim().min(3).max(2000).optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;