import { Prisma, WalletTransactionType } from "@prisma/client";

// Thrown inside a transaction when a debit would overdraw a guarded wallet.
// Callers translate it into a 400 (or a FAILED payment) as appropriate.
export class InsufficientFundsError extends Error {}

export const TRANSACTION_SELECT = {
  id: true,
  type: true,
  amount: true,
  balanceAfter: true,
  description: true,
  paymentId: true,
  createdAt: true,
} as const;

export interface WalletEntryInput {
  userId: string;
  type: WalletTransactionType;
  amount: number; // signed: positive credits, negative debits
  paymentId?: string | null;
  description?: string | null;
  /**
   * Debits normally fail when the balance is too low. Set this for reversals,
   * where the counterparty may have already spent the credits: letting the
   * balance go negative keeps the books honest and the total supply of credits
   * constant, instead of quietly creating credits from nothing.
   */
  allowNegative?: boolean;
}

/**
 * The single place a wallet balance ever changes.
 *
 * Every movement writes a ledger row recording the resulting balance, so the
 * wallet is reconcilable and its history explains itself. The debit guard is
 * part of the UPDATE statement itself — the check and the write are one atomic
 * operation, which is what makes concurrent requests safe.
 */
export async function applyWalletEntry(tx: Prisma.TransactionClient, input: WalletEntryInput) {
  const needsFunds = input.amount < 0 && !input.allowNegative;

  const updated = await tx.user.updateMany({
    where: {
      id: input.userId,
      ...(needsFunds ? { walletBalance: { gte: -input.amount } } : {}),
    },
    data: { walletBalance: { increment: input.amount } },
  });
  if (updated.count === 0) {
    throw new InsufficientFundsError();
  }

  // Safe to read here: this transaction holds the row lock taken by the update
  // above, so no concurrent transaction can change the balance in between.
  const account = await tx.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { walletBalance: true },
  });

  return tx.walletTransaction.create({
    data: {
      userId: input.userId,
      paymentId: input.paymentId ?? null,
      type: input.type,
      amount: input.amount,
      balanceAfter: account.walletBalance,
      description: input.description ?? null,
    },
    select: TRANSACTION_SELECT,
  });
}
