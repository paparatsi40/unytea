-- CreateTable
CREATE TABLE "session_participations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "eventsData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_participations_sessionId_idx" ON "session_participations"("sessionId");

-- CreateIndex
CREATE INDEX "session_participations_userId_idx" ON "session_participations"("userId");

-- CreateIndex
CREATE INDEX "session_participations_joinedAt_idx" ON "session_participations"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_participations_sessionId_userId_key" ON "session_participations"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "session_participations" ADD CONSTRAINT "session_participations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participations" ADD CONSTRAINT "session_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
