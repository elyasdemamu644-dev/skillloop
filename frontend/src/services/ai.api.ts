import { api } from "./api";
import type { GeneratedPlan, MatchResponse, RecommendationResponse } from "@/types/ai";
import type { SkillLevel } from "@/types/skill";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchRecommendations(): Promise<RecommendationResponse> {
  const { data } = await api.get<ApiEnvelope<RecommendationResponse>>("/ai/recommendations");
  return data.data;
}

export async function generatePlan(input: {
  skillId: string;
  level?: SkillLevel;
  goals?: string;
}): Promise<GeneratedPlan> {
  const { data } = await api.post<ApiEnvelope<GeneratedPlan>>("/ai/generate-plan", input);
  return data.data;
}

export async function matchMentors(skillId: string): Promise<MatchResponse> {
  const { data } = await api.get<ApiEnvelope<MatchResponse>>("/ai/match", { params: { skillId } });
  return data.data;
}