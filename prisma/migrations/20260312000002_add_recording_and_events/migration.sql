-- Migration: Add Recording and SessionEvent tables
-- Created: 2026-03-12

-- Create Recording table
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "url" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recordings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index on sessionId
CREATE UNIQUE INDEX "recordings_sessionId_key" ON "recordings"("sessionId");

-- Create index on status for queries
CREATE INDEX "recordings_status_idx" ON "recordings"("status");

-- Create SessionEvent table
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "communityId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "session_events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for SessionEvent
CREATE INDEX "session_events_sessionId_createdAt_idx" ON "session_events"("sessionId", "createdAt");
CREATE INDEX "session_events_communityId_createdAt_idx" ON "session_events"("communityId", "createdAt");
CREATE INDEX "session_events_type_createdAt_idx" ON "session_events"("type", "createdAt");
