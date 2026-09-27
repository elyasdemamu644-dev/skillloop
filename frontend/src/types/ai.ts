import type { SkillLevel } from "@/types/skill";

export interface AiOffering {
  id: string;
  title: string;
  description: string;
  level: SkillLevel;
  mode: "ONLINE" | "IN_PERSON" | "BOTH";
  matchScore: number;
  reason: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    location: string | null;
    bio: string | null;
  };
  skill: { id: string; name: string; category: { name: string } };
}

export interface RecommendationResponse {
  items: AiOffering[];
}

export interface PlanStage {
  title: string;
  type: "TASK" | "QUIZ" | "PROJECT" | "MILESTONE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string;
}

export interface GeneratedPlan {
  title: string;
  description: string;
  goals: string;
  skill: { id: string; name: string; category: string };
  stages: PlanStage[];
}

export interface MentorMatch {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    location: string | null;
    bio: string | null;
  };
  teachesLevel: SkillLevel;
  yearsExperience: number;
  rating: number;
  ratingCount: number;
  completedExchanges: number;
  matchScore: number;
}

export interface MatchResponse {
  skill: { id: string; name: string };
  items: MentorMatch[];
}