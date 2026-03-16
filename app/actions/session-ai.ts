"use server";

import { prisma } from "@/lib/prisma";
import { generateChatCompletion } from "@/lib/openai";

interface Chapter {
  title: string;
  timestamp?: string;
}

interface Quote {
  text: string;
  reason: string;
}

function parseSummaryPayload(raw: string): {
  summary?: string;
  takeaways?: string[];
  chapters?: Chapter[];
  quotes?: Quote[];
} {
  const direct = raw.trim();
  const fencedClean = direct.replace(/```json|```/g, "").trim();

  const candidates = [direct, fencedClean];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  const jsonMatch = fencedClean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // continue
    }
  }

  return {
    summary: fencedClean.slice(0, 500),
    takeaways: [],
    chapters: [],
    quotes: [],
  };
}

export async function generateAISessionSummary(sessionId: string) {
try {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        notes: true,
        mentor: { select: { name: true } },
        community: { select: { name: true } },
      },
    });

    if (!session) return { success: false, error: "Session not found" };

    const sourceText = [
      `Title: ${session.title}`,
      `Description: ${session.description || ""}`,
      `Host: ${session.mentor?.name || "Unknown"}`,
      `Community: ${session.community?.name || "Unknown"}`,
      `Notes:\n${session.notes?.content || "No notes available"}`,
    ].join("\n\n");

    const prompt = `You are generating a session recap package.
Return ONLY valid JSON with this shape:
{
  "summary": "string (max 180 words)",
  "takeaways": ["string", "string", "..."],
  "chapters": [{"title":"string","timestamp":"optional mm:ss"}],
  "quotes": [{"text":"string","reason":"string"}]
}

Session context:\n${sourceText}`;

    const raw = await generateChatCompletion({
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 900,
    });

    const parsed = parseSummaryPayload(raw);

    const takeaways = Array.isArray(parsed.takeaways) ? parsed.takeaways : [];
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    const quotes = Array.isArray(parsed.quotes) ? parsed.quotes : [];

    const resources = [
      ...chapters.map((c) => ({ type: "chapter", ...c })),
      ...quotes.map((q) => ({ type: "quote", ...q })),
    ];

    await prisma.sessionNote.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content: session.notes?.content || "",
        summary: parsed.summary || null,
        keyInsights: JSON.stringify(takeaways),
        resources: JSON.stringify(resources),
      },
      update: {
        summary: parsed.summary || null,
        keyInsights: JSON.stringify(takeaways),
        resources: JSON.stringify(resources),
      },
    });

    return {
      success: true,
      summary: parsed.summary || null,
      takeaways,
      chapters,
      quotes,
    };
  } catch (error) {
    console.error("Error generating AI session summary:", error);
    return { success: false, error: "Failed to generate AI summary" };
  }
}
