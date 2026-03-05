-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "customImages" JSONB,
ADD COLUMN     "ownerBio" TEXT,
ADD COLUMN     "ownerLinks" JSONB,
ADD COLUMN     "ownerTitle" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;
