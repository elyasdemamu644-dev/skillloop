import { api } from "./api";
import type {
  Challenge,
  ChallengeDifficulty,
  ChallengeType,
  CreateChallengeInput,
  CreatePlanInput,
  Feedback,
  LearningPlan,
  PlanStatus,
  Submission,
  SubmissionStatus,
} from "@/types/learning";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchPlans(): Promise<LearningPlan[]> {
  const { data } = await api.get<ApiEnvelope<LearningPlan[]>>("/plans");
  return data.data;
}

export async function fetchPlan(id: string): Promise<LearningPlan> {
  const { data } = await api.get<ApiEnvelope<LearningPlan>>(`/plans/${id}`);
  return data.data;
}

export async function createPlan(input: CreatePlanInput): Promise<LearningPlan> {
  const { data } = await api.post<ApiEnvelope<LearningPlan>>("/plans", input);
  return data.data;
}

export async function updatePlan(
  id: string,
  input: { title?: string; description?: string; goals?: string | null; status?: PlanStatus }
): Promise<LearningPlan> {
  const { data } = await api.patch<ApiEnvelope<LearningPlan>>(`/plans/${id}`, input);
  return data.data;
}

export async function deletePlan(id: string): Promise<void> {
  await api.delete(`/plans/${id}`);
}

export async function createChallenge(input: CreateChallengeInput): Promise<Challenge> {
  const { data } = await api.post<ApiEnvelope<Challenge>>("/challenges", input);
  return data.data;
}

export async function deleteChallenge(id: string): Promise<void> {
  await api.delete(`/challenges/${id}`);
}

export async function submitChallenge(
  challengeId: string,
  input: { content: string; attachmentUrl?: string }
): Promise<Submission> {
  const { data } = await api.post<ApiEnvelope<Submission>>(`/challenges/${challengeId}/submissions`, input);
  return data.data;
}

export async function reviewSubmission(
  challengeId: string,
  submissionId: string,
  input: { status: SubmissionStatus; feedback?: string }
): Promise<Submission> {
  const { data } = await api.patch<ApiEnvelope<Submission>>(
    `/challenges/${challengeId}/submissions/${submissionId}`,
    input
  );
  return data.data;
}

export async function createFeedback(input: {
  recipientId: string;
  exchangeId?: string;
  rating?: number;
  content: string;
}): Promise<Feedback> {
  const { data } = await api.post<ApiEnvelope<Feedback>>("/feedback", input);
  return data.data;
}

export const CHALLENGE_TYPES: ChallengeType[] = ["TASK", "QUIZ", "PROJECT", "MILESTONE"];
export const CHALLENGE_DIFFICULTIES: ChallengeDifficulty[] = ["EASY", "MEDIUM", "HARD"];