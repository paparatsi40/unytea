-- CreateTable
CREATE TABLE "csp_violations" (
    "id" TEXT NOT NULL,
    "directive" TEXT NOT NULL,
    "blockedUri" TEXT NOT NULL,
    "documentUri" TEXT,
    "sourceFile" TEXT,
    "lineNumber" INTEGER,
    "columnNumber" INTEGER,
    "userAgent" TEXT,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csp_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csp_violations_directive_createdAt_idx" ON "csp_violations"("directive", "createdAt");

-- CreateIndex
CREATE INDEX "csp_violations_blockedUri_idx" ON "csp_violations"("blockedUri");

-- CreateIndex
CREATE INDEX "csp_violations_createdAt_idx" ON "csp_violations"("createdAt");

