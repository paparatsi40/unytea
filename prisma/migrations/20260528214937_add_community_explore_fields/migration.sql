-- CreateEnum
CREATE TYPE "CommunityCategory" AS ENUM ('BUSINESS_ENTREPRENEURSHIP', 'MARKETING_SALES', 'TECH_PROGRAMMING', 'AI_DATA_SCIENCE', 'HEALTH_WELLNESS', 'FITNESS_SPORTS', 'COOKING_NUTRITION', 'PHOTOGRAPHY', 'ART_DESIGN', 'MUSIC', 'WRITING_PUBLISHING', 'EDUCATION_LANGUAGES', 'PERSONAL_FINANCE', 'TRAVEL', 'PARENTING_FAMILY', 'SPIRITUALITY_MINDFULNESS', 'GAMING', 'CRAFTS_DIY', 'BOOKS_READING', 'OTHER');

-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "category" "CommunityCategory",
ADD COLUMN     "excludeFromExplore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT DEFAULT 'en';

-- CreateIndex
CREATE INDEX "communities_category_idx" ON "communities"("category");

-- CreateIndex
CREATE INDEX "communities_language_idx" ON "communities"("language");

-- CreateIndex
CREATE INDEX "communities_excludeFromExplore_idx" ON "communities"("excludeFromExplore");
