import { z } from "zod";

export const planStatusSchema = z.enum(["IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const challengeTypeSchema = z.enum(["TASK", "QUIZ", "PROJECT", "MILESTONE"]);
export const challengeDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const submissionStatusSchema = z.enum(["SUBMITTED", "APPROVED", "REJECTED"]);

export const createPlanSchema = z.object({
  ownerId: z.string().min(1, "ownerId is required"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(3000),
  goals: z.string().trim().max(2000).optional(),
  skillId: z.string().min(1).optional(),
  exchangeId: z.string().min(1).optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().min(10).max(3000).optional(),
  goals: z.string().trim().max(2000).nullable().optional(),
  status: planStatusSchema.optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const createChallengeSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(3000).optional(),
  type: challengeTypeSchema.default("TASK"),
  difficulty: challengeDifficultySchema.default("MEDIUM"),
  dueDate: z.string().datetime({ offset: true }).optional(),
  order: z.number().int().min(0).default(0),
});
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const updateChallengeSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  type: challengeTypeSchema.optional(),
  difficulty: challengeDifficultySchema.optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  order: z.number().int().min(0).optional(),
});
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;

export const createSubmissionSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000),
  attachmentUrl: z.string().url().max(500).optional(),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const reviewSubmissionSchema = z.object({
  status: submissionStatusSchema,
  feedback: z.string().trim().max(3000).optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export const createFeedbackSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
  exchangeId: z.string().min(1).optional(),
  submissionId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().trim().min(1).max(3000),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;