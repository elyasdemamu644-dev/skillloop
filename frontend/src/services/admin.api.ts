import { api } from "./api";
import type { AdminStats, AdminUserPage, ModerationQueue } from "@/types/admin";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<ApiEnvelope<AdminStats>>("/admin/stats");
  return data.data;
}

export async function fetchAdminUsers(input: { page?: number; limit?: number; q?: string } = {}): Promise<AdminUserPage> {
  const { data } = await api.get<ApiEnvelope<AdminUserPage>>("/admin/users", { params: input });
  return data.data;
}

export async function updateUserStatus(
  id: string,
  input: { isActive?: boolean; isAdmin?: boolean }
): Promise<{ id: string; isActive: boolean; isAdmin: boolean }> {
  const { data } = await api.patch<ApiEnvelope<{ id: string; isActive: boolean; isAdmin: boolean }>>(
    `/admin/users/${id}`,
    input
  );
  return data.data;
}

export async function fetchModerationQueue(): Promise<ModerationQueue> {
  const { data } = await api.get<ApiEnvelope<ModerationQueue>>("/admin/moderation");
  return data.data;
}

export async function deleteModeratedReview(id: string): Promise<void> {
  await api.delete(`/admin/moderation/reviews/${id}`);
}

export async function deleteModeratedFeedback(id: string): Promise<void> {
  await api.delete(`/admin/moderation/feedback/${id}`);
}