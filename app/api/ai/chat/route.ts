import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateChatCompletion, AI_CONFIG, ChatMessage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, communitySlug, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get enhanced community context if provided
    let communityContext = "";
    if (communitySlug) {
      try {
        const [community, recentPosts, topMembers] = await Promise.all([
          // Community info
          prisma.community.findUnique({
            where: { slug: communitySlug },
            select: {
              name: true,
              description: true,
              _count: {
                select: {
                  members: true,
                  posts: true,
                },
              },
            },
          }),

          // Recent posts for context
          prisma.post.findMany({
            where: { 
              community: { slug: communitySlug }
            },
            select: {
              title: true,
              content: true,
              createdAt: true,
              author: {
                select: { name: true }
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),

          // Top members
          prisma.member.findMany({
            where: {
              community: { slug: communitySlug },
              status: "ACTIVE",
            },
            select: {
              user: {
                select: { name: true }
              },
              points: true,
              role: true,
            },
            orderBy: { points: "desc" },
            take: 3,
          }),
        ]);

        if (community) {
          communityContext = `
Current Community: ${community.name}
Description: ${community.description || "No description"}
Members: ${community._count.members}
Total Posts: ${community._count.posts}

Recent Discussions:
${recentPosts.map((post, i) => `${i + 1}. "${post.title || post.content.substring(0, 50)}..." by ${post.author?.name || "Anonymous"}`).join("\n")}

Top Contributors:
${topMembers.map((member, i) => `${i + 1}. ${member.user.name} (${member.points} points, ${member.role})`).join("\n")}

Guidelines:
- Be helpful and provide specific answers based on community context
- Reference recent discussions when relevant
- Guide users to connect with top contributors when appropriate
- Encourage engagement and community participation
`;
        }
      } catch (dbError) {
        console.error("Database error fetching community context:", dbError);
        // Continue without community context
      }
    }

    // Build messages array with enhanced context
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `${AI_CONFIG.systemPrompt}

${communityContext ? `\nCommunity Context:\n${communityContext}` : ""}

Important Instructions:
- Provide concise, actionable answers
- Use context from recent discussions when relevant
- Guide users to community resources
- Encourage positive engagement
- If you don't know something, suggest asking the community
- Be friendly and approachable`,
      },
      // Add conversation history
      ...(conversationHistory || []),
      // Add current user message
      {
        role: "user",
        content: message,
      },
    ];

    // Generate AI response
    console.log("Calling OpenAI API...");
    const aiResponse = await generateChatCompletion({ messages });
    console.log("OpenAI API response received");

    // Return response
    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Chat API error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { 
        error: "Failed to process chat message",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}