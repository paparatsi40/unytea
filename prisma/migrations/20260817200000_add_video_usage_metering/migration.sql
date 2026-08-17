-- Participant-hour metering, step A: the counter only. Nothing user-facing
-- reads these tables yet.
--
-- PURELY ADDITIVE. Two CREATE TABLEs and their indexes. No ALTER on any
-- existing table, no column added to a populated one, no NOT NULL without a
-- default, no data moved, nothing dropped. It cannot fail on existing rows
-- because it does not touch them — which matters, because this auto-applies to
-- production on merge.
--
-- `session_participations.livekitIdentity` already exists with its unique
-- index, so the identity fix needs no schema change at all.

-- CreateTable
CREATE TABLE "community_video_usage" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "usedSeconds" INTEGER NOT NULL DEFAULT 0,
    "warnedAt80" TIMESTAMP(3),
    "warnedAt100" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_video_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_usage_accruals" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "exactSeconds" INTEGER NOT NULL,
    "approxSeconds" INTEGER NOT NULL,
    "appliedSeconds" INTEGER NOT NULL,
    "basis" TEXT NOT NULL,
    "attendeeCount" INTEGER NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "accruedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_usage_accruals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_video_usage_communityId_idx" ON "community_video_usage"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "community_video_usage_communityId_periodStart_key" ON "community_video_usage"("communityId", "periodStart");

-- CreateIndex: the structural idempotency guarantee. Three triggers converge on
-- one session; the second and third are refused here, not by a code check.
CREATE UNIQUE INDEX "session_usage_accruals_sessionId_key" ON "session_usage_accruals"("sessionId");

-- CreateIndex
CREATE INDEX "session_usage_accruals_communityId_idx" ON "session_usage_accruals"("communityId");

-- CreateIndex
CREATE INDEX "session_usage_accruals_usageId_idx" ON "session_usage_accruals"("usageId");

-- AddForeignKey
ALTER TABLE "community_video_usage" ADD CONSTRAINT "community_video_usage_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_usage_accruals" ADD CONSTRAINT "session_usage_accruals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_usage_accruals" ADD CONSTRAINT "session_usage_accruals_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "community_video_usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
