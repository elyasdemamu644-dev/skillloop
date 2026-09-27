-- Phase 6: skill exchange requests.
CREATE TYPE "ExchangeStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'COMPLETED');

CREATE TABLE "skill_exchanges" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ExchangeStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "skill_exchanges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_exchanges_requesterId_offeringId_key" ON "skill_exchanges"("requesterId", "offeringId");
CREATE INDEX "skill_exchanges_providerId_status_idx" ON "skill_exchanges"("providerId", "status");
CREATE INDEX "skill_exchanges_requesterId_status_idx" ON "skill_exchanges"("requesterId", "status");
ALTER TABLE "skill_exchanges" ADD CONSTRAINT "skill_exchanges_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_exchanges" ADD CONSTRAINT "skill_exchanges_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_exchanges" ADD CONSTRAINT "skill_exchanges_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "skill_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;