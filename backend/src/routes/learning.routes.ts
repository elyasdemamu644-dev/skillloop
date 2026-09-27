import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  createChallengeSchema,
  createFeedbackSchema,
  createPlanSchema,
  createSubmissionSchema,
  reviewSubmissionSchema,
  updateChallengeSchema,
  updatePlanSchema,
} from "../validators/learning.validator";
import * as learningController from "../controllers/learning.controller";

export const plansRouter = Router();

plansRouter.use(requireAuth);
plansRouter.get("/", learningController.listMyPlans);
plansRouter.get("/:id", learningController.getPlan);
plansRouter.post("/", validateBody(createPlanSchema), learningController.createPlan);
plansRouter.patch("/:id", validateBody(updatePlanSchema), learningController.updatePlan);
plansRouter.delete("/:id", learningController.deletePlan);

export const challengesRouter = Router();

challengesRouter.use(requireAuth);
challengesRouter.post("/", validateBody(createChallengeSchema), learningController.createChallenge);
challengesRouter.patch("/:id", validateBody(updateChallengeSchema), learningController.updateChallenge);
challengesRouter.delete("/:id", learningController.deleteChallenge);
challengesRouter.post("/:id/submissions", validateBody(createSubmissionSchema), learningController.submitChallenge);
challengesRouter.patch("/:id/submissions/:submissionId", validateBody(reviewSubmissionSchema), learningController.reviewSubmission);

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);
feedbackRouter.post("/", validateBody(createFeedbackSchema), learningController.createFeedback);