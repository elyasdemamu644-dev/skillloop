import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as notificationService from "../services/notification.service";
import { notificationQuerySchema } from "../validators/notification.validator";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const query = notificationQuerySchema.parse(req.query);
  ok(res, await notificationService.listNotifications(req.user!.id, query), "Notifications");
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await notificationService.unreadCount(req.user!.id), "Unread count");
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await notificationService.markRead(req.user!.id, req.params.id), "Marked as read");
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await notificationService.markAllRead(req.user!.id), "All marked as read");
});