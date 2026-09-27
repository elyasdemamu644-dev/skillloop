import { z } from "zod";
import { SkillLevel } from "@prisma/client";

export const generatePlanSchema = z.object({
  skillId: z.string().min(1, "Skill is required"),
  level: z.nativeEnum(SkillLevel).optional(),
  goals: z.string().trim().max(500).optional(),
});
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const matchQuerySchema = z.object({
  skillId: z.string().min(1, "Skill is required"),
});
export type MatchQuery = z.infer<typeof matchQuerySchema>;