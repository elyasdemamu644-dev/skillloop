import { SessionStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type {
  CreateAvailabilityInput,
  CreateSessionInput,
  RescheduleSessionInput,
  SessionQuery,
  UpdateAvailabilityInput,
  UpdateSessionStatusInput,
} from "../validators/session.validator";

const SESSION_SELECT = {
  id: true,
  startsAt: true,
  endTime: true,
  status: true,
  meetingLink: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  exchange: {
    select: {
      id: true,
      message: true,
      offering: { select: { id: true, title: true, skill: { select: { id: true, name: true } } } },
    },
  },
  learner: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
  teacher: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
} as const;

const AVAILABILITY_SELECT = {
  id: true,
  dayOfWeek: true,
  date: true,
  startTime: true,
  endTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Availability ───────────────────────────────────────────────────────────
export async function listMyAvailabilities(userId: string) {
  return prisma.availability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
    select: AVAILABILITY_SELECT,
  });
}

export async function listUserAvailabilities(targetUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!user) throw new ApiError(404, "User not found");
  return prisma.availability.findMany({
    where: { userId: targetUserId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
    select: AVAILABILITY_SELECT,
  });
}

export async function createAvailability(userId: string, input: CreateAvailabilityInput) {
  return prisma.availability.create({
    data: {
      userId,
      dayOfWeek: input.dayOfWeek,
      date: input.date ? new Date(input.date) : null,
      startTime: input.startTime,
      endTime: input.endTime,
    },
    select: AVAILABILITY_SELECT,
  });
}

async function getOwnedAvailability(userId: string, availabilityId: string) {
  const availability = await prisma.availability.findFirst({
    where: { id: availabilityId, userId },
    select: { id: true },
  });
  if (!availability) throw new ApiError(404, "Availability slot not found");
  return availability;
}

export async function updateAvailability(
  userId: string,
  availabilityId: string,
  input: UpdateAvailabilityInput
) {
  const owned = await getOwnedAvailability(userId, availabilityId);
  const data: Prisma.AvailabilityUpdateInput = {};
  if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
  if (input.date !== undefined) data.date = input.date ? new Date(input.date) : null;
  if (input.startTime !== undefined) data.startTime = input.startTime;
  if (input.endTime !== undefined) data.endTime = input.endTime;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  return prisma.availability.update({ where: { id: owned.id }, data, select: AVAILABILITY_SELECT });
}

export async function deleteAvailability(userId: string, availabilityId: string) {
  const owned = await getOwnedAvailability(userId, availabilityId);
  await prisma.availability.delete({ where: { id: owned.id } });
}

// ─── Sessions ───────────────────────────────────────────────────────────────
export async function listMySessions(userId: string, query: SessionQuery) {
  const where: Prisma.SessionWhereInput = {
    OR: [{ learnerId: userId }, { teacherId: userId }],
    ...(query.status ? { status: query.status as SessionStatus } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.session.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: SESSION_SELECT,
    }),
    prisma.session.count({ where }),
  ]);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createSession(userId: string, input: CreateSessionInput) {
  const exchange = await prisma.skillExchange.findUnique({
    where: { id: input.exchangeId },
    select: { id: true, requesterId: true, providerId: true, status: true, offering: { select: { mode: true } } },
  });
  if (!exchange) throw new ApiError(404, "Exchange not found");
  if (exchange.requesterId !== userId && exchange.providerId !== userId) {
    throw new ApiError(403, "Only participants can schedule a session for this exchange");
  }
  if (exchange.status !== "ACCEPTED") {
    throw new ApiError(409, "Sessions can only be scheduled once the exchange is accepted");
  }

  const teacherId = exchange.providerId;
  const learnerId = exchange.requesterId;

  const startsAt = new Date(input.startsAt);
  const endTime = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
  if (endTime <= new Date()) throw new ApiError(400, "Session time must be in the future");

  // Prevent overlapping non-rejected sessions between the same two people.
  const overlap = await prisma.session.findFirst({
    where: {
      teacherId,
      learnerId,
      status: { in: ["PROPOSED", "CONFIRMED"] },
      startsAt: { lt: endTime },
      endTime: { gt: startsAt },
    },
    select: { id: true },
  });
  if (overlap) throw new ApiError(409, "That time overlaps an existing session with this person");

  const session = await prisma.session.create({
    data: {
      exchangeId: exchange.id,
      learnerId,
      teacherId,
      startsAt,
      endTime,
      notes: input.notes,
    },
    select: SESSION_SELECT,
  });

  const proposee = userId === teacherId ? learnerId : teacherId;
  const dateLabel = startsAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  await createNotification({
    userId: proposee,
    type: "session",
    title: "New session proposed",
    body: `${session.exchange.offering.skill.name} · ${dateLabel}`,
    data: { href: "/sessions", sessionId: session.id },
  });

  return session;
}

async function getParticipantSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      OR: [{ learnerId: userId }, { teacherId: userId }],
    },
    select: { id: true, status: true, learnerId: true, teacherId: true },
  });
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}

export async function updateSessionStatus(
  userId: string,
  sessionId: string,
  input: UpdateSessionStatusInput
) {
  const session = await getParticipantSession(userId, sessionId);
  const nextStatus = input.status as SessionStatus;

  const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
    PROPOSED: ["CONFIRMED", "DECLINED", "CANCELLED"],
    CONFIRMED: ["CANCELLED", "COMPLETED"],
    DECLINED: [],
    CANCELLED: [],
    COMPLETED: [],
  };
  if (!VALID_TRANSITIONS[session.status].includes(nextStatus)) {
    throw new ApiError(409, `Cannot move a session from ${session.status} to ${nextStatus}`);
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { status: nextStatus },
    select: SESSION_SELECT,
  });

  const otherId = session.learnerId === userId ? session.teacherId : session.learnerId;
  const titleByStatus: Partial<Record<SessionStatus, string>> = {
    CONFIRMED: "Session confirmed",
    DECLINED: "A session was declined",
    CANCELLED: "A session was cancelled",
    COMPLETED: "A session was completed",
  };
  const title = titleByStatus[nextStatus];
  if (title) {
    await createNotification({
      userId: otherId,
      type: "session",
      title,
      body: `${updated.exchange.offering.skill.name} · ${new Date(updated.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
      data: { href: "/sessions", sessionId: updated.id },
    });
  }

  return updated;
}

export async function rescheduleSession(
  userId: string,
  sessionId: string,
  input: RescheduleSessionInput
) {
  const session = await getParticipantSession(userId, sessionId);
  if (session.status !== "PROPOSED" && session.status !== "CONFIRMED") {
    throw new ApiError(409, "Only proposed or confirmed sessions can be rescheduled");
  }
  const startsAt = new Date(input.startsAt);
  const durationMinutes = input.durationMinutes ?? 60;
  const endTime = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (endTime <= new Date()) throw new ApiError(400, "Session time must be in the future");

  return prisma.session.update({
    where: { id: session.id },
    data: { startsAt, endTime },
    select: SESSION_SELECT,
  });
}

export async function getSessionById(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, OR: [{ learnerId: userId }, { teacherId: userId }] },
    select: SESSION_SELECT,
  });
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}