import { OfferingMode, Prisma, SkillLevel } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import type {
  CreateOfferingInput,
  OfferingQuery,
  UpdateOfferingInput,
} from "../validators/skill.validator";

const OFFERING_SELECT = {
  id: true,
  title: true,
  description: true,
  level: true,
  mode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  skill: { select: { id: true, name: true, slug: true, category: { select: { id: true, name: true, slug: true } } } },
  user: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      isVerified: true,
    },
  },
} as const;

export async function listOfferings(query: OfferingQuery) {
  const where: Prisma.SkillOfferingWhereInput = { isActive: true };
  if (query.skillId) {
    const skill = await prisma.skill.findUnique({ where: { id: query.skillId }, select: { id: true } });
    if (!skill) throw new ApiError(404, "Skill not found");
    where.skillId = query.skillId;
  }
  if (query.level) where.level = query.level as SkillLevel;
  if (query.mode) where.mode = query.mode as OfferingMode;

  const [items, total] = await prisma.$transaction([
    prisma.skillOffering.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: OFFERING_SELECT,
    }),
    prisma.skillOffering.count({ where }),
  ]);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function listMyOfferings(userId: string) {
  return prisma.skillOffering.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: OFFERING_SELECT,
  });
}

export async function createOffering(userId: string, input: CreateOfferingInput) {
  const skill = await prisma.skill.findUnique({ where: { id: input.skillId }, select: { id: true } });
  if (!skill) throw new ApiError(404, "Skill not found");
  return prisma.skillOffering.create({
    data: { ...input, userId },
    select: OFFERING_SELECT,
  });
}

export async function updateOffering(userId: string, offeringId: string, input: UpdateOfferingInput) {
  const existing = await prisma.skillOffering.findFirst({ where: { id: offeringId, userId }, select: { id: true } });
  if (!existing) throw new ApiError(404, "Offering not found");
  return prisma.skillOffering.update({ where: { id: existing.id }, data: input, select: OFFERING_SELECT });
}

export async function deleteOffering(userId: string, offeringId: string) {
  const existing = await prisma.skillOffering.findFirst({ where: { id: offeringId, userId }, select: { id: true } });
  if (!existing) throw new ApiError(404, "Offering not found");

  // Exchanges cascade from the offering, and sessions cascade from exchanges,
  // so a hard delete would silently erase the other party's history. Retire
  // the offering instead (PATCH with isActive: false).
  const exchanges = await prisma.skillExchange.count({ where: { offeringId: existing.id } });
  if (exchanges > 0) {
    throw new ApiError(
      409,
      "This offering already has exchanges. Deactivate it instead of deleting it, so the learners' history is preserved."
    );
  }

  await prisma.skillOffering.delete({ where: { id: existing.id } });
}