"use server"

import { getCurrentUserId } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"

interface SearchResult {
  id: string
  title?: string
  name?: string
  description?: string
  snippet?: string
  type: "post" | "course" | "community" | "member"
  url: string
  imageUrl?: string | null
}

interface SearchResponse {
  posts: SearchResult[]
  courses: SearchResult[]
  communities: SearchResult[]
  members: SearchResult[]
}

/**
 * Server action for global search across posts, courses, communities, and members
 * Can be called from client components
 */
export async function searchGlobal(
  query: string,
  type: string = "all"
): Promise<SearchResponse | { error: string }> {
  try {
    // 1. AUTHENTICATION CHECK
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: "Unauthorized - authentication required" }
    }

    // 2. VALIDATE INPUTS
    const trimmedQuery = query.trim()

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return { error: "Query must be at least 2 characters long" }
    }

    if (trimmedQuery.length > 200) {
      return { error: "Query must be less than 200 characters" }
    }

    const normalizedType = type.toLowerCase()
    const validTypes = ["all", "posts", "courses", "communities", "members"]
    if (!validTypes.includes(normalizedType)) {
      return {
        error: "Invalid type parameter. Must be one of: all, posts, courses, communities, members",
      }
    }

    const perTypeLimit = 5 // Default 5 results per type

    const response: SearchResponse = {
      posts: [],
      courses: [],
      communities: [],
      members: [],
    }

    // 3. SEARCH ACROSS MODELS
    const searchCondition = {
      OR: [
        { title: { contains: trimmedQuery, mode: "insensitive" as const } },
        { content: { contains: trimmedQuery, mode: "insensitive" as const } },
      ],
    }

    // Search Posts
    if (normalizedType === "all" || normalizedType === "posts") {
      const posts = await prisma.post.findMany({
        where: {
          AND: [
            searchCondition,
            { deletedAt: null }, // Filter out soft-deleted posts
            { isPublished: true }, // Only published posts
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          community: {
            select: {
              slug: true,
            },
          },
        },
        take: perTypeLimit,
        orderBy: { createdAt: "desc" },
      })

      response.posts = posts.map((post) => ({
        id: post.id,
        title: post.title || "Untitled Post",
        description: post.content.substring(0, 150),
        snippet: post.content.substring(0, 150),
        type: "post" as const,
        url: `/community/${post.community.slug}/post/${post.id}`,
      }))
    }

    // Search Courses
    if (normalizedType === "all" || normalizedType === "courses") {
      const courses = await prisma.course.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: trimmedQuery, mode: "insensitive" as const } },
                { description: { contains: trimmedQuery, mode: "insensitive" as const } },
              ],
            },
            { isPublished: true }, // Only published courses
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          imageUrl: true,
          community: {
            select: {
              slug: true,
            },
          },
        },
        take: perTypeLimit,
        orderBy: { createdAt: "desc" },
      })

      response.courses = courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description || undefined,
        snippet: course.description?.substring(0, 150),
        type: "course" as const,
        url: `/community/${course.community.slug}/courses/${course.slug}`,
        imageUrl: course.imageUrl,
      }))
    }

    // Search Communities
    if (normalizedType === "all" || normalizedType === "communities") {
      const communities = await prisma.community.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: trimmedQuery, mode: "insensitive" as const } },
                { description: { contains: trimmedQuery, mode: "insensitive" as const } },
              ],
            },
            { deletedAt: null }, // Filter out soft-deleted communities
            { isPrivate: false }, // Only public communities (user may not be a member)
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
        },
        take: perTypeLimit,
        orderBy: { createdAt: "desc" },
      })

      response.communities = communities.map((community) => ({
        id: community.id,
        title: community.name,
        name: community.name,
        description: community.description || undefined,
        snippet: community.description?.substring(0, 150),
        type: "community" as const,
        url: `/community/${community.slug}`,
        imageUrl: community.imageUrl,
      }))
    }

    // Search Members (Users)
    if (normalizedType === "all" || normalizedType === "members") {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: trimmedQuery, mode: "insensitive" as const } },
                { username: { contains: trimmedQuery, mode: "insensitive" as const } },
                { bio: { contains: trimmedQuery, mode: "insensitive" as const } },
              ],
            },
            { deletedAt: null }, // Filter out soft-deleted users
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
        },
        take: perTypeLimit,
        orderBy: { createdAt: "desc" },
      })

      response.members = users.map((user) => ({
        id: user.id,
        title: user.name || user.username || "User",
        name: user.name || user.username || undefined,
        description: user.bio || undefined,
        snippet: user.bio?.substring(0, 150),
        type: "member" as const,
        url: `/profile/${user.username || user.id}`,
        imageUrl: user.image,
      }))
    }

    return response
  } catch (error) {
    console.error("[search-action] Error:", error)
    return { error: "An error occurred while searching" }
  }
}
