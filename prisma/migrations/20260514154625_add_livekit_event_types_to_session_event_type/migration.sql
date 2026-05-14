-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionEventType" ADD VALUE 'ROOM_STARTED';
ALTER TYPE "SessionEventType" ADD VALUE 'ROOM_FINISHED';
ALTER TYPE "SessionEventType" ADD VALUE 'PARTICIPANT_JOINED';
ALTER TYPE "SessionEventType" ADD VALUE 'PARTICIPANT_LEFT';
ALTER TYPE "SessionEventType" ADD VALUE 'EGRESS_STARTED';
ALTER TYPE "SessionEventType" ADD VALUE 'EGRESS_UPDATED';
ALTER TYPE "SessionEventType" ADD VALUE 'EGRESS_ENDED';
ALTER TYPE "SessionEventType" ADD VALUE 'POST_PROCESSING_TRIGGERED';

