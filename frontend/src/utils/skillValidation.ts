import { z } from "zod";

export const skillTypeSchema = z.enum(["TEACH", "LEARN", "BOTH"]);
export const skillLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);

// Shared with the Add / Edit skill form. `skillId` is required when adding a
// brand-new skill, but locked (not editable) when editing an existing entry.
export const userSkillFormSchema = z
  .object({
    skillId: z.string().min(1, "Please choose a skill"),
    type: skillTypeSchema,
    level: skillLevelSchema,
    yearsExperience: z.coerce
      .number()
      .int()
      .min(0, "Years cannot be negative")
      .max(100, "Years cannot exceed 100"),
    description: z.string().max(1000, "Description is too long").optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.type === "BOTH" && val.yearsExperience < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsExperience"],
        message: "Add at least 1 year if you teach and learn this skill",
      });
    }
  });

export type UserSkillFormValues = z.infer<typeof userSkillFormSchema>;

export const SKILL_TYPE_LABELS: Record<string, string> = {
  TEACH: "I can teach this",
  LEARN: "I want to learn this",
  BOTH: "I can teach and want to learn",
};

export const SKILL_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};