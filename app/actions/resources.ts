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
import { defineAction } from "@/lib/actions/define-action";
import { communityBySlug, communityOfResource } from "@/lib/actions/resolvers";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  type MemberRole,
  type ResourceCategory,
  type ResourceProgress,
} from "@prisma/client";
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
// Tipos de payload de Prisma (compartidos)
// ============================================

/** Comunidad con sus miembros (filtrados por el `where` de la query). */
type CommunityWithMembers = Prisma.CommunityGetPayload<{ include: { members: true } }>;

/** Acceso de un miembro: rol real (member row) o sintético (OWNER). */
type MemberAccess = { role: MemberRole; userId: string; status: string };

/** Recurso con su comunidad+miembros (para checks de permiso). */
type ResourceWithCommunity = Prisma.ResourceGetPayload<{
  include: { community: { include: { members: true } } };
}>;

/** Recurso de listado: category + author + progress + _count.likes. */
type ResourceListItem = Prisma.ResourceGetPayload<{
  include: {
    category: true;
    author: { select: { id: true; name: true; image: true } };
    progress: true;
    _count: { select: { likes: true } };
  };
}>;

/** Recurso de detalle: como el listado + `likes` del usuario. */
type ResourceDetail = Prisma.ResourceGetPayload<{
  include: {
    category: true;
    author: { select: { id: true; name: true; image: true } };
    progress: true;
    likes: { select: { id: true } };
    _count: { select: { likes: true } };
  };
}>;

/** Recurso de detalle + flags de permiso computados (retorno de getResourceById). */
export type ResourceDetailWithPermissions = ResourceDetail & {
  canEdit: boolean;
  canDelete: boolean;
};

/** Recurso de tarjeta: category + author + _count.likes (sin progress). */
type ResourceCardItem = Prisma.ResourceGetPayload<{
  include: {
    category: true;
    author: { select: { id: true; name: true; image: true } };
    _count: { select: { likes: true } };
  };
}>;

/** Recurso de tarjeta + slug de comunidad (retorno de updateResource). */
type ResourceWithCommunityCard = Prisma.ResourceGetPayload<{
  include: {
    community: { select: { slug: true } };
    category: true;
    author: { select: { id: true; name: true; image: true } };
    _count: { select: { likes: true } };
  };
}>;

/** Categoría con conteo de recursos. */
type ResourceCategoryWithCount = Prisma.ResourceCategoryGetPayload<{
  include: { _count: { select: { resources: true } } };
}>;

// ============================================
// Helpers de autorización
// ============================================

async function checkCommunityAccess(
  communitySlug: string,
  userId: string,
  requiredRoles: ("OWNER" | "ADMIN" | "MODERATOR" | "MENTOR" | "MEMBER")[] = ["MEMBER"]
): Promise<{ community: CommunityWithMembers; member: MemberAccess } | null> {
  console.log("[checkCommunityAccess] Looking for community:", communitySlug, "user:", userId);

  const community = await prisma.community.findUnique({
    where: { slug: communitySlug },
    include: {
      members: {
        where: {
          userId,
          status: "ACTIVE", // Solo miembros activos
        },
      },
    },
  });

  if (!community) {
    console.log("[checkCommunityAccess] Community not found");
    return null;
  }

  console.log("[checkCommunityAccess] Community found:", community.id);
  console.log("[checkCommunityAccess] Community ownerId:", community.ownerId);
  console.log("[checkCommunityAccess] Current userId:", userId);
  console.log("[checkCommunityAccess] Is owner:", community.ownerId === userId);
  console.log("[checkCommunityAccess] Members found:", community.members.length);

  // OWNER always has full access
  if (community.ownerId === userId) {
    console.log("[checkCommunityAccess] User is OWNER - access granted");
    return {
      community,
      member: {
        role: "OWNER",
        userId,
        status: "ACTIVE",
      },
    };
  }

  if (community.members.length > 0) {
    console.log("[checkCommunityAccess] Member role:", community.members[0].role);
  }

  const member = community.members[0];
  if (!member) {
    console.log("[checkCommunityAccess] User is not a member");
    return null;
  }

  const hasAccess = requiredRoles.includes(member.role);
  if (!hasAccess) {
    console.log(
      "[checkCommunityAccess] Role not authorized:",
      member.role,
      "required:",
      requiredRoles
    );
    return null;
  }

  console.log("[checkCommunityAccess] Access granted");

  return { community, member };
}

