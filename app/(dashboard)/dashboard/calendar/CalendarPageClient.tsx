"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { CalendarView, type CalendarSession } from "@/components/calendar/CalendarView";

interface CalendarPageClientProps {
  sessions: CalendarSession[];
}

export function CalendarPageClient({ sessions }: CalendarPageClientProps) {
  const t = useTranslations("dashboard.calendar");
  usePageTitle("metaTitle", "dashboard.calendar");
  const router = useRouter();

  const handleSessionClick = (session: CalendarSession) => {
    if (session.slug) {
      router.push(`/sessions/${session.slug}`);
    } else {
      router.push(`/dashboard/sessions/${session.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
          <Calendar className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-sm text-zinc-400">{t("subtitle")}</p>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView sessions={sessions} onSessionClick={handleSessionClick} />
    </div>
  );
}
