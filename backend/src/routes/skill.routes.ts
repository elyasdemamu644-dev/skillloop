import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createSkillSchema, updateSkillSchema } from "../validators/skill.validator";
import * as skillController from "../controllers/skill.controller";

export const skillsRouter = Router();

// Catalog browsing is public.
skillsRouter.get("/", skillController.listSkills);
skillsRouter.get("/:id", skillController.getSkill);

// Catalog management is admin-only: skills are shared across every user's
// profile, offerings, plans and materials, so a single account must not be
// able to rewrite them. (These routes were previously open to any
// authenticated user.)
skillsRouter.post("/", requireAuth, requireAdmin, validateBody(createSkillSchema), skillController.createSkill);
skillsRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validateBody(updateSkillSchema),
  skillController.updateSkill
);
skillsRouter.delete("/:id", requireAuth, requireAdmin, skillController.deleteSkill);
