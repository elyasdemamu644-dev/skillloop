import type { SkillLevel } from "./skill";

export type OfferingMode = "ONLINE" | "IN_PERSON" | "BOTH";

export interface SkillOffering {
  id: string;
  title: string;
  description: string;
  level: SkillLevel;
  mode: OfferingMode;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  skill: { id: string; name: string; slug: string; category: { id: string; name: string; slug: string } };
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    bio: string | null;
    isVerified: boolean;
  };
}

export interface CreateOfferingInput {
  skillId: string;
  title: string;
  description: string;
  level: SkillLevel;
  mode: OfferingMode;
}