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

function normalizeTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().replace(/^[\[\(]|[\]\)]$/g, "");

  const hhmmss = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    const [, h, m, s] = hhmmss;
    const hours = Number(h);
    if (hours <= 0) return `${m}:${s}`;
    return `${hours}:${m}:${s}`;
  }

  const mmss = clean.match(/^(\d{1,3}):(\d{2})$/);
  if (mmss) {
    const [, m, s] = mmss;
    return `${Number(m)}:${s}`;
  }

  return undefined;
}

function sanitizeTakeaways(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeChapters(value: unknown): Chapter[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((v) => typeof v === "object" && !!v)
    .map((v: any) => ({
      title: typeof v.title === "string" ? v.title.trim() : "",
      timestamp: normalizeTimestamp(typeof v.timestamp === "string" ? v.timestamp : undefined),
    }))
    .filter((v) => v.title.length > 0)
    .slice(0, 10);
}

function sanitizeQuotes(value: unknown): Quote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "object" && !!v)
    .map((v: any) => ({
      text: typeof v.text === "string" ? v.text.trim() : "",
      reason: typeof v.reason === "string" ? v.reason.trim() : "",
    }))
    .filter((v) => v.text.length > 0)
    .slice(0, 6);
}

function extractChaptersFromNotes(content?: string | null): Chapter[] {
  if (!content) return [];

  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const chapters: Chapter[] = [];

  for (const line of lines) {
    const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—|:]\s*(.+)$/);
    if (!match) continue;

    const timestamp = normalizeTimestamp(match[1]);
    const title = match[2]?.trim();
    if (!timestamp || !title) continue;

    chapters.push({ title, timestamp });
    if (chapters.length >= 10) break;
  }

  return chapters;
}

function ensureMinimumChapters(chapters: Chapter[], takeaways: string[]): Chapter[] {
  const normalized = chapters.slice(0, 10);
  if (normalized.length >= 3) return normalized;

  const seen = new Set(normalized.map((c) => c.title.toLowerCase()));
  for (const takeaway of takeaways) {
    const title = takeaway.trim();
    if (!title || seen.has(title.toLowerCase())) continue;
    normalized.push({ title });
    seen.add(title.toLowerCase());
    if (normalized.length >= 5) break;
  }

  return normalized.slice(0, 10);
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
  "chapters": [{"title":"string","timestamp":"optional mm:ss or hh:mm:ss"}],
  "quotes": [{"text":"string","reason":"string"}]
}

Rules:
- Prefer 4-8 concise chapters covering the full session flow
- Use timestamps only when confidence is high
- Keep chapter titles short and clear

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

    const takeaways = sanitizeTakeaways(parsed.takeaways);
    const aiChapters = sanitizeChapters(parsed.chapters);
    const notesChapters = extractChaptersFromNotes(session.notes?.content);
    const chapters = ensureMinimumChapters(
      aiChapters.length > 0 ? aiChapters : notesChapters,
      takeaways
    );
    const quotes = sanitizeQuotes(parsed.quotes);

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
