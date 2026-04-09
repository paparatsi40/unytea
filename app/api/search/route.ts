import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimiters, getIP } from "@/lib/rate-limit"

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

export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION CHECK
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      )
    }

    // 2. RATE LIMITING
    const ip = getIP(request)
    const rateLimitKey = `search:${session.user.id}:${ip}`
    const rateLimitResult = await rateLimiters.api.check(rateLimitKey)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // 3. PARSE QUERY PARAMETERS
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")?.trim()
    const type = (searchParams.get("type") || "all").toLowerCase()
    const limitParam = parseInt(searchParams.get("limit") || "20", 10)

    // Validate inputs
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters long" },
        { status: 400 }
      )
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "Query must be less than 200 characters" },
        { status: 400 }
      )
    }

    const validTypes = ["all", "posts", "courses", "communities", "members"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type parameter. Must be one of: all, posts, courses, communities, members" },
        { status: 400 }
      )
    }

    const limit = Math.min(Math.max(1, limitParam), 20) // Clamp between 1 and 20
    const perTypeLimit = Math.max(1, Math.floor(limit / 4)) // Distribute limit across types

    const response: SearchResponse = {
      posts: [],
      courses: [],
      communities: [],
      members: [],
    }

    // 4. SEARCH ACROSS MODELS
    const searchCondition = {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { content: { contains: query, mode: "insensitive" as const } },
      ],
    }

    // Search Posts
    if (type === "all" || type === "posts") {
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
    if (type === "all" || type === "courses") {
      const courses = await prisma.course.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
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
    if (type === "all" || type === "communities") {
      const communities = await prisma.community.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
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
    if (type === "all" || type === "members") {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { username: { contains: query, mode: "insensitive" as const } },
                { bio: { contains: query, mode: "insensitive" as const } },
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
        name: user.name || user.username,
        description: user.bio || undefined,
        snippet: user.bio?.substring(0, 150),
        type: "member" as const,
        url: `/profile/${user.username || user.id}`,
        imageUrl: user.image,
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[search-api] Error:", error)

    // Don't expose internal errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
