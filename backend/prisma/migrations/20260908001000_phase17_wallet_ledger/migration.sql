-- Two transient payment states so a completion/refund can be claimed
-- atomically: a single request moves PENDING -> PROCESSING (or
-- COMPLETED -> REFUNDING), so a concurrent request fails the guard instead of
-- double-crediting or double-debiting a wallet.
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDING';

-- Provider reference for top-ups, so a refund can find the original charge.
ALTER TABLE "payments" ADD COLUMN "provider" TEXT;
ALTER TABLE "payments" ADD COLUMN "providerRef" TEXT;

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOP_UP', 'TRANSFER_OUT', 'TRANSFER_IN', 'REFUND_OUT', 'REFUND_IN', 'MATERIAL_PURCHASE', 'MATERIAL_SALE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_createdAt_idx" ON "wallet_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_paymentId_idx" ON "wallet_transactions"("paymentId");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
