-- Migration: Add communityId to MentorSession table
-- This allows linking sessions to specific communities

-- Add the column as nullable first
ALTER TABLE "mentor_sessions" ADD COLUMN IF NOT EXISTS "communityId" TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "mentor_sessions_communityId_idx" ON "mentor_sessions"("communityId");

-- Note: In production, run this migration via your database provider's console
-- or via prisma migrate deploy after adding this to your migrations folder