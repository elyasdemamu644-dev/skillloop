import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { pushToUser } from "../sockets";
import type { NotificationQuery } from "../validators/notification.validator";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  readAt: true,
  createdAt: true,
} as const;

// Persist a notification and deliver it in real time over the user's socket.
// Other services call this so inbox/badges stay in sync without polling.
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ? (input.data as Prisma.JsonObject) : undefined,
    },
    select: NOTIFICATION_SELECT,
  });
  pushToUser(input.userId, "notification", notification);
  return notification;
}

export async function listNotifications(userId: string, query: NotificationQuery) {
  const where = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: NOTIFICATION_SELECT,
    }),
    prisma.notification.count({ where }),
  ]);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function unreadCount(userId: string) {
  const unread = await prisma.notification.count({ where: { userId, readAt: null } });
  return { unread };
}

export async function markRead(userId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  if (result.count === 0) throw new ApiError(404, "Notification not found");
  return { unread: await prisma.notification.count({ where: { userId, readAt: null } }) };
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { unread: 0 };
}