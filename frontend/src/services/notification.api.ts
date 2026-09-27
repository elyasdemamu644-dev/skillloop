import { api } from "./api";
import type { AppNotification, NotificationPage } from "@/types/notifications";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchNotifications(input: { page?: number; limit?: number } = {}): Promise<NotificationPage<AppNotification>> {
  const { data } = await api.get<ApiEnvelope<NotificationPage<AppNotification>>>("/notifications", {
    params: { page: input.page ?? 1, limit: input.limit ?? 50 },
  });
  return data.data;
}

export async function fetchUnreadNotifications(): Promise<{ unread: number }> {
  const { data } = await api.get<ApiEnvelope<{ unread: number }>>("/notifications/unread-count");
  return data.data;
}

export async function markNotificationRead(id: string): Promise<{ unread: number }> {
  const { data } = await api.patch<ApiEnvelope<{ unread: number }>>(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead(): Promise<{ unread: number }> {
  const { data } = await api.post<ApiEnvelope<{ unread: number }>>("/notifications/mark-all-read");
  return data.data;
}