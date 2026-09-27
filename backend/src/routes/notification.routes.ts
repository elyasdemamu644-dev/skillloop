import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get("/", notificationController.listNotifications);
notificationsRouter.get("/unread-count", notificationController.unreadCount);
notificationsRouter.post("/mark-all-read", notificationController.markAllRead);
notificationsRouter.patch("/:id/read", notificationController.markRead);