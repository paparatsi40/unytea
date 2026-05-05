import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { localizedAlternates } from "@/lib/seo/locale-metadata";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, Sparkles, TrendingUp } from "lucide-react";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseInsights(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function trackPublicLibraryEvent(params: {
  eventName: "library_view";
  locale: string;
  source: string;
  extra?: Record<string, unknown>;
}) {
  console.info("[PublicDiscoveryEvent]", {
    at: new Date().toISOString(),
    ...params,
  });
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const canonical = `https://www.unytea.com/${params.locale}/library`;
  const title = "Knowledge Library | Unytea";
  const description =
    "Watch curated session replays, discover key topics, and learn from the best community sessions on Unytea.";

  return {
    title,
    description,
    ...localizedAlternates({ path: "/library", locale: params.locale }),
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: "https://www.unytea.com/og-image.png", width: 1200, height: 630 }],
      siteName: "Unytea",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.unytea.com/og-image.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicLibraryPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { src?: string };
}) {
  const locale = params.locale || "en";
  const source = searchParams?.src || "direct";
  const headerBag = headers();

  const sessions = await prisma.mentorSession.findMany({
    where: {
      status: "COMPLETED",
      visibility: "public",
      slug: { not: null },
      recording: { status: "READY" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      scheduledAt: true,
      _count: { select: { participations: true } },
      mentor: { select: { name: true } },
      community: { select: { slug: true, name: true } },
      notes: { select: { keyInsights: true } },
    },
    orderBy: [{ scheduledAt: "desc" }],
    take: 36,
  });

  const keyTopics = Object.entries(
    sessions.reduce((acc, session) => {
      const sourceText = [
        session.title,
        session.description || "",
        ...parseInsights(session.notes?.keyInsights || null),
      ]
        .join(" ")
        .toLowerCase();

      const candidates = [
        "ai",
        "marketing",
        "sales",
        "product",
        "engineering",
        "leadership",
        "finance",
        "strategy",
      ];

      for (const topic of candidates) {
        if (sourceText.includes(topic)) {
          acc[topic] = (acc[topic] || 0) + 1;
        }
      }

      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const curated = [...sessions]
    .sort((a, b) => b._count.participations - a._count.participations)
    .slice(0, 12);

  trackPublicLibraryEvent({
    eventName: "library_view",
    locale,
    source,
    extra: {
      userAgent: headerBag.get("user-agent") || "unknown",
      sessionsAvailable: sessions.length,
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Knowledge Library
            </h1>
            <p className="mt-2 text-muted-foreground">
              Best session replays and key topics from the Unytea network.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/explore`}>Explore Communities</Link>
          </Button>
        </div>

        {keyTopics.length > 0 && (
          <section className="mb-8 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Key Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {keyTopics.map(([topic, count]) => (
                <Badge key={topic} variant="secondary">
                  {topic.toUpperCase()} · {count}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Curated Recordings
          </h2>

          {curated.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No public recordings yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {curated.map((session) => (
                <Link
                  key={session.id}
                  href={`/${locale}/s/${session.slug}?src=library`}
                  className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline">Replay</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(session.scheduledAt)}</span>
                  </div>

                  <h3 className="line-clamp-2 font-semibold text-foreground">{session.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {session.description || "Session replay from the community."}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{session.community?.name || "Community"}</span>
                    <span>{session._count.participations} attendees</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                    <PlayCircle className="h-4 w-4" />
                    Watch replay
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
