import { z } from "zod";

// ============================================
// USER VALIDATIONS
// ============================================

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(500).optional(),
  tagline: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  location: z.string().max(100).optional(),
  skills: z.array(z.string().max(50)).max(10).optional(),
  interests: z.array(z.string().max(50)).max(10).optional(),
});

// ============================================
// COMMUNITY VALIDATIONS
// ============================================

export const communityCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  isPrivate: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export const communityUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  isPrivate: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

// ============================================
// POST VALIDATIONS
// ============================================

export const postCreateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
  communityId: z.string().cuid("Invalid community ID"),
  channelId: z.string().cuid("Invalid channel ID").optional(),
});

export const postUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
});

// ============================================
// COMMENT VALIDATIONS
// ============================================

export const commentCreateSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long"),
  postId: z.string().cuid("Invalid post ID"),
  parentId: z.string().cuid("Invalid parent ID").optional(),
});

// ============================================
// MESSAGE VALIDATIONS
// ============================================

export const messageCreateSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
  recipientId: z.string().cuid("Invalid recipient ID"),
  conversationId: z.string().cuid("Invalid conversation ID").optional(),
});

export const channelMessageCreateSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
  channelId: z.string().cuid("Invalid channel ID"),
});

// ============================================
// BUDDY VALIDATIONS
// ============================================

export const buddyPartnershipCreateSchema = z.object({
  communityId: z.string().cuid("Invalid community ID"),
  buddyId: z.string().cuid("Invalid buddy ID"),
});

export const buddyGoalCreateSchema = z.object({
  partnershipId: z.string().cuid("Invalid partnership ID"),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetDate: z.string().datetime().optional(),
});

export const buddyCheckInCreateSchema = z.object({
  partnershipId: z.string().cuid("Invalid partnership ID"),
  mood: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional(),
  completedGoals: z.array(z.string().cuid()).optional(),
});

// ============================================
// CHANNEL VALIDATIONS
// ============================================

export const channelCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  isPrivate: z.boolean().optional(),
  communityId: z.string().cuid("Invalid community ID"),
});

// ============================================
// REACTION VALIDATIONS
// ============================================

export const reactionSchema = z.object({
  type: z.enum(["LIKE", "LOVE", "CELEBRATE", "FIRE", "IDEA", "CLAP"]),
  postId: z.string().cuid().optional(),
  commentId: z.string().cuid().optional(),
});

// ============================================
// SEARCH/QUERY VALIDATIONS
// ============================================

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["posts", "users", "communities"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize HTML to prevent XSS
 * Remove script tags and dangerous attributes
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Sanitize user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .substring(0, 10000); // Limit length
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

// ============================================
// VALIDATION HELPER
// ============================================

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message || "Validation failed",
      };
    }
    return { success: false, error: "Invalid input" };
  }
}