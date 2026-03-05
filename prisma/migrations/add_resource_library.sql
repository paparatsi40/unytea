-- ============================================
-- RESOURCE LIBRARY - MIGRACIÓN SQL
-- Compatible con PostgreSQL / Supabase
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

-- Crear enum ResourceType si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resourcetype') THEN
        CREATE TYPE "ResourceType" AS ENUM ('AUDIO', 'VIDEO', 'DOCUMENT', 'LINK');
    END IF;
END $$;

-- Crear enum ResourceStatus si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resourcestatus') THEN
        CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    END IF;
END $$;

-- ============================================
-- 2. TABLAS
-- ============================================

-- Tabla: ResourceCategory
CREATE TABLE IF NOT EXISTS "resource_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "resource_categories_pkey" PRIMARY KEY ("id")
);

-- Tabla: Resource
CREATE TABLE IF NOT EXISTS "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "requiredLevel" INTEGER,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    
    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- Tabla: ResourceProgress
CREATE TABLE IF NOT EXISTS "resource_progress" (
    "id" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentTime" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- Tabla: ResourceLike
CREATE TABLE IF NOT EXISTS "resource_likes" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "resource_likes_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 3. ÍNDICES ÚNICOS
-- ============================================

-- Índice único para categorías (community + slug)
CREATE UNIQUE INDEX IF NOT EXISTS "resource_categories_communityId_slug_key" 
ON "resource_categories" ("communityId", "slug");

-- Índice único para recursos (community + slug)
CREATE UNIQUE INDEX IF NOT EXISTS "resources_communityId_slug_key" 
ON "resources" ("communityId", "slug");

-- Índice único para progreso (resource + user)
CREATE UNIQUE INDEX IF NOT EXISTS "resource_progress_resourceId_userId_key" 
ON "resource_progress" ("resourceId", "userId");

-- Índice único para likes (resource + user)
CREATE UNIQUE INDEX IF NOT EXISTS "resource_likes_resourceId_userId_key" 
ON "resource_likes" ("resourceId", "userId");

-- ============================================
-- 4. ÍNDICES DE PERFORMANCE
-- ============================================

-- Índices para ResourceCategory
CREATE INDEX IF NOT EXISTS "resource_categories_communityId_idx" ON "resource_categories" ("communityId");
CREATE INDEX IF NOT EXISTS "resource_categories_position_idx" ON "resource_categories" ("position");

-- Índices para Resource
CREATE INDEX IF NOT EXISTS "resources_communityId_type_idx" ON "resources" ("communityId", "type");
CREATE INDEX IF NOT EXISTS "resources_categoryId_idx" ON "resources" ("categoryId");
CREATE INDEX IF NOT EXISTS "resources_status_publishedAt_idx" ON "resources" ("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "resources_authorId_idx" ON "resources" ("authorId");

-- Índices para ResourceProgress
CREATE INDEX IF NOT EXISTS "resource_progress_userId_updatedAt_idx" ON "resource_progress" ("userId", "updatedAt");

-- Índices para ResourceLike
CREATE INDEX IF NOT EXISTS "resource_likes_resourceId_idx" ON "resource_likes" ("resourceId");
CREATE INDEX IF NOT EXISTS "resource_likes_userId_idx" ON "resource_likes" ("userId");

-- ============================================
-- 5. FOREIGN KEYS
-- ============================================

-- ResourceCategory -> Community
ALTER TABLE "resource_categories" 
ADD CONSTRAINT "resource_categories_communityId_fkey" 
FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Resource -> Community
ALTER TABLE "resources" 
ADD CONSTRAINT "resources_communityId_fkey" 
FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Resource -> User (author)
ALTER TABLE "resources" 
ADD CONSTRAINT "resources_authorId_fkey" 
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Resource -> ResourceCategory
ALTER TABLE "resources" 
ADD CONSTRAINT "resources_categoryId_fkey" 
FOREIGN KEY ("categoryId") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResourceProgress -> Resource
ALTER TABLE "resource_progress" 
ADD CONSTRAINT "resource_progress_resourceId_fkey" 
FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ResourceProgress -> User
ALTER TABLE "resource_progress" 
ADD CONSTRAINT "resource_progress_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ResourceLike -> Resource
ALTER TABLE "resource_likes" 
ADD CONSTRAINT "resource_likes_resourceId_fkey" 
FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ResourceLike -> User
ALTER TABLE "resource_likes" 
ADD CONSTRAINT "resource_likes_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 6. VERIFICACIÓN
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 'Tablas creadas:' as status, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('resource_categories', 'resources', 'resource_progress', 'resource_likes');
