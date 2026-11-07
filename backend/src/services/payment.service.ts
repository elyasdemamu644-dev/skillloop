import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import { getPaymentProvider } from "./payment.provider";
import { InsufficientFundsError, TRANSACTION_SELECT, applyWalletEntry } from "./wallet.service";
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

// How long after completion a payer may reverse a transfer. Without a bound,
// a payer could consume the lesson and claw the credits back weeks later.
const REFUND_WINDOW_DAYS = 14;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Wallet summary plus recent ledger entries, so the UI can explain the balance
// instead of just asserting it.
export async function getWallet(userId: string) {
  const [user, credited, debited, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
    prisma.walletTransaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.walletTransaction.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: TRANSACTION_SELECT,
    }),
  ]);
  if (!user) throw new ApiError(404, "User not found");
  return {
    balance: user.walletBalance,
    totalCredited: credited._sum.amount ?? 0,
    totalDebited: Math.abs(debited._sum.amount ?? 0),
    recentTransactions: transactions,
  };
}

export async function listMyTransactions(userId: string, query: unknown) {
  const { page, limit } = paymentListQuerySchema.parse(query);
  const where: Prisma.WalletTransactionWhereInput = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: TRANSACTION_SELECT,
    }),
    prisma.walletTransaction.count({ where }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

  const method: PaymentMethod = input.method ?? (input.recipientId ? "CREDITS" : "CARD");

  if (method === "CREDITS" && !input.recipientId) {
    throw new ApiError(400, "A wallet transfer needs a recipientId");
  }
  if (method !== "CREDITS" && input.recipientId) {
    throw new ApiError(400, "A top-up credits your own wallet and cannot have a recipient");
  }

  if (input.recipientId) {
    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true, isActive: true },
    });
    if (!recipient || !recipient.isActive) throw new ApiError(404, "Recipient not found");
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
    if (input.recipientId) {
      const counterpart = exchange.requesterId === userId ? exchange.providerId : exchange.requesterId;
      if (input.recipientId !== counterpart) {
        throw new ApiError(400, "recipientId must be the other participant of the exchange");
      }
    }
  }

  return prisma.payment.create({
    data: {
      userId,
      recipientId: input.recipientId,
      exchangeId: input.exchangeId,
      amount: input.amount,
      method,
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
  if (payment.method === "CREDITS" && !payment.recipientId) {
    throw new ApiError(400, "A wallet payment needs a recipient");
  }

  let recipientId: string | null = null;

  // Authorise a real charge through the provider boundary before touching the
  // ledger. `payment.id` is the idempotency key, so retrying this request can
  // never charge twice even though authorisation happens outside the
  // transaction. Wallet transfers never reach the provider.
  const provider = getPaymentProvider();
  const charge =
    payment.method === "CREDITS"
      ? null
      : await provider.chargeTopUp({
          paymentId: payment.id,
          userId: payment.userId,
          amount: payment.amount,
        });

  const outcome = await prisma.$transaction(async (tx) => {
    // Claim the payment atomically. A concurrent duplicate request fails this
    // guard instead of crediting the same payment twice.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return { kind: "conflict" as const };

    if (payment.method === "CREDITS") {
      try {
        await applyWalletEntry(tx, {
          userId: payment.userId,
          type: "TRANSFER_OUT",
          amount: -payment.amount,
          paymentId: payment.id,
          description: payment.description ?? "Transfer to your teacher",
        });
      } catch (error) {
        if (error instanceof InsufficientFundsError) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          return { kind: "insufficient" as const };
        }
        throw error;
      }

      await applyWalletEntry(tx, {
        userId: payment.recipientId!,
        type: "TRANSFER_IN",
        amount: payment.amount,
        paymentId: payment.id,
        description: payment.description ?? "Transfer from your learner",
      });
      recipientId = payment.recipientId!;
    } else {
      // Top-ups (CARD/MANUAL) are simulated: no PSP is involved, so completing
      // one credits the wallet. The provider boundary lives in payment.provider.
      await applyWalletEntry(tx, {
        userId: payment.userId,
        type: "TOP_UP",
        amount: payment.amount,
        paymentId: payment.id,
        description: payment.description ?? "Wallet top-up",
      });
    }

    const completed = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        provider: charge ? provider.name : null,
        providerRef: charge?.providerRef ?? null,
      },
      select: PAYMENT_SELECT,
    });
    return { kind: "ok" as const, payment: completed };
  });

  if (outcome.kind === "conflict") throw new ApiError(409, "This payment has already been processed");
  if (outcome.kind === "insufficient") {
    throw new ApiError(400, "Insufficient wallet balance. Top up in Payments first.");
  }

  if (recipientId) {
    await createNotification({
      userId: recipientId,
      type: "payment",
      title: `You received ${payment.amount} credits`,
      body: payment.description ?? "Payment completed",
      data: { href: "/payments" },
    });
  }

  return outcome.payment;
}

export async function refundPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.userId !== userId) throw new ApiError(403, "Only the payer can refund this payment");
  if (payment.status !== "COMPLETED") throw new ApiError(409, "Only completed payments can be refunded");
  if (payment.completedAt && Date.now() - payment.completedAt.getTime() > REFUND_WINDOW_MS) {
    throw new ApiError(409, `Refunds are only available within ${REFUND_WINDOW_DAYS} days of a payment`);
  }

  // Reverse the provider charge first (no-op for wallet transfers and for the
  // fake provider). Provider refunds are idempotent per reference.
  if (payment.method !== "CREDITS") {
    await getPaymentProvider().refundTopUp({
      providerRef: payment.providerRef ?? payment.id,
      amount: payment.amount,
    });
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "COMPLETED" },
      data: { status: "REFUNDING" },
    });
    if (claimed.count !== 1) return { kind: "conflict" as const };

    if (payment.method === "CREDITS" && payment.recipientId) {
      // Reverse the transfer exactly. The recipient may already have spent the
      // credits, so their balance is allowed to go negative: that is honest
      // bookkeeping and keeps the total supply of credits constant. The old
      // implementation clamped this with Math.min(), which silently created
      // credits that were never paid for.
      await applyWalletEntry(tx, {
        userId: payment.recipientId,
        type: "REFUND_OUT",
        amount: -payment.amount,
        paymentId: payment.id,
        allowNegative: true,
        description: "Transfer reversed by refund",
      });
      await applyWalletEntry(tx, {
        userId: payment.userId,
        type: "REFUND_IN",
        amount: payment.amount,
        paymentId: payment.id,
        description: payment.description ?? "Payment refunded",
      });
    } else {
      // Reversing a simulated top-up withdraws what was credited.
      await applyWalletEntry(tx, {
        userId: payment.userId,
        type: "REFUND_OUT",
        amount: -payment.amount,
        paymentId: payment.id,
        allowNegative: true,
        description: "Top-up reversed",
      });
    }

    const refunded = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
      select: PAYMENT_SELECT,
    });
    return { kind: "ok" as const, payment: refunded };
  });

  if (outcome.kind === "conflict") throw new ApiError(409, "This payment has already been refunded");

  // A refund of a material purchase revokes access in the buyer's library.
  if (payment.materialId) {
    await prisma.materialPurchase.deleteMany({ where: { paymentId: payment.id } });
  }

  if (payment.recipientId) {
    await createNotification({
      userId: payment.recipientId,
      type: "payment",
      title: "A payment was refunded",
      body: `${payment.amount} credits were returned to the payer`,
      data: { href: "/payments" },
    });
  }

  return outcome.payment;
}

export async function getPayment(userId: string, paymentId: string) {
  return getOwnedPayment(userId, paymentId);
}
