import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createSkillSchema, updateSkillSchema } from "../validators/skill.validator";
import * as skillController from "../controllers/skill.controller";

export const skillsRouter = Router();

// Catalog browsing is public.
skillsRouter.get("/", skillController.listSkills);
skillsRouter.get("/:id", skillController.getSkill);

// Catalog management requires an authenticated user for now; Phase 22 (Admin)
// adds a requireAdmin guard on top of these same routes.
skillsRouter.post("/", requireAuth, validateBody(createSkillSchema), skillController.createSkill);
skillsRouter.patch(
  "/:id",
  requireAuth,
  validateBody(updateSkillSchema),
  skillController.updateSkill
);
skillsRouter.delete("/:id", requireAuth, skillController.deleteSkill);