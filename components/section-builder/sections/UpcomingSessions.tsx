import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import type { JSX } from "react";
import { SectionSchema } from "../types";

interface UpcomingSessionsRenderProps {
  communityId?: string;
  title?: string;
  limit?: number;
}

export async function UpcomingSessionsRender(
  props: UpcomingSessionsRenderProps
): Promise<JSX.Element> {
  const { communityId, title = "Upcoming sessions", limit = 5 } = props;

  if (!communityId) {
    // Defensive: section configured but no community context. Render nothing.
    return <></>;
  }

  const now = new Date();
  const sevenDaysFromNow = addDays(now, 7);

  const sessions = await prisma.mentorSession.findMany({
    where: {
      communityId,
      scheduledAt: { gte: now, lt: sevenDaysFromNow },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      duration: true,
      slug: true,
      _count: {
        select: { participations: true },
      },
    },
  });

  if (sessions.length === 0) {
    return (
      <section className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-xl font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">
            No upcoming sessions in the next 7 days. Check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-medium">{title}</h2>
          <span className="text-sm text-muted-foreground">{sessions.length} this week</span>
        </div>
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </div>
    </section>
  );
}

type SessionRowData = {
  id: string;
  title: string | null;
  scheduledAt: Date;
  duration: number | null;
  slug: string | null;
  _count: { participations: number };
};

// Inline helper component
function SessionRow({ session }: { session: SessionRowData }) {
  const date = new Date(session.scheduledAt);
  const dayLabel = format(date, "EEE").toUpperCase(); // "MON"
  const timeLabel = format(date, "h:mma").toLowerCase(); // "7pm"
  const attendeeCount = session._count?.participations ?? 0;
  const durationLabel = session.duration ? `${session.duration} min` : "TBD";

  return (
    <div className="flex items-center gap-3 rounded-md bg-muted/30 p-3">
      {/* Date block */}
      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md border border-border/50 bg-background">
        <span className="text-sm font-medium leading-none">{dayLabel}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">{timeLabel}</span>
      </div>

      {/* Session info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{session.title || "Untitled session"}</div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {durationLabel}
          </span>
          {attendeeCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {attendeeCount} attending
            </span>
          )}
        </div>
      </div>

      {/* CTA — public session page is slug-based (/sessions/[slug]). Only link
          when the session has a public slug; otherwise omit (no broken RSVP). */}
      {session.slug && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/sessions/${session.slug}`}>RSVP</Link>
        </Button>
      )}
    </div>
  );
}

export const UpcomingSessionsSchema: SectionSchema = {
  type: "upcomingSessions",
  label: "Upcoming sessions",
  description: "Shows the next live sessions in this community",
  icon: "📅",
  fields: [
    {
      key: "title",
      label: "Section title",
      kind: "text",
      placeholder: "Upcoming sessions",
    },
    { key: "limit", label: "Max sessions to show", kind: "number" },
  ],
  defaultProps: {
    title: "Upcoming sessions",
    limit: 5,
  },
  Render: UpcomingSessionsRender,
};
