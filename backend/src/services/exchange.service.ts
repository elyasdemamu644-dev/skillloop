import { ExchangeStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type { CreateExchangeInput, UpdateExchangeStatusInput } from "../validators/skill.validator";

const EXCHANGE_SELECT = {
  id: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  offering: { select: { id: true, title: true, skill: { select: { id: true, name: true } } } },
  requester: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
  provider: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
} as const;

export async function createExchange(requesterId: string, input: CreateExchangeInput) {
  const offering = await prisma.skillOffering.findFirst({
    where: { id: input.offeringId, isActive: true },
    select: { id: true, userId: true, title: true, skill: { select: { name: true } } },
  });
  if (!offering) throw new ApiError(404, "Active offering not found");
  if (offering.userId === requesterId) throw new ApiError(400, "You cannot request your own offering");

  const existing = await prisma.skillExchange.findUnique({
    where: { requesterId_offeringId: { requesterId, offeringId: input.offeringId } },
    select: { status: true },
  });
  if (existing && existing.status !== ExchangeStatus.REJECTED) {
    throw new ApiError(409, "You already have an exchange request for this offering");
  }

  let result;
  if (existing) {
    result = await prisma.skillExchange.update({
      where: { requesterId_offeringId: { requesterId, offeringId: input.offeringId } },
      data: { message: input.message, status: ExchangeStatus.REQUESTED, completedAt: null },
      select: EXCHANGE_SELECT,
    });
  } else {
    result = await prisma.skillExchange.create({
      data: { requesterId, providerId: offering.userId, offeringId: input.offeringId, message: input.message },
      select: EXCHANGE_SELECT,
    });
  }

  await createNotification({
    userId: offering.userId,
    type: "exchange",
    title: `New exchange request for ${offering.skill.name}`,
    body: `Someone wants to learn ${offering.title} with you.`,
    data: { href: "/exchanges", exchangeId: result.id },
  });
  return result;
}

export async function listMyExchanges(userId: string) {
  const where: Prisma.SkillExchangeWhereInput = { OR: [{ requesterId: userId }, { providerId: userId }] };
  return prisma.skillExchange.findMany({ where, orderBy: { createdAt: "desc" }, select: EXCHANGE_SELECT });
}

export async function updateExchangeStatus(userId: string, exchangeId: string, input: UpdateExchangeStatusInput) {
  const exchange = await prisma.skillExchange.findUnique({
    where: { id: exchangeId },
    select: { id: true, requesterId: true, providerId: true, status: true },
  });
  if (!exchange || (exchange.requesterId !== userId && exchange.providerId !== userId)) {
    throw new ApiError(404, "Exchange not found");
  }

  const nextStatus = input.status as ExchangeStatus;
  if (nextStatus === ExchangeStatus.ACCEPTED || nextStatus === ExchangeStatus.REJECTED) {
    if (exchange.providerId !== userId) throw new ApiError(403, "Only the provider can decide this request");
    if (exchange.status !== ExchangeStatus.REQUESTED) throw new ApiError(409, "Request is no longer pending");
  }
  if (nextStatus === ExchangeStatus.COMPLETED) {
    if (exchange.status !== ExchangeStatus.ACCEPTED) throw new ApiError(409, "Only accepted exchanges can be completed");
  }
  if (nextStatus === ExchangeStatus.REQUESTED) throw new ApiError(400, "Cannot move an exchange back to requested");

  const result = await prisma.skillExchange.update({
    where: { id: exchange.id },
    data: { status: nextStatus, completedAt: nextStatus === ExchangeStatus.COMPLETED ? new Date() : null },
    select: EXCHANGE_SELECT,
  });

  const labels: Partial<Record<ExchangeStatus, string>> = {
    ACCEPTED: "Your exchange request was accepted",
    REJECTED: "Your exchange request was declined",
    COMPLETED: "An exchange was completed",
    REQUESTED: "Your exchange request was sent",
  };
  const label = labels[nextStatus];
  if (label) {
    const notifyUserId = exchange.requesterId === userId ? exchange.providerId : exchange.requesterId;
    await createNotification({
      userId: notifyUserId,
      type: "exchange",
      title: label,
      body: result.offering.skill.name ? `About: ${result.offering.skill.name} — ${result.offering.title}` : undefined,
      data: { href: "/exchanges", exchangeId: result.id },
    });
  }
  return result;
}