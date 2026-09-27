export interface UserBrief {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface Review {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: UserBrief;
  recipient: UserBrief;
  exchange: {
    id: string;
    offering: { id: string; title: string; skill: { name: string } };
  } | null;
  session: { id: string; startsAt: string; status: string } | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  tier: number;
  points: number;
  unlockedAt: string;
}

export interface ReputationSummary {
  average: number | null;
  total: number;
  distribution: Record<number, number>;
  points: number;
  badges: Badge[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: string;
  tier: number;
  points: number;
  usersUnlocked: number;
}

export interface UserAchievement {
  id: string;
  unlockedAt: string;
  achievement: Achievement;
}

export interface EligibleReviewItem {
  type: "exchange" | "session";
  id: string;
  title: string;
  partner: UserBrief;
}