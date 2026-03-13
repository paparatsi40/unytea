-- Migration: Add mode (VIDEO/AUDIO) field to sessions
-- Created: 2026-03-12 00:00:00

-- Add SessionMode enum type
CREATE TYPE "SessionMode" AS ENUM ('VIDEO', 'AUDIO');

-- Add mode column to MentorSession table
ALTER TABLE "mentor_sessions" 
ADD COLUMN "mode" "SessionMode" DEFAULT 'VIDEO';

-- Add mode column to SessionSeries table  
ALTER TABLE "session_series"
ADD COLUMN "mode" "SessionMode" DEFAULT 'VIDEO';

-- Make mode non-nullable after setting defaults
ALTER TABLE "mentor_sessions" 
ALTER COLUMN "mode" SET NOT NULL;

ALTER TABLE "session_series"
ALTER COLUMN "mode" SET NOT NULL;

-- Add index for mode queries
CREATE INDEX "mentor_sessions_mode_idx" ON "mentor_sessions"("mode");
CREATE INDEX "session_series_mode_idx" ON "session_series"("mode");
