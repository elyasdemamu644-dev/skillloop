import { Prisma, SkillLevel, SkillType } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { slugify } from "../utils/slugify";
import type {
  CreateCategoryInput,
  CreateSkillInput,
  CreateUserSkillInput,
  UpdateCategoryInput,
  UpdateSkillInput,
  UpdateUserSkillInput,
} from "../validators/skill.validator";

// ─── Selects (never expose internal fields) ─────────────────────────────────
const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

export const SKILL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: CATEGORY_SELECT },
};

const USER_SKILL_SELECT = {
  id: true,
  type: true,
  level: true,
  yearsExperience: true,
  description: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  skill: { select: SKILL_SELECT },
};

// ─── Categories ──────────────────────────────────────────────────────────────
export async function listCategories() {
  return prisma.skillCategory.findMany({
    orderBy: { name: "asc" },
    select: {
      ...CATEGORY_SELECT,
      skills: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          categoryId: true,
        },
      },
    },
  });
}

export async function getCategoryById(categoryId: string) {
  const category = await prisma.skillCategory.findUnique({
    where: { id: categoryId },
    select: CATEGORY_SELECT,
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return category;
}

async function assertCategoryNameFree(name: string, excludeId?: string) {
  const byName = await prisma.skillCategory.findUnique({ where: { name } });
  if (byName && byName.id !== excludeId) {
    throw new ApiError(409, "A category with that name already exists");
  }
  const bySlug = await prisma.skillCategory.findUnique({ where: { slug: slugify(name) } });
  if (bySlug && bySlug.id !== excludeId) {
    throw new ApiError(409, "A category with that name already exists");
  }
}

export async function createCategory(input: CreateCategoryInput) {
  await assertCategoryNameFree(input.name);
  return prisma.skillCategory.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
    },
    select: CATEGORY_SELECT,
  });
}

export async function updateCategory(categoryId: string, input: UpdateCategoryInput) {
  await getCategoryById(categoryId); // 404 if it doesn't exist
  if (input.name) {
    await assertCategoryNameFree(input.name, categoryId);
  }

  const data: Prisma.SkillCategoryUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
    data.slug = slugify(input.name);
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }

  return prisma.skillCategory.update({
    where: { id: categoryId },
    data,
    select: CATEGORY_SELECT,
  });
}

export async function deleteCategory(categoryId: string) {
  const category = await getCategoryById(categoryId);
  const inUse = await prisma.skill.count({ where: { categoryId } });
  if (inUse > 0) {
    throw new ApiError(409, "Cannot delete a category that still contains skills");
  }
  await prisma.skillCategory.delete({ where: { id: category.id } });
}

// ─── Catalog skills ──────────────────────────────────────────────────────────
export interface SkillFilters {
  q?: string;
  category?: string; // category slug
}

export async function listSkills(filters: SkillFilters = {}) {
  const where: Prisma.SkillWhereInput = {};
  if (filters.q) {
    where.name = { contains: filters.q, mode: "insensitive" };
  }
  if (filters.category) {
    const category = await prisma.skillCategory.findUnique({
      where: { slug: filters.category },
      select: { id: true },
    });
    if (!category) return [];
    where.categoryId = category.id;
  }

  return prisma.skill.findMany({
    where,
    orderBy: { name: "asc" },
    select: SKILL_SELECT,
  });
}

export async function getSkillById(skillId: string) {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: SKILL_SELECT,
  });
  if (!skill) {
    throw new ApiError(404, "Skill not found");
  }
  return skill;
}

async function assertSkillNameFree(name: string, excludeId?: string) {
  const byName = await prisma.skill.findUnique({ where: { name } });
  if (byName && byName.id !== excludeId) {
    throw new ApiError(409, "A skill with that name already exists");
  }
  const bySlug = await prisma.skill.findUnique({ where: { slug: slugify(name) } });
  if (bySlug && bySlug.id !== excludeId) {
    throw new ApiError(409, "A skill with that name already exists");
  }
}

export async function createSkill(input: CreateSkillInput) {
  await getCategoryById(input.categoryId); // category must exist
  await assertSkillNameFree(input.name);
  return prisma.skill.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      categoryId: input.categoryId,
    },
    select: SKILL_SELECT,
  });
}
export async function updateSkill(skillId: string, input: UpdateSkillInput) {
  const existing = await getSkillById(skillId);
  if (input.categoryId) {
    await getCategoryById(input.categoryId); // category must exist
  }
  if (input.name) {
    await assertSkillNameFree(input.name, skillId);
  }

  const data: Prisma.SkillUncheckedUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
    data.slug = slugify(input.name);
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.categoryId !== undefined) {
    data.categoryId = input.categoryId;
  }

  return prisma.skill.update({
    where: { id: existing.id },
    data,
    select: SKILL_SELECT,
  });
}

