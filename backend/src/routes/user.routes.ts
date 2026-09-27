import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createUserSkillSchema, updateUserSkillSchema } from "../validators/skill.validator";
import * as userController from "../controllers/user.controller";

export const usersRouter = Router();

// Public discovery routes return only safe profile and user-skill fields.
usersRouter.get("/discover", userController.discoverUsers);
usersRouter.get("/skills/:skillId", userController.discoverUsersForSkill);

// Every /me/* route below is the current authenticated user — private.
usersRouter.use("/me", requireAuth);

usersRouter.get("/me/skills", userController.listMySkills);
usersRouter.post(
  "/me/skills",
  validateBody(createUserSkillSchema),
  userController.addMySkill
);
usersRouter.patch(
  "/me/skills/:id",
  validateBody(updateUserSkillSchema),
  userController.updateMySkill
);
usersRouter.delete("/me/skills/:id", userController.removeMySkill);