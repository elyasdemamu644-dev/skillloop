import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../middleware/error.middleware";
import { matchQuerySchema } from "../validators/ai.validator";
import * as aiService from "../services/ai.service";

export const recommendations = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await aiService.getRecommendations(req.user!.id), "AI recommendations");
});

export const generatePlan = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await aiService.generatePlan(req.body as never), "Plan generated");
});

export const matchMentors = asyncHandler(async (req: Request, res: Response) => {
  const parsed = matchQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Skill is required");
  ok(res, await aiService.matchMentors(req.user!.id, parsed.data.skillId), "Matches");
});