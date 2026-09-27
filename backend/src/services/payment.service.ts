import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type { CreatePaymentInput } from "../validators/payment.validator";
import { paymentListQuerySchema } from "../validators/payment.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

const PAYMENT_SELECT = {
  id: true,
  amount: true,
  currency: true,
  status: true,
  method: true,
  description: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: USER_BRIEF },
  recipient: { select: USER_BRIEF },
  exchange: {
    select: {
      id: true,
      offering: { select: { id: true, title: true, skill: { select: { name: true } } } },
    },
  },
} as const;

export async function getWallet(userId: string) {
  const [user, paid, received] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
    prisma.payment.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { recipientId: userId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);
  if (!user) throw new ApiError(404, "User not found");
  return {
    balance: user.walletBalance,
    totalPaid: paid._sum.amount ?? 0,
    totalReceived: received._sum.amount ?? 0,
  };
}

export async function listMyPayments(userId: string, query: unknown) {
  const { page, limit } = paymentListQuerySchema.parse(query);
  const where: Prisma.PaymentWhereInput = {
    OR: [{ userId }, { recipientId: userId }],
  };
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: PAYMENT_SELECT,
    }),
    prisma.payment.count({ where }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getOwnedPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, OR: [{ userId }, { recipientId: userId }] },
    select: { userId: true, ...PAYMENT_SELECT },
  });
  if (!payment) throw new ApiError(404, "Payment not found");
  return payment;
}

export async function createPayment(userId: string, input: CreatePaymentInput) {
  if (input.recipientId && input.recipientId === userId) {
    throw new ApiError(400, "You cannot pay yourself");
  }
  if (input.recipientId) {
    const recipient = await prisma.user.findUnique({ where: { id: input.recipientId }, select: { id: true } });
    if (!recipient) throw new ApiError(404, "Recipient not found");
  }
  if (input.exchangeId) {
    const exchange = await prisma.skillExchange.findUnique({
      where: { id: input.exchangeId },
      select: { id: true, requesterId: true, providerId: true },
    });
    if (!exchange) throw new ApiError(404, "Exchange not found");
    if (exchange.requesterId !== userId && exchange.providerId !== userId) {
      throw new ApiError(403, "You must be part of this exchange to pay for it");
    }
  }

  const method =
    input.method ??
    (input.recipientId ? ("CREDITS" as const) : ("CARD" as const));

  return prisma.payment.create({
    data: {
      userId,
      recipientId: input.recipientId,
      exchangeId: input.exchangeId,
      amount: input.amount,
      method: method as PaymentMethod,
      description: input.description,
    },
    select: PAYMENT_SELECT,
  });
}

export async function completePayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.userId !== userId) throw new ApiError(403, "Only the payer can complete this payment");
  if (payment.status !== "PENDING") throw new ApiError(409, "Only pending payments can be completed");

  if (payment.method === "CREDITS") {
    if (!payment.recipientId) throw new ApiError(400, "Wallet payment needs a recipient");

    const wallet = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    if ((wallet?.walletBalance ?? 0) < payment.amount) {
      const failed = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
        select: PAYMENT_SELECT,
      });
      throw new ApiError(400, "Insufficient wallet balance", { failed });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payer = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: payment.amount } },
        select: { id: true },
      });
      void payer;
      await tx.user.update({
        where: { id: payment.recipientId! },
        data: { walletBalance: { increment: payment.amount } },
      });
      return tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        select: PAYMENT_SELECT,
      });
    });

    await createNotification({
      userId: payment.recipientId,
      type: "payment",
      title: `You received ${payment.amount} credits`,
      body: payment.description ?? "Payment completed",
      data: { href: "/payments" },
    });
    return result;
  }

  // Top-ups (CARD/MANUAL) are mocked — credit the wallet immediately.
  await prisma.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: payment.amount } },
  });
  return prisma.payment.update({
    where: { id: payment.id },
    data: { status: "COMPLETED", completedAt: new Date() },
    select: PAYMENT_SELECT,
  });
}

export async function refundPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.userId !== userId) throw new ApiError(403, "Only the payer can refund this payment");
  if (payment.status !== "COMPLETED") throw new ApiError(409, "Only completed payments can be refunded");

  const result = await prisma.$transaction(async (tx) => {
    if (payment.method === "CREDITS" && payment.recipientId) {
      await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: payment.amount } } });
      const recipient = await tx.user.findUnique({ where: { id: payment.recipientId } });
      await tx.user.update({
        where: { id: payment.recipientId },
        data: { walletBalance: { decrement: Math.min(payment.amount, recipient?.walletBalance ?? 0) } },
      });
    } else {
      await tx.user.update({ where: { id: userId }, data: { walletBalance: { decrement: payment.amount } } });
    }
    return tx.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED", completedAt: new Date() },
      select: PAYMENT_SELECT,
    });
  });

  // A refund of a material purchase revokes access in the buyer's library.
  if (payment.materialId) {
    await prisma.materialPurchase.deleteMany({ where: { paymentId: payment.id } });
  }

  if (payment.recipientId) {
    await createNotification({
      userId: payment.recipientId,
      type: "payment",
      title: "A payment was refunded",
      body: `${payment.amount} credits returned to the payer`,
      data: { href: "/payments" },
    });
  }
  return result;
}

export async function getPayment(userId: string, paymentId: string) {
  return getOwnedPayment(userId, paymentId);
}