import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createReviewSchema, updateReviewSchema } from "../validators/reputation.validator";
import * as reputationController from "../controllers/reputation.controller";

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);
reviewsRouter.get("/", reputationController.listMyReviews);
reviewsRouter.get("/eligible", reputationController.listEligibleForReview);
reviewsRouter.get("/user/:userId", reputationController.listReviewsForUser);
reviewsRouter.post("/", validateBody(createReviewSchema), reputationController.createReview);
reviewsRouter.patch("/:id", validateBody(updateReviewSchema), reputationController.updateReview);
reviewsRouter.delete("/:id", reputationController.deleteReview);

export const achievementsRouter = Router();

achievementsRouter.use(requireAuth);
achievementsRouter.get("/", reputationController.listAchievements);
achievementsRouter.get("/me", reputationController.listMyAchievements);
achievementsRouter.get("/me/summary", reputationController.reputationSummary);
achievementsRouter.post("/evaluate", reputationController.evaluateAchievements);