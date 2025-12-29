"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Video, Users } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SessionCardProps {
  session: any;
  isPast?: boolean;
}

function getLocaleFromPathname(pathname: string | null) {
  const safe = pathname ?? "/en";
  const seg = safe.split("/").filter(Boolean)[0];
  return seg || "en";
}

export function SessionCard({ session, isPast = false }: SessionCardProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sessionDate = useMemo(() => new Date(session.scheduledAt), [session.scheduledAt]);

  const canJoin =
    !isPast && new Date() >= new Date(sessionDate.getTime() - 5 * 60 * 1000);

  const roomHref = `/${locale}/dashboard/sessions/${session.id}/room`;

  // Evita hydration mismatch: en SSR mostramos vacío, en client ya formateamos
  const formattedDate = mounted
    ? format(sessionDate, "MMM dd, yyyy 'at' h:mm a")
    : "";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg">
      <div className="absolute right-4 top-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            session.status === "COMPLETED"
              ? "bg-green-500/10 text-green-500"
              : session.status === "CANCELLED"
              ? "bg-red-500/10 text-red-500"
              : session.status === "IN_PROGRESS"
              ? "bg-blue-500/10 text-blue-500 animate-pulse"
              : "bg-yellow-500/10 text-yellow-500"
          }`}
        >
          {session.status === "IN_PROGRESS" && "● "}
          {String(session.status).replace("_", " ")}
        </span>
      </div>

      <h3 className="mb-2 pr-20 text-lg font-bold text-foreground">
        {session.title}
      </h3>

      {session.description && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {session.description}
        </p>
      )}

      <div className="mb-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {/* suppressHydrationWarning por si el server puso algo distinto */}
          <span suppressHydrationWarning>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{session.duration} minutes</span>
        </div>

        {session.mentor && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Host: {session.mentor.name || session.mentor.username}</span>
          </div>
        )}
      </div>

      {canJoin && session.status === "SCHEDULED" && (
        <Link
          href={roomHref}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Video className="h-4 w-4" />
          Join Now
        </Link>
      )}

      {!canJoin && session.status === "SCHEDULED" && (
        <Link
          href={roomHref}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Video className="h-4 w-4" />
          Start Session
        </Link>
      )}

      {session.status === "IN_PROGRESS" && (
        <Link
          href={roomHref}
          className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600"
        >
          <Video className="h-4 w-4" />
          Join In Progress
        </Link>
      )}

      {isPast && session.status === "COMPLETED" && (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Session Completed
        </div>
      )}
    </div>
  );
}