async function checkResourcePermission(
  resourceId: string,
  userId: string
): Promise<{ resource: ResourceWithCommunity; canEdit: boolean } | null> {
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
  const isAdmin =
    member?.role === "ADMIN" || member?.role === "OWNER" || member?.role === "MODERATOR";

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
export const createResourceCategory = defineAction(
  {
    name: "createResourceCategory",
    auth: "admin",
    args: [z.string().min(1).max(120), resourceCategorySchema],
    community: ([communitySlug]) => communityBySlug(communitySlug),
  },
  async (
    ctx,
    communitySlug: string,
    data: ResourceCategoryInput
  ): Promise<ActionResult<ResourceCategory>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
);

/**
 * Obtener todas las categorías de una comunidad
 */
export const getResourceCategories = defineAction(
  {
    name: "getResourceCategories",
    auth: "member",
    args: [z.string().min(1).max(120)],
    community: ([communitySlug]) => communityBySlug(communitySlug),
  },
  async (ctx, communitySlug: string): Promise<ActionResult<ResourceCategoryWithCount[]>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
);

// ============================================
// RECURSOS
// ============================================

/**
 * Crear un nuevo recurso
 * Requiere: MENTOR, MODERATOR, ADMIN, o OWNER
 */
export const createResource = defineAction(
  {
    name: "createResource",
    auth: "member",
    args: [z.string().min(1).max(120), createResourceSchema],
    community: ([communitySlug]) => communityBySlug(communitySlug),
    rateLimit: "create",
  },
  async (
    ctx,
    communitySlug: string,
    data: CreateResourceInput
  ): Promise<ActionResult<ResourceCardItem>> => {
    try {
      console.log("[createResource] Received data:", JSON.stringify(data, null, 2));

      const session = { user: { id: ctx.userId } };
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
        return {
          success: false,
          error: "Los links externos requieren una URL",
          code: "VALIDATION",
        };
      }

      if (
        (validated.type === "AUDIO" ||
          validated.type === "VIDEO" ||
          validated.type === "DOCUMENT") &&
        !validated.fileUrl
      ) {
        return {
          success: false,
          error: "Los archivos requieren una URL de archivo",
          code: "VALIDATION",
        };
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

      console.log("[createResource] About to execute prisma.resource.create...");
      console.log("[createResource] Community ID from access:", access.community.id);
      console.log("[createResource] Data to insert:", {
        ...validated,
        communityId: access.community.id,
        authorId: session.user.id,
        publishedAt,
      });

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

      console.log("[createResource] Resource created successfully:");
      console.log("[createResource] - ID:", resource.id);
      console.log("[createResource] - Title:", resource.title);
      console.log("[createResource] - communityId:", resource.communityId);
      console.log("[createResource] - authorId:", resource.authorId);
      console.log("[createResource] - createdAt:", resource.createdAt);
      console.log("[createResource] - status:", resource.status);
      console.log("[createResource] - isPublic:", resource.isPublic);

      // IMMEDIATE VERIFICATION: Check if resource actually exists in DB
      const verifyResource = await prisma.resource.findUnique({
        where: { id: resource.id },
      });
      console.log(
        "[createResource] VERIFICATION - Resource found in DB:",
        verifyResource ? "YES" : "NO"
      );
      if (verifyResource) {
        console.log(
          "[createResource] VERIFICATION - Resource communityId:",
          verifyResource.communityId
        );
      }

      // RAW SQL VERIFICATION: Check directly in database
      const rawResult = await prisma.$queryRaw`SELECT * FROM resources WHERE id = ${resource.id}`;
      console.log(
        "[createResource] RAW SQL VERIFICATION - Result:",
        JSON.stringify(rawResult, null, 2)
      );

      // Count all resources in this community immediately after creation
      const countResources = await prisma.resource.count({
        where: { communityId: access.community.id },
      });
      console.log(
        "[createResource] VERIFICATION - Total resources in community after creation:",
        countResources
      );

      // Small delay to ensure replication (if using Neon pooler)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Second verification after delay
      const countAfterDelay = await prisma.resource.count({
        where: { communityId: access.community.id },
      });
      console.log(
        "[createResource] VERIFICATION - Total resources after 500ms delay:",
        countAfterDelay
      );

      revalidatePath(`/dashboard/c/${communitySlug}/library`);

      return {
        success: true,
        data: resource,
        message: "Recurso creado exitosamente",
      };
    } catch (error) {
      console.error("[createResource] ERROR DETAILS:", error);
      console.error("[createResource] ERROR STRING:", String(error));
      if (error instanceof Error) {
        console.error("[createResource] ERROR MESSAGE:", error.message);
        console.error("[createResource] ERROR STACK:", error.stack);
      }
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message, code: "VALIDATION" };
      }
      return { success: false, error: "Error al crear recurso", code: "INTERNAL" };
    }
  }
);

/**
 * Actualizar un recurso existente
 */
export const updateResource = defineAction(
  {
    name: "updateResource",
    auth: "member",
    args: [z.string().min(1).max(64), updateResourceSchema],
    community: ([resourceId]) => communityOfResource(resourceId),
  },
  async (
    ctx,
    resourceId: string,
    data: UpdateResourceInput
  ): Promise<ActionResult<ResourceWithCommunityCard>> => {
    try {
      const session = { user: { id: ctx.userId } };

      // Validar input
      const validated = updateResourceSchema.parse({ ...data, id: resourceId });

      // Verificar permisos
      const permission = await checkResourcePermission(resourceId, session.user.id);
      if (!permission) {
        return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
      }

      if (!permission.canEdit) {
        return {
          success: false,
          error: "Sin permisos para editar este recurso",
          code: "FORBIDDEN",
        };
      }

      // Si está cambiando a PUBLISHED y no tenía publishedAt, establecerlo
      const updates: Prisma.ResourceUpdateInput = { ...validated };
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
);

/**
 * Eliminar un recurso
 */
export const deleteResource = defineAction(
  {
    name: "deleteResource",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([resourceId]) => communityOfResource(resourceId),
  },
  async (ctx, resourceId: string): Promise<ActionResult<void>> => {
    try {
      const session = { user: { id: ctx.userId } };

      const permission = await checkResourcePermission(resourceId, session.user.id);
      if (!permission) {
        return { success: false, error: "Recurso no encontrado", code: "NOT_FOUND" };
      }

      if (!permission.canEdit) {
        return {
          success: false,
          error: "Sin permisos para eliminar este recurso",
          code: "FORBIDDEN",
        };
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
);

/**
 * Obtener recursos con filtros avanzados
 */
export const getResources = defineAction(
  {
    name: "getResources",
    auth: "member",
    args: [resourceFilterSchema],
    community: ([filters]) => {
      const slug = (filters as { communitySlug?: string }).communitySlug;
      return slug ? communityBySlug(slug) : null;
    },
  },
  async (
    ctx,
    filters: ResourceFilterInput
  ): Promise<ActionResult<{ resources: ResourceListItem[]; total: number; hasMore: boolean }>> => {
    try {
      const session = { user: { id: ctx.userId } };

      // Validar filtros
      const validated = resourceFilterSchema.parse(filters);

      const access = await checkCommunityAccess(validated.communitySlug, session.user.id);
      if (!access) {
        return { success: false, error: "Sin acceso a la comunidad", code: "FORBIDDEN" };
      }

      const where: Prisma.ResourceWhereInput = {
        communityId: access.community.id,
      };

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

      if (!isAdmin) {
        where.OR = [...(where.OR || []), { isPublic: true }, { authorId: session.user.id }];
      }

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
);

/**
 * Obtener un recurso por ID con detalles completos
 */
export const getResourceById = defineAction(
  {
    name: "getResourceById",
    auth: "member",
    args: [z.string().min(1).max(64), z.string().min(1).max(120)],
    community: ([, communitySlug]) => communityBySlug(communitySlug),
  },
  async (
    ctx,
    resourceId: string,
    communitySlug: string
  ): Promise<ActionResult<ResourceDetailWithPermissions>> => {
    try {
      const session = { user: { id: ctx.userId } };

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

      // Flags de permiso para la UI de detalle (editar/borrar). Mismo criterio que
      // checkResourcePermission (isOwner||isAuthor||isAdmin); reutilizamos isAdmin/isAuthor
      // ya computados para no disparar una segunda query redundante. Sin estos flags el
      // dropdown editar/borrar nunca renderizaba (canEdit/canDelete eran undefined).
      const canEdit = isAdmin || isAuthor;
      const canDelete = canEdit;

      // Incrementar view count (en background, no bloquear)
      prisma.resource
        .update({
          where: { id: resourceId },
          data: { viewCount: { increment: 1 } },
        })
        .catch(console.error);

      return { success: true, data: { ...resource, canEdit, canDelete } };
    } catch (error) {
      console.error("[getResourceById] Error:", error);
      return { success: false, error: "Error al obtener recurso", code: "INTERNAL" };
    }
  }
);

// ============================================
// PROGRESO Y LIKES
// ============================================

/**
 * Actualizar progreso de un recurso
 */
export const updateResourceProgress = defineAction(
  {
    name: "updateResourceProgress",
    auth: "member",
    args: [resourceProgressSchema],
    community: ([data]) => {
      const resourceId = (data as { resourceId?: string }).resourceId;
      return resourceId ? communityOfResource(resourceId) : null;
    },
    rateLimit: "general",
  },
  async (ctx, data: ResourceProgressInput): Promise<ActionResult<ResourceProgress>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
);

/**
 * Toggle like en un recurso
 */
export const toggleResourceLike = defineAction(
  {
    name: "toggleResourceLike",
    auth: "member",
    args: [toggleLikeSchema],
    community: ([data]) => {
      const resourceId = (data as { resourceId?: string }).resourceId;
      return resourceId ? communityOfResource(resourceId) : null;
    },
    rateLimit: "create",
  },
  async (
    ctx,
    data: ToggleLikeInput
  ): Promise<ActionResult<{ liked: boolean; likesCount: number }>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
);

/**
 * Obtener recursos populares de una comunidad
 */
export const getPopularResources = defineAction(
  {
    name: "getPopularResources",
    auth: "member",
    args: [z.string().min(1).max(120), z.number().int().min(1).max(50).default(5)],
    community: ([communitySlug]) => communityBySlug(communitySlug),
  },
  async (
    ctx,
    communitySlug: string,
    limit: number = 5
  ): Promise<ActionResult<ResourceCardItem[]>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
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
);

/**
 * Obtener "Continue Watching" - recursos con progreso incompleto
 */
export const getContinueWatching = defineAction(
  {
    name: "getContinueWatching",
    auth: "member",
    args: [z.string().min(1).max(120), z.number().int().min(1).max(50).default(5)],
    community: ([communitySlug]) => communityBySlug(communitySlug),
  },
  async (
    ctx,
    communitySlug: string,
    limit: number = 5
  ): Promise<ActionResult<ResourceListItem[]>> => {
    try {
      const session = { user: { id: ctx.userId } };

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
);

// Import z for error handling
import { z } from "zod";
