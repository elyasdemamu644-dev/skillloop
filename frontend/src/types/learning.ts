export type PlanStatus = "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type ChallengeType = "TASK" | "QUIZ" | "PROJECT" | "MILESTONE";
export type ChallengeDifficulty = "EASY" | "MEDIUM" | "HARD";
export type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface UserBrief {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface Submission {
  id: string;
  content: string;
  status: SubmissionStatus;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  submitter: UserBrief;
  reviewer: UserBrief | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  dueDate: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  submissions: Submission[];
}

export interface LearningPlan {
  id: string;
  title: string;
  description: string;
  goals: string | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  owner: UserBrief;
  author: UserBrief | null;
  skill: { id: string; name: string; slug: string } | null;
  exchange: {
    id: string;
    offering: { id: string; title: string; skill: { name: string } };
  } | null;
  challenges: Challenge[];
}

export interface CreatePlanInput {
  ownerId: string;
  title: string;
  description: string;
  goals?: string;
  skillId?: string;
  exchangeId?: string;
}

export interface CreateChallengeInput {
  planId: string;
  title: string;
  description?: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  dueDate?: string;
  order: number;
}

export interface Feedback {
  id: string;
  rating: number | null;
  content: string;
  createdAt: string;
  author: UserBrief;
  recipient: UserBrief;
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};