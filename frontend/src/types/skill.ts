export type SkillType = "TEACH" | "LEARN" | "BOTH";
export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  skills?: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category: SkillCategory;
}

export interface UserSkill {
  id: string;
  type: SkillType;
  level: SkillLevel;
  yearsExperience: number;
  description: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  skill: Skill;
}

export interface CreateUserSkillInput {
  skillId: string;
  type: SkillType;
  level: SkillLevel;
  yearsExperience: number;
  description?: string;
}

export interface UpdateUserSkillInput {
  type?: SkillType;
  level?: SkillLevel;
  yearsExperience?: number;
  description?: string | null;
}

export interface DiscoveryUserSkill extends UserSkill {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    bio: string | null;
    location: string | null;
    isVerified: boolean;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}