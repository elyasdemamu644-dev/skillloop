-- Phase 5: public skill offerings.
CREATE TYPE "OfferingMode" AS ENUM ('ONLINE', 'IN_PERSON', 'BOTH');

CREATE TABLE "skill_offerings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "mode" "OfferingMode" NOT NULL DEFAULT 'ONLINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "skill_offerings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "skill_offerings_skillId_isActive_idx" ON "skill_offerings"("skillId", "isActive");
CREATE INDEX "skill_offerings_userId_idx" ON "skill_offerings"("userId");
ALTER TABLE "skill_offerings" ADD CONSTRAINT "skill_offerings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_offerings" ADD CONSTRAINT "skill_offerings_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;