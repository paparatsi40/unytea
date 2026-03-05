/**
 * Resource Library - Validaciones Zod
 * 
 * Validaciones estrictas y type-safe para el Resource Library.
 * Todas las validaciones incluyen mensajes de error descriptivos.
 */

import { z } from "zod";

// ============================================
// Enums como Zod enums
// ============================================

export const ResourceTypeEnum = z.enum(["AUDIO", "VIDEO", "DOCUMENT", "LINK"]);

export const ResourceStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

// ============================================
// Schemas base
// ============================================

export const resourceCategorySchema = z.object({
  id: z.string().cuid().optional(),
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(100, "El slug no puede exceder 100 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .nullable(),
  icon: z
    .string()
    .max(50, "El icono no puede exceder 50 caracteres")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "El color debe ser un HEX válido (ej: #8B5CF6)")
    .optional()
    .nullable(),
  position: z.number().int().min(0).default(0),
});

export const createResourceSchema = z.object({
  title: z
    .string()
    .min(1, "El título es requerido")
    .max(200, "El título no puede exceder 200 caracteres"),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(200, "El slug no puede exceder 200 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  description: z
    .string()
    .max(2000, "La descripción no puede exceder 2000 caracteres")
    .optional()
    .nullable(),
  type: ResourceTypeEnum,
  categoryId: z.string().cuid().optional().nullable(),
  
  // Content fields - validación condicional según tipo
  fileUrl: z.string().url("URL de archivo inválida").optional().nullable(),
  externalUrl: z.string().url("URL externa inválida").optional().nullable(),
  thumbnailUrl: z.string().url("URL de thumbnail inválida").optional().nullable(),
  
  // Metadata
  duration: z.number().int().min(0).optional().nullable(), // segundos
  fileSize: z.number().int().min(0).optional().nullable(), // bytes
  mimeType: z.string().optional().nullable(),
  tags: z
    .array(z.string().max(50, "Cada tag no puede exceder 50 caracteres"))
    .max(20, "No pueden haber más de 20 tags")
    .default([]),
  
  // Access control
  isPublic: z.boolean().default(false),
  requiredLevel: z.number().int().min(1).optional().nullable(),
  
  // Publishing
  status: ResourceStatusEnum.default("DRAFT"),
  publishedAt: z.date().optional().nullable(),
});

export const updateResourceSchema = createResourceSchema.partial().extend({
  id: z.string().cuid("ID de recurso inválido"),
});

export const resourceFilterSchema = z.object({
  communitySlug: z.string().min(1, "El slug de comunidad es requerido"),
  type: ResourceTypeEnum.optional(),
  categoryId: z.string().optional(),
  status: ResourceStatusEnum.optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "viewCount", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export const resourceProgressSchema = z.object({
  resourceId: z.string().cuid("ID de recurso inválido"),
  progress: z.number().min(0).max(100, "El progreso debe estar entre 0 y 100"),
  currentTime: z.number().int().min(0).optional(), // segundos
  completed: z.boolean().default(false),
});

export const toggleLikeSchema = z.object({
  resourceId: z.string().cuid("ID de recurso inválido"),
});

// ============================================
// Types inferidos
// ============================================

export type ResourceCategoryInput = z.infer<typeof resourceCategorySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceFilterInput = z.infer<typeof resourceFilterSchema>;
export type ResourceProgressInput = z.infer<typeof resourceProgressSchema>;
export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>;