export async function deleteSkill(skillId: string) {
  const existing = await getSkillById(skillId);
  const inUse = await prisma.userSkill.count({ where: { skillId } });
  if (inUse > 0) {
    throw new ApiError(409, "Cannot delete a skill that is already on users' profiles");
  }
  await prisma.skill.delete({ where: { id: existing.id } });
}

// ─── User skills (a user's own teach/learn profile) ─────────────────────────
export async function listUserSkills(userId: string, type?: SkillType) {
  const where: Prisma.UserSkillWhereInput = { userId };
  if (type) {
    where.type = type;
  }
  return prisma.userSkill.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: USER_SKILL_SELECT,
  });
}

export async function addUserSkill(userId: string, input: CreateUserSkillInput) {
  // The skill must exist in the catalog before it can be added to a profile.
  await getSkillById(input.skillId);

  const duplicate = await prisma.userSkill.findFirst({
    where: { userId, skillId: input.skillId },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, "You have already added this skill");
  }

  return prisma.userSkill.create({
    data: {
      userId,
      skillId: input.skillId,
      type: input.type,
      level: input.level,
      yearsExperience: input.yearsExperience,
      description: input.description,
    },
    select: USER_SKILL_SELECT,
  });
}

// Fetches a UserSkill that belongs to `userId`. Throws a generic 404 for both
// "doesn't exist" and "belongs to someone else" so other users' entries can't
// be probed. This is the single chokepoint for user-skill authorization.
async function getOwnedUserSkill(userId: string, userSkillId: string) {
  const userSkill = await prisma.userSkill.findFirst({
    where: { id: userSkillId, userId },
    select: { id: true },
  });
  if (!userSkill) {
    throw new ApiError(404, "User skill not found");
  }
  return userSkill;
}

export async function updateUserSkill(
  userId: string,
  userSkillId: string,
  input: UpdateUserSkillInput
) {
  const owned = await getOwnedUserSkill(userId, userSkillId);

  const data: Prisma.UserSkillUpdateInput = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.level !== undefined) data.level = input.level;
  if (input.yearsExperience !== undefined) data.yearsExperience = input.yearsExperience;
  if (input.description !== undefined) data.description = input.description;

  return prisma.userSkill.update({
    where: { id: owned.id },
    data,
    select: USER_SKILL_SELECT,
  });
}

export async function deleteUserSkill(userId: string, userSkillId: string) {
  const owned = await getOwnedUserSkill(userId, userSkillId);
  await prisma.userSkill.delete({ where: { id: owned.id } });
}

export interface PaginatedSkillFilters {
  search?: string;
  categoryId?: string;
  page: number;
  limit: number;
}

export async function discoverSkills(filters: PaginatedSkillFilters) {
  const where: Prisma.SkillWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.categoryId) {
    const category = await prisma.skillCategory.findUnique({
      where: { id: filters.categoryId },
      select: { id: true },
    });
    if (!category) throw new ApiError(404, "Category not found");
    where.categoryId = category.id;
  }

  const [skills, total] = await prisma.$transaction([
    prisma.skill.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: SKILL_SELECT,
    }),
    prisma.skill.count({ where }),
  ]);

  return {
    items: skills,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

const DISCOVERY_USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  bio: true,
  location: true,
  isVerified: true,
} as const;

export async function discoverUsersBySkill(filters: {
  skillId?: string;
  skillName?: string;
  type?: SkillType;
  level?: SkillLevel;
  page: number;
  limit: number;
}) {
  const skillWhere: Prisma.SkillWhereInput = filters.skillId
    ? { id: filters.skillId }
    : { name: { contains: filters.skillName, mode: "insensitive" } };
  const skill = await prisma.skill.findFirst({ where: skillWhere, select: { id: true } });
  if (filters.skillId && !skill) throw new ApiError(404, "Skill not found");
  if (filters.skillName && !skill) {
    return {
      items: [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const where: Prisma.UserSkillWhereInput = {
    ...(skill ? { skillId: skill.id } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.level ? { level: filters.level } : {}),
    user: { isActive: true },
  };
  const [userSkills, total] = await prisma.$transaction([
    prisma.userSkill.findMany({
      where,
      orderBy: [{ skill: { name: "asc" } }, { user: { lastName: "asc" } }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: {
        id: true,
        type: true,
        level: true,
        yearsExperience: true,
        description: true,
        isVerified: true,
        skill: { select: SKILL_SELECT },
        user: { select: DISCOVERY_USER_SELECT },
      },
    }),
    prisma.userSkill.count({ where }),
  ]);

  return {
    items: userSkills,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}