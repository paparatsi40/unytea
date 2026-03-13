-- Complete SQL to create mentor_sessions table in Supabase
-- Run this in Supabase SQL Editor

-- First, create the enum type for session status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sessionstatus') THEN
    CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- Create the mentor_sessions table
CREATE TABLE IF NOT EXISTS "mentor_sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "meetingUrl" TEXT,
  "roomId" TEXT,
  "recordingUrl" TEXT,
  "videoRoomName" TEXT,
  "status" "SessionStatus" DEFAULT 'SCHEDULED',
  "mentorNotes" TEXT,
  "menteeNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "mentorId" TEXT NOT NULL,
  "menteeId" TEXT NOT NULL,
  "communityId" TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "mentor_sessions_mentorId_idx" ON "mentor_sessions"("mentorId");
CREATE INDEX IF NOT EXISTS "mentor_sessions_menteeId_idx" ON "mentor_sessions"("menteeId");
CREATE INDEX IF NOT EXISTS "mentor_sessions_communityId_idx" ON "mentor_sessions"("communityId");
CREATE INDEX IF NOT EXISTS "mentor_sessions_scheduledAt_idx" ON "mentor_sessions"("scheduledAt");
CREATE INDEX IF NOT EXISTS "mentor_sessions_status_idx" ON "mentor_sessions"("status");

-- Note: Foreign keys to User and Community tables are commented out 
-- because those tables may not exist in your Supabase schema.
-- If they exist, uncomment these:

-- ALTER TABLE "mentor_sessions" 
--   ADD CONSTRAINT "mentor_sessions_mentorId_fkey" 
--   FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE;

-- ALTER TABLE "mentor_sessions" 
--   ADD CONSTRAINT "mentor_sessions_menteeId_fkey" 
--   FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE;

-- ALTER TABLE "mentor_sessions" 
--   ADD CONSTRAINT "mentor_sessions_communityId_fkey" 
--   FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL;