import { z } from "zod";

// Shared enums used by skill AND user-skill schemas.
export const skillTypeSchema = z.enum(["TEACH", "LEARN", "BOTH"]);
export const skillLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
export const offeringModeSchema = z.enum(["ONLINE", "IN_PERSON", "BOTH"]);
export const exchangeStatusSchema = z.enum(["REQUESTED", "ACCEPTED", "REJECTED", "COMPLETED"]);

export const createExchangeSchema = z.object({
  offeringId: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
});
export const updateExchangeStatusSchema = z.object({ status: exchangeStatusSchema });
export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type UpdateExchangeStatusInput = z.infer<typeof updateExchangeStatusSchema>;

export const createOfferingSchema = z.object({
  skillId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  level: skillLevelSchema,
  mode: offeringModeSchema.default("ONLINE"),
});
// `isActive` lets a teacher retire an offering that already has exchanges
// without deleting it (and with it the learner's history).
export const updateOfferingSchema = createOfferingSchema
  .partial()
  .omit({ skillId: true })
  .extend({ isActive: z.boolean().optional() });
export const offeringQuerySchema = z.object({
  skillId: z.string().min(1).optional(),
  level: skillLevelSchema.optional(),
  mode: offeringModeSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type OfferingQuery = z.infer<typeof offeringQuerySchema>;

export const discoveryQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.string().min(1).optional(),
  skillId: z.string().min(1).optional(),
  type: skillTypeSchema.optional(),
  level: skillLevelSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;

// ─── Skill categories ───────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is required").max(100, "Category name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2, "Category name is required").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ─── Catalog skills ─────────────────────────────────────────────────────────
export const createSkillSchema = z.object({
  name: z.string().min(2, "Skill name is required").max(100, "Skill name is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  categoryId: z.string().min(1, "Category is required"),
});
export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export const updateSkillSchema = z.object({
  name: z.string().min(2, "Skill name is required").max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
});
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

// ─── User skills (a user's teach/learn relationship to a skill) ─────────────
export const createUserSkillSchema = z.object({
  skillId: z.string().min(1, "Skill is required"),
  type: skillTypeSchema,
  level: skillLevelSchema,
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0, "Years of experience cannot be negative")
    .max(100, "Years of experience cannot exceed 100")
    .default(0),
  description: z.string().max(1000, "Description is too long").optional(),
});
export type CreateUserSkillInput = z.infer<typeof createUserSkillSchema>;

export const updateUserSkillSchema = z.object({
  type: skillTypeSchema.optional(),
  level: skillLevelSchema.optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});
export type UpdateUserSkillInput = z.infer<typeof updateUserSkillSchema>;