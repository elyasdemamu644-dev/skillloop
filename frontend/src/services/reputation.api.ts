import { api } from "./api";
import type {
  Achievement,
  EligibleReviewItem,
  ReputationSummary,
  Review,
  UserAchievement,
} from "@/types/reputation";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchMyReviews(): Promise<Review[]> {
  const { data } = await api.get<ApiEnvelope<Review[]>>("/reviews");
  return data.data;
}

export async function fetchEligibleForReview(): Promise<EligibleReviewItem[]> {
  const { data } = await api.get<ApiEnvelope<EligibleReviewItem[]>>("/reviews/eligible");
  return data.data;
}

export async function createReview(input: {
  recipientId: string;
  exchangeId?: string;
  sessionId?: string;
  rating: number;
  content: string;
}): Promise<Review> {
  const { data } = await api.post<ApiEnvelope<Review>>("/reviews", input);
  return data.data;
}

export async function updateReview(
  id: string,
  input: { rating?: number; content?: string }
): Promise<Review> {
  const { data } = await api.patch<ApiEnvelope<Review>>(`/reviews/${id}`, input);
  return data.data;
}

export async function deleteReview(id: string): Promise<void> {
  await api.delete(`/reviews/${id}`);
}

export async function fetchReputationSummary(): Promise<ReputationSummary> {
  const { data } = await api.get<ApiEnvelope<ReputationSummary>>("/achievements/me/summary");
  return data.data;
}

export async function fetchAchievements(): Promise<Achievement[]> {
  const { data } = await api.get<ApiEnvelope<Achievement[]>>("/achievements");
  return data.data;
}

export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const { data } = await api.get<ApiEnvelope<UserAchievement[]>>("/achievements/me");
  return data.data;
}

export async function evaluateAchievements(): Promise<UserAchievement[]> {
  const { data } = await api.post<ApiEnvelope<UserAchievement[]>>("/achievements/evaluate");
  return data.data;
}