import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { updateUserStatusSchema } from "../validators/admin.validator";
import * as adminController from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/stats", adminController.getDashboardStats);
adminRouter.get("/users", adminController.getUsers);
adminRouter.get("/moderation", adminController.getModerationQueue);
adminRouter.patch("/users/:id", validateBody(updateUserStatusSchema), adminController.patchUserStatus);
adminRouter.delete("/moderation/reviews/:id", adminController.removeReview);
adminRouter.delete("/moderation/feedback/:id", adminController.removeFeedback);