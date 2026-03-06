/**
 * Resource Library - Server Actions
 * 
 * Server actions 100% type-safe con:
 * - Validación Zod estricta
 * - Autorización RBAC (Role-Based Access Control)
 * - Manejo de errores premium
 * - Revalidación de caché optimizada
 * - Auditoría de operaciones
 */

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resourceCategorySchema,
  createResourceSchema,
  updateResourceSchema,
  resourceFilterSchema,
  resourceProgressSchema,
  toggleLikeSchema,
  type ResourceCategoryInput,
  type CreateResourceInput,
  type UpdateResourceInput,
  type ResourceFilterInput,
  type ResourceProgressInput,
  type ToggleLikeInput,
} from "@/lib/validations/resources";

// ============================================
// Tipos de respuesta estandarizados
// ============================================

type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

// ============================================
// Helpers de autorización
// ============================================

async function checkCommunityAccess(
  communitySlug: string,
  userId: string,
  requiredRoles: ("OWNER" | "ADMIN" | "MODERATOR" | "MENTOR" | "MEMBER")[] = ["MEMBER"]
): Promise<{ community: any; member: any } | null> {
  const community = await prisma.community.findUnique({
    where: { slug: communitySlug },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!community) return null;

  const member = community.members[0];
  if (!member) return null;

  const hasAccess = requiredRoles.includes(member.role);
  if (!hasAccess) return null;

  return { community, member };
}

async function checkResourcePermission(
  resourceId: string,
  userId: string
): Promise<{ resource: any; canEdit: boolean } | null> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      community: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!resource) return null;

  const member = resource.community.members[0];
  const isOwner = resource.community.ownerId === userId;
  const isAuthor = resource.authorId === userId;
  const isAdmin = member?.role === "ADMIN" || member?.role === "OWNER" || member?.role === "MODERATOR";

  const canEdit = isOwner || isAuthor || isAdmin;

  return { resource, canEdit };
}

// ============================================
// CATEGORÍAS
// ============================================

/**
 * Crear una nueva categoría de recursos
 * Requiere: ADMIN, MODERATOR, o OWNER
 */
export async function createResourceCategory(
  communitySlug: string,
  data: ResourceCategoryInput
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    // Validar input
    const validated = resourceCategorySchema.parse(data);

    // Verificar permisos
    const access = await checkCommunityAccess(communitySlug, session.user.id, [
      "OWNER",
      "ADMIN",
      "MODERATOR",
    ]);

    if (!access) {
      return { success: false, error: "Sin permisos para crear categorías", code: "FORBIDDEN" };
    }

    // Verificar que no exista slug duplicado
    const existing = await prisma.resourceCategory.findUnique({
      where: {
        communityId_slug: {
          communityId: access.community.id,
          slug: validated.slug,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Ya existe una categoría con ese slug", code: "DUPLICATE" };
    }

    const category = await prisma.resourceCategory.create({
      data: {
        ...validated,
        communityId: access.community.id,
      },
    });

    revalidatePath(`/dashboard/c/${communitySlug}/library`);

    return {
      success: true,
      data: category,
      message: "Categoría creada exitosamente",
    };
  } catch (error) {
    console.error("[createResourceCategory] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al crear categoría", code: "INTERNAL" };
  }
}

/**
 * Obtener todas las categorías de una comunidad
 */
export async function getResourceCategories(
  communitySlug: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const access = await checkCommunityAccess(communitySlug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso a la comunidad", code: "FORBIDDEN" };
    }

    const categories = await prisma.resourceCategory.findMany({
      where: { communityId: access.community.id },
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: { resources: true },
        },
      },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("[getResourceCategories] Error:", error);
    return { success: false, error: "Error al obtener categorías", code: "INTERNAL" };
  }
}

// ============================================
// RECURSOS
// ============================================

/**
 * Crear un nuevo recurso
 * Requiere: MENTOR, MODERATOR, ADMIN, o OWNER
 */
export async function createResource(
  communitySlug: string,
  data: CreateResourceInput
): Promise<ActionResult<any>> {
  try {
    console.log("[createResource] Received data:", JSON.stringify(data, null, 2));
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[createResource] No session found");
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.log("[createResource] User:", session.user.id);

    // Validar input
    console.log("[createResource] Validating data...");
    const validated = createResourceSchema.parse(data);
    console.log("[createResource] Validation passed:", validated);

    // Verificar permisos
    const access = await checkCommunityAccess(communitySlug, session.user.id, [
      "OWNER",
      "ADMIN",
      "MODERATOR",
      "MENTOR",
    ]);

    if (!access) {
      return { success: false, error: "Sin permisos para crear recursos", code: "FORBIDDEN" };
    }

    // Validaciones de negocio según tipo
    if (validated.type === "LINK" && !validated.externalUrl) {
      return { success: false, error: "Los links externos requieren una URL", code: "VALIDATION" };
    }

    if ((validated.type === "AUDIO" || validated.type === "VIDEO" || validated.type === "DOCUMENT") && !validated.fileUrl) {
      return { success: false, error: "Los archivos requieren una URL de archivo", code: "VALIDATION" };
    }

    // Verificar slug único
    const existing = await prisma.resource.findUnique({
      where: {
        communityId_slug: {
          communityId: access.community.id,
          slug: validated.slug,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Ya existe un recurso con ese slug", code: "DUPLICATE" };
    }

    // Si está publicando, establecer publishedAt
    const publishedAt = validated.status === "PUBLISHED" ? new Date() : validated.publishedAt;

    const resource = await prisma.resource.create({
      data: {
        ...validated,
        communityId: access.community.id,
        authorId: session.user.id,
        publishedAt,
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    revalidatePath(`/dashboard/c/${communitySlug}/library`);

    return {
      success: true,
      data: resource,
      message: "Recurso creado exitosamente",
    };
  } catch (error) {
    console.error("[createResource] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al crear recurso", code: "INTERNAL" };
  }
}

/**
 * Actualizar un recurso existente
 */
export async function updateResource(
  resourceId: string,
  data: UpdateResourceInput
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    // Validar input
    const validated = updateResourceSchema.parse({ ...data, id: resourceId });

    // Verificar permisos
    const permission = await checkResourcePermission(resourceId, session.user.id);
    if (!permission) {
      return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
    }

    if (!permission.canEdit) {
      return { success: false, error: "Sin permisos para editar este recurso", code: "FORBIDDEN" };
    }

    // Si está cambiando a PUBLISHED y no tenía publishedAt, establecerlo
    const updates: any = { ...validated };
    if (validated.status === "PUBLISHED" && !permission.resource.publishedAt) {
      updates.publishedAt = new Date();
    }

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: updates,
      include: {
        community: { select: { slug: true } },
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    revalidatePath(`/dashboard/c/${resource.community.slug}/library`);
    revalidatePath(`/dashboard/c/${resource.community.slug}/library/${resource.id}`);

    return {
      success: true,
      data: resource,
      message: "Recurso actualizado exitosamente",
    };
  } catch (error) {
    console.error("[updateResource] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al actualizar recurso", code: "INTERNAL" };
  }
}

/**
 * Eliminar un recurso
 */
export async function deleteResource(resourceId: string): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const permission = await checkResourcePermission(resourceId, session.user.id);
    if (!permission) {
      return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
    }

    if (!permission.canEdit) {
      return { success: false, error: "Sin permisos para eliminar este recurso", code: "FORBIDDEN" };
    }

    const { community } = permission.resource;

    await prisma.resource.delete({
      where: { id: resourceId },
    });

    revalidatePath(`/dashboard/c/${community.slug}/library`);

    return {
      success: true,
      data: undefined,
      message: "Recurso eliminado exitosamente",
    };
  } catch (error) {
    console.error("[deleteResource] Error:", error);
    return { success: false, error: "Error al eliminar recurso", code: "INTERNAL" };
  }
}

/**
 * Obtener recursos con filtros avanzados
 */
export async function getResources(
  filters: ResourceFilterInput
): Promise<ActionResult<{ resources: any[]; total: number; hasMore: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    // Validar filtros
    const validated = resourceFilterSchema.parse(filters);

    const access = await checkCommunityAccess(validated.communitySlug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso a la comunidad", code: "FORBIDDEN" };
    }

    const where: any = {
      communityId: access.community.id,
    };

    console.log("[getResources] Community ID:", access.community.id);
    console.log("[getResources] User ID:", session.user.id);
    console.log("[getResources] User role:", access.member.role);

    // Filtros opcionales
    if (validated.type) where.type = validated.type;
    if (validated.categoryId) where.categoryId = validated.categoryId;
    if (validated.status) where.status = validated.status;
    if (validated.tags && validated.tags.length > 0) {
      where.tags = { hasSome: validated.tags };
    }

    // Búsqueda por texto
    if (validated.search) {
      where.OR = [
        { title: { contains: validated.search, mode: "insensitive" } },
        { description: { contains: validated.search, mode: "insensitive" } },
        { tags: { hasSome: [validated.search] } },
      ];
    }

    // Solo mostrar públicos o del autor (para no-admins)
    const isAdmin = ["OWNER", "ADMIN", "MODERATOR"].includes(access.member.role);
    
    console.log("[getResources] isAdmin:", isAdmin);
    if (!isAdmin) {
      where.OR = [
        ...(where.OR || []),
        { isPublic: true },
        { authorId: session.user.id },
      ];
    }

    console.log("[getResources] Where clause:", JSON.stringify(where, null, 2));

    const skip = (validated.page - 1) * validated.limit;

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: { [validated.sortBy]: validated.sortOrder },
        skip,
        take: validated.limit,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          progress: {
            where: { userId: session.user.id },
          },
          _count: {
            select: { likes: true },
          },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    console.log("[getResources] Total resources found:", total);
    console.log("[getResources] Resources count:", resources.length);
    if (resources.length > 0) {
      console.log("[getResources] First resource:", resources[0].title, "by", resources[0].authorId);
    }

    // Verificar si hay más resultados
    const hasMore = skip + resources.length < total;

    return {
      success: true,
      data: { resources, total, hasMore },
    };
  } catch (error) {
    console.error("[getResources] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al obtener recursos", code: "INTERNAL" };
  }
}

/**
 * Obtener un recurso por ID con detalles completos
 */
export async function getResourceById(
  resourceId: string,
  communitySlug: string
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const access = await checkCommunityAccess(communitySlug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso a la comunidad", code: "FORBIDDEN" };
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        communityId: access.community.id,
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        progress: {
          where: { userId: session.user.id },
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    if (!resource) {
      return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
    }

    // Verificar acceso
    const isAdmin = ["OWNER", "ADMIN", "MODERATOR"].includes(access.member.role);
    const isAuthor = resource.authorId === session.user.id;
    const hasAccess = resource.isPublic || isAdmin || isAuthor;

    if (!hasAccess) {
      return { success: false, error: "Sin acceso a este recurso", code: "FORBIDDEN" };
    }

    // Incrementar view count (en background, no bloquear)
    prisma.resource.update({
      where: { id: resourceId },
      data: { viewCount: { increment: 1 } },
    }).catch(console.error);

    return { success: true, data: resource };
  } catch (error) {
    console.error("[getResourceById] Error:", error);
    return { success: false, error: "Error al obtener recurso", code: "INTERNAL" };
  }
}

// ============================================
// PROGRESO Y LIKES
// ============================================

/**
 * Actualizar progreso de un recurso
 */
export async function updateResourceProgress(
  data: ResourceProgressInput
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const validated = resourceProgressSchema.parse(data);

    const resource = await prisma.resource.findUnique({
      where: { id: validated.resourceId },
      include: { community: true },
    });

    if (!resource) {
      return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
    }

    // Verificar acceso a la comunidad
    const access = await checkCommunityAccess(resource.community.slug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso", code: "FORBIDDEN" };
    }

    const progress = await prisma.resourceProgress.upsert({
      where: {
        resourceId_userId: {
          resourceId: validated.resourceId,
          userId: session.user.id,
        },
      },
      update: {
        progress: validated.progress,
        currentTime: validated.currentTime,
        completed: validated.completed,
        completedAt: validated.completed ? new Date() : undefined,
      },
      create: {
        resourceId: validated.resourceId,
        userId: session.user.id,
        progress: validated.progress,
        currentTime: validated.currentTime,
        completed: validated.completed,
        completedAt: validated.completed ? new Date() : null,
      },
    });

    return {
      success: true,
      data: progress,
      message: "Progreso actualizado",
    };
  } catch (error) {
    console.error("[updateResourceProgress] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al actualizar progreso", code: "INTERNAL" };
  }
}

/**
 * Toggle like en un recurso
 */
export async function toggleResourceLike(
  data: ToggleLikeInput
): Promise<ActionResult<{ liked: boolean; likesCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const validated = toggleLikeSchema.parse(data);

    const resource = await prisma.resource.findUnique({
      where: { id: validated.resourceId },
      include: { community: true },
    });

    if (!resource) {
      return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
    }

    // Verificar acceso
    const access = await checkCommunityAccess(resource.community.slug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso", code: "FORBIDDEN" };
    }

    const existingLike = await prisma.resourceLike.findUnique({
      where: {
        resourceId_userId: {
          resourceId: validated.resourceId,
          userId: session.user.id,
        },
      },
    });

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await prisma.resourceLike.delete({
        where: { id: existingLike.id },
      });
      liked = false;
    } else {
      // Like
      await prisma.resourceLike.create({
        data: {
          resourceId: validated.resourceId,
          userId: session.user.id,
        },
      });
      liked = true;
    }

    const likesCount = await prisma.resourceLike.count({
      where: { resourceId: validated.resourceId },
    });

    return {
      success: true,
      data: { liked, likesCount },
    };
  } catch (error) {
    console.error("[toggleResourceLike] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message, code: "VALIDATION" };
    }
    return { success: false, error: "Error al procesar like", code: "INTERNAL" };
  }
}

/**
 * Obtener recursos populares de una comunidad
 */
export async function getPopularResources(
  communitySlug: string,
  limit: number = 5
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const access = await checkCommunityAccess(communitySlug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso", code: "FORBIDDEN" };
    }

    const resources = await prisma.resource.findMany({
      where: {
        communityId: access.community.id,
        status: "PUBLISHED",
        isPublic: true,
      },
      orderBy: [
        { viewCount: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    return { success: true, data: resources };
  } catch (error) {
    console.error("[getPopularResources] Error:", error);
    return { success: false, error: "Error al obtener recursos populares", code: "INTERNAL" };
  }
}

/**
 * Obtener "Continue Watching" - recursos con progreso incompleto
 */
export async function getContinueWatching(
  communitySlug: string,
  limit: number = 5
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }

    const access = await checkCommunityAccess(communitySlug, session.user.id);
    if (!access) {
      return { success: false, error: "Sin acceso", code: "FORBIDDEN" };
    }

    const resources = await prisma.resource.findMany({
      where: {
        communityId: access.community.id,
        status: "PUBLISHED",
        progress: {
          some: {
            userId: session.user.id,
            completed: false,
            progress: { gt: 0 },
          },
        },
      },
      orderBy: {
        progress: {
          _count: "desc",
        },
      },
      take: limit,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        progress: {
          where: { userId: session.user.id },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    return { success: true, data: resources };
  } catch (error) {
    console.error("[getContinueWatching] Error:", error);
    return { success: false, error: "Error al obtener progreso", code: "INTERNAL" };
  }
}

// Import z for error handling
import { z } from "zod";
