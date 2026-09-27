import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as reputationService from "../services/reputation.service";

// ─── Reviews ────────────────────────────────────────────────────────────────
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  created(res, await reputationService.createReview(req.user!.id, req.body), "Review submitted");
});

export const listReviewsForUser = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.listReviewsForUser(req.params.userId), "Reviews");
});

export const listMyReviews = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.listMyReviews(req.user!.id), "My reviews");
});

export const listEligibleForReview = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.listEligibleForReview(req.user!.id), "Eligible items to review");
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.updateReview(req.user!.id, req.params.id, req.body), "Review updated");
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  await reputationService.deleteReview(req.user!.id, req.params.id);
  ok(res, null, "Review deleted");
});

// ─── Reputation ─────────────────────────────────────────────────────────────
export const reputationSummary = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.reputationSummary(req.user!.id), "Reputation summary");
});

// ─── Achievements ───────────────────────────────────────────────────────────
export const listAchievements = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.listAchievements(), "Achievements");
});

export const listMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.listMyAchievements(req.user!.id), "My achievements");
});

export const evaluateAchievements = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reputationService.evaluateAchievements(req.user!.id), "Achievements evaluated");
});