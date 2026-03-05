-- CreateTable
CREATE TABLE "session_feedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_feedback_sessionId_idx" ON "session_feedback"("sessionId");

-- CreateIndex
CREATE INDEX "session_feedback_userId_idx" ON "session_feedback"("userId");

-- CreateIndex
CREATE INDEX "session_feedback_rating_idx" ON "session_feedback"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "session_feedback_sessionId_userId_key" ON "session_feedback"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
