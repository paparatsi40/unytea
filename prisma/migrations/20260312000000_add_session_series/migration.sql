-- Migration: Add session_series and update MentorSession for recurring sessions
-- Created: 2026-03-12

-- Create session_series table
CREATE TABLE "session_series" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    "communityId" TEXT,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPostToFeed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for session_series
CREATE INDEX "session_series_communityId_idx" ON "session_series"("communityId");
CREATE INDEX "session_series_hostId_idx" ON "session_series"("hostId");
CREATE INDEX "session_series_isActive_idx" ON "session_series"("isActive");

-- Add foreign keys for session_series
ALTER TABLE "session_series" ADD CONSTRAINT "session_series_communityId_fkey" 
    FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_series" ADD CONSTRAINT "session_series_hostId_fkey" 
    FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add seriesId to mentor_sessions
ALTER TABLE "mentor_sessions" ADD COLUMN "seriesId" TEXT;

-- Add new fields to mentor_sessions for status tracking
-- Note: status already exists as SessionStatus enum
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT;
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "notesId" TEXT;
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "feedPostId" TEXT;
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "attendeeCount" INTEGER DEFAULT 0;
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "isException" BOOLEAN DEFAULT false;
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "exceptionData" JSONB;

-- Create index for seriesId
CREATE INDEX "mentor_sessions_seriesId_idx" ON "mentor_sessions"("seriesId");

-- Add foreign key for seriesId
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_seriesId_fkey" 
    FOREIGN KEY ("seriesId") REFERENCES "session_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create unique constraint for notesId if it references session_notes
-- ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_notesId_fkey" 
--     FOREIGN KEY ("notesId") REFERENCES "session_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing enum if needed
-- SessionStatus already has: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
-- We might want to add 'LIVE' status, but for now we can use IN_PROGRESS
