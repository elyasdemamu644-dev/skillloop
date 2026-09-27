import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as adminService from "../services/admin.service";

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.dashboardStats(), "Admin dashboard stats");
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.listUsers(req.query as never), "Admin user list");
});

export const patchUserStatus = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.updateUserStatus(req.user!.id, req.params.id, req.body), "User updated");
});

export const getModerationQueue = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.moderationQueue(), "Moderation queue");
});

export const removeReview = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteReviewAsAdmin(req.user!.id, req.params.id);
  ok(res, null, "Review deleted");
});

export const removeFeedback = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteFeedbackAsAdmin(req.user!.id, req.params.id);
  ok(res, null, "Feedback deleted");
});