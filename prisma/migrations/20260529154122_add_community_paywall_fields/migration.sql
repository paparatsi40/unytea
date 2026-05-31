-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "paywallLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paywallLockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "communities_paywallLocked_idx" ON "communities"("paywallLocked");
