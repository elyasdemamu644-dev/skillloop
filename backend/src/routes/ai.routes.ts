import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { generatePlanSchema } from "../validators/ai.validator";
import * as aiController from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.use(requireAuth);
aiRouter.get("/recommendations", aiController.recommendations);
aiRouter.post("/generate-plan", validateBody(generatePlanSchema), aiController.generatePlan);
aiRouter.get("/match", aiController.matchMentors);