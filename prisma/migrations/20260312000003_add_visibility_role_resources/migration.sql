-- Migration: Add session visibility, participation role, duration, and session resources
-- Created: 2026-03-12

-- Add visibility column to MentorSession
ALTER TABLE "mentor_sessions" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'community';

-- Add role and durationSeconds to SessionParticipation
ALTER TABLE "session_participations" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'listener';
ALTER TABLE "session_participations" ADD COLUMN "durationSeconds" INTEGER;

-- Create indexes for new columns
CREATE INDEX "mentor_sessions_visibility_idx" ON "mentor_sessions"("visibility");
CREATE INDEX "session_participations_role_idx" ON "session_participations"("role");

-- Create SessionResource table
CREATE TABLE "session_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "session_resources_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "session_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for SessionResource
CREATE INDEX "session_resources_sessionId_idx" ON "session_resources"("sessionId");
CREATE INDEX "session_resources_type_idx" ON "session_resources"("type");
CREATE INDEX "session_resources_createdById_idx" ON "session_resources"("createdById");
