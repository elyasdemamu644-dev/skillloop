import { api } from "./api";
import type { Pagination } from "@/types/skill";
import type { CreateOfferingInput, SkillOffering } from "@/types/offering";

interface ApiEnvelope<T> { success: boolean; data: T; message: string }

export async function fetchOfferings(params: { skillId?: string; level?: string; mode?: string; page?: number; limit?: number } = {}) {
  const { data } = await api.get<ApiEnvelope<{ items: SkillOffering[]; pagination: Pagination }>>("/offerings", { params });
  return data.data;
}

export async function fetchMyOfferings() {
  const { data } = await api.get<ApiEnvelope<SkillOffering[]>>("/offerings/mine");
  return data.data;
}

export async function createOffering(input: CreateOfferingInput) {
  const { data } = await api.post<ApiEnvelope<SkillOffering>>("/offerings", input);
  return data.data;
}

export async function updateOffering(id: string, input: Partial<Omit<CreateOfferingInput, "skillId">> & { isActive?: boolean }) {
  const { data } = await api.patch<ApiEnvelope<SkillOffering>>(`/offerings/${id}`, input);
  return data.data;
}

export async function deleteOffering(id: string) {
  await api.delete(`/offerings/${id}`);
}