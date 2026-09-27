import { api } from "./api";
import type {
  CreateUserSkillInput,
  Skill,
  SkillCategory,
  DiscoveryUserSkill,
  Pagination,
  UpdateUserSkillInput,
  UserSkill,
} from "@/types/skill";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchCategories(): Promise<SkillCategory[]> {
  const { data } = await api.get<ApiEnvelope<SkillCategory[]>>("/categories");
  return data.data;
}

export async function fetchSkills(params: { q?: string; category?: string } = {}): Promise<Skill[]> {
  const { data } = await api.get<ApiEnvelope<Skill[]>>("/skills", { params });
  return data.data;
}

export async function fetchMySkills(): Promise<UserSkill[]> {
  const { data } = await api.get<ApiEnvelope<UserSkill[]>>("/users/me/skills");
  return data.data;
}

export async function addMySkill(input: CreateUserSkillInput): Promise<UserSkill> {
  const { data } = await api.post<ApiEnvelope<UserSkill>>("/users/me/skills", input);
  return data.data;
}

export async function updateMySkill(
  userSkillId: string,
  input: UpdateUserSkillInput
): Promise<UserSkill> {
  const { data } = await api.patch<ApiEnvelope<UserSkill>>(`/users/me/skills/${userSkillId}`, input);
  return data.data;
}

export async function removeMySkill(userSkillId: string): Promise<void> {
  await api.delete(`/users/me/skills/${userSkillId}`);
}

export async function discoverSkills(params: {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Skill[]; pagination: Pagination }> {
  const { data } = await api.get<ApiEnvelope<{ items: Skill[]; pagination: Pagination }>>("/skills", {
    params,
  });
  return data.data;
}

export async function discoverUsers(params: {
  search?: string;
  skillId?: string;
  type?: string;
  level?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: DiscoveryUserSkill[]; pagination: Pagination }> {
  const { data } = await api.get<ApiEnvelope<{ items: DiscoveryUserSkill[]; pagination: Pagination }>>(
    "/users/discover",
    { params }
  );
  return data.data;
}