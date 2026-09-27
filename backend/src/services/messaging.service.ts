import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type {
  CreateConversationInput,
  MessageQuery,
  SendMessageInput,
} from "../validators/message.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

type UserBrief = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
};

const EXCHANGE_BRIEF = {
  select: {
    id: true,
    offering: { select: { id: true, title: true, skill: { select: { name: true } } } },
  },
} as const;

async function getOrThrowUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: USER_BRIEF });
}

// Finds a conversation between two users in either direction.
async function findConversationBetween(userA: string, userB: string) {
  return prisma.conversation.findFirst({
    where: {
      OR: [
        { starterId: userA, participantId: userB },
        { starterId: userB, participantId: userA },
      ],
    },
    select: { id: true },
  });
}

async function getParticipantConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ starterId: userId }, { participantId: userId }],
    },
    select: { id: true, starterId: true, participantId: true },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
}

export interface ConversationListItem {
  id: string;
  exchangeId: string | null;
  exchange: { id: string; offering: { id: string; title: string; skill: { name: string } } } | null;
  otherUser: UserBrief;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: Date;
    readAt: Date | null;
  } | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listMyConversations(userId: string): Promise<ConversationListItem[]> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ starterId: userId }, { participantId: userId }] },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      starterId: true,
      participantId: true,
      exchangeId: true,
      createdAt: true,
      updatedAt: true,
      exchange: EXCHANGE_BRIEF,
      starter: { select: USER_BRIEF },
      participant: { select: USER_BRIEF },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true } },
    },
  });

  const unreadRows = await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>`
    SELECT "conversationId", COUNT(*)::bigint AS count
    FROM messages
    WHERE "senderId" <> ${userId} AND "readAt" IS NULL
    GROUP BY "conversationId"
  `;
  const unreadByConversation = new Map(unreadRows.map((row) => [row.conversationId, Number(row.count)]));

  return conversations.map((conversation): ConversationListItem => {
    const otherUser: UserBrief =
      conversation.starterId === userId ? conversation.participant : conversation.starter;
    return {
      id: conversation.id,
      exchangeId: conversation.exchangeId,
      exchange: conversation.exchange,
      otherUser,
      lastMessage: conversation.messages[0] ?? null,
      unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  });
}

export async function getOrCreateConversation(userId: string, input: CreateConversationInput) {
  if (input.participantId === userId) {
    throw new ApiError(400, "You cannot start a conversation with yourself");
  }
  const participant = await getOrThrowUser(input.participantId);
  if (!participant) throw new ApiError(404, "User not found");

  const existing = await findConversationBetween(userId, input.participantId);
  if (existing) return existing;

  if (input.exchangeId) {
    const exchange = await prisma.skillExchange.findUnique({
      where: { id: input.exchangeId },
      select: { requesterId: true, providerId: true },
    });
    if (!exchange) throw new ApiError(404, "Exchange not found");
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      throw new ApiError(403, "Only exchange participants can start a conversation on it");
    }
  }

  return prisma.conversation.create({
    data: {
      starterId: userId,
      participantId: input.participantId,
      exchangeId: input.exchangeId,
    },
    select: { id: true },
  });
}

export async function listMessages(userId: string, conversationId: string, query: MessageQuery) {
  await getParticipantConversation(userId, conversationId);

  const where: Prisma.MessageWhereInput = { conversationId };
  const total = await prisma.message.count({ where });
  const skip = Math.max(0, total - query.page * query.limit);
  const items = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip,
    take: query.limit,
    select: {
      id: true,
      body: true,
      senderId: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
  const conversation = await getParticipantConversation(userId, conversationId);
  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: userId, body: input.body },
    select: {
      id: true,
      body: true,
      senderId: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  const receiverId = conversation.starterId === userId ? conversation.participantId : conversation.starterId;
  await createNotification({
    userId: receiverId,
    type: "message",
    title: `${message.sender.firstName} sent you a message`,
    body: input.body,
    data: { href: `/messages?conversation=${conversation.id}`, conversationId: conversation.id },
  });

  return message;
}

export async function markConversationRead(userId: string, conversationId: string) {
  await getParticipantConversation(userId, conversationId);
  const result = await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

export async function getUnreadCount(userId: string) {
  const row = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM messages
    JOIN conversations ON conversations.id = messages."conversationId"
    WHERE messages."senderId" <> ${userId}
      AND messages."readAt" IS NULL
      AND (conversations."starterId" = ${userId} OR conversations."participantId" = ${userId})
  `;
  return { unread: Number(row[0]?.count ?? 0) };
}

// Full conversation with the other user, used by sockets to inform both
// participants of a fresh thread.
export async function getConversationForUser(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ starterId: userId }, { participantId: userId }],
    },
    select: {
      id: true,
      starterId: true,
      participantId: true,
      exchangeId: true,
      createdAt: true,
      updatedAt: true,
      exchange: EXCHANGE_BRIEF,
      starter: { select: USER_BRIEF },
      participant: { select: USER_BRIEF },
    },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const otherUser: UserBrief =
    conversation.starterId === userId ? conversation.participant : conversation.starter;
  return {
    id: conversation.id,
    exchangeId: conversation.exchangeId,
    exchange: conversation.exchange,
    otherUser,
    lastMessage: null,
    unreadCount: 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}