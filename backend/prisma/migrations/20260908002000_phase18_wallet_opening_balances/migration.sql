-- Balances created before the ledger existed have no wallet_transactions rows,
-- so the ledger would not explain the balance. Record an opening ADJUSTMENT for
-- every user whose non-zero balance is not backed by an entry yet. Runs once:
-- users with any ledger row are skipped.
INSERT INTO "wallet_transactions"
  ("id", "userId", "type", "amount", "balanceAfter", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || u."id"),
  u."id",
  'ADJUSTMENT',
  u."walletBalance",
  u."walletBalance",
  'Opening balance recorded when the wallet ledger was introduced',
  now()
FROM "users" u
WHERE u."walletBalance" <> 0
  AND NOT EXISTS (
    SELECT 1 FROM "wallet_transactions" wt WHERE wt."userId" = u."id"
  );
