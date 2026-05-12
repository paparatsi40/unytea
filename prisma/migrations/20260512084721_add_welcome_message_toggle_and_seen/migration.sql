-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "showWelcomeMessage" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "welcomeMessageSeen" BOOLEAN NOT NULL DEFAULT false;

