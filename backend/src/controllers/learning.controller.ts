import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as learningService from "../services/learning.service";

// ─── Plans ──────────────────────────────────────────────────────────────────
export const listMyPlans = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await learningService.listMyPlans(req.user!.id), "My learning plans");
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await learningService.getPlan(req.user!.id, req.params.id), "Learning plan");
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  created(res, await learningService.createPlan(req.user!.id, req.body), "Learning plan created");
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await learningService.updatePlan(req.user!.id, req.params.id, req.body), "Learning plan updated");
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  await learningService.deletePlan(req.user!.id, req.params.id);
  ok(res, null, "Learning plan deleted");
});

// ─── Challenges & submissions ───────────────────────────────────────────────
export const createChallenge = asyncHandler(async (req: Request, res: Response) => {
  created(res, await learningService.createChallenge(req.user!.id, req.body), "Challenge created");
});

export const updateChallenge = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await learningService.updateChallenge(req.user!.id, req.params.id, req.body), "Challenge updated");
});

export const deleteChallenge = asyncHandler(async (req: Request, res: Response) => {
  await learningService.deleteChallenge(req.user!.id, req.params.id);
  ok(res, null, "Challenge deleted");
});

export const submitChallenge = asyncHandler(async (req: Request, res: Response) => {
  created(res, await learningService.submitChallenge(req.user!.id, req.params.id, req.body), "Submission created");
});

export const reviewSubmission = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await learningService.reviewSubmission(req.user!.id, req.params.submissionId, req.body), "Submission reviewed");
});

// ─── Feedback ───────────────────────────────────────────────────────────────
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  created(res, await learningService.createFeedback(req.user!.id, req.body), "Feedback given");
});