"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Calendar as CalendarIcon,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarSession {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  duration: number; // minutes
  status: string;
  hostName?: string;
  hostImage?: string;
  communityName?: string;
  communitySlug?: string;
  slug?: string;
  participantCount?: number;
}

interface CalendarViewProps {
  sessions: CalendarSession[];
  onSessionClick?: (session: CalendarSession) => void;
}

export function CalendarView({ sessions, onSessionClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Map sessions to dates
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of sessions) {
      const dateKey = format(new Date(s.scheduledAt), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push(s);
      map.set(dateKey, existing);
    }
    return map;
  }, [sessions]);

  // Sessions for the selected date
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return (sessionsByDate.get(key) || []).sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [selectedDate, sessionsByDate]);

  // Generate .ics file for a session
  const generateICS = (session: CalendarSession) => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + session.duration * 60 * 1000);
    const formatICSDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Unytea//Session//EN",
      "BEGIN:VEVENT",
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${session.communityName ? `Community: ${session.communityName}` : "Unytea Session"}`,
      `URL:${window.location.origin}/dashboard/sessions/${session.id}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Google Calendar link
  const getGoogleCalLink = (session: CalendarSession) => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + session.duration * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: session.title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Unytea Session${session.communityName ? ` - ${session.communityName}` : ""}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Month Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-zinc-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasEvents = daySessions.length > 0;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center rounded-lg transition-all",
                  isCurrentMonth
                    ? "text-zinc-200"
                    : "text-zinc-600",
                  isSelected
                    ? "bg-purple-600/20 ring-1 ring-purple-500"
                    : "hover:bg-zinc-800/80",
                  isToday(day) && !isSelected && "bg-zinc-800"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isToday(day) && "font-bold text-purple-400"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasEvents && (
                  <div className="mt-0.5 flex gap-0.5">
                    {daySessions.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          i === 0
                            ? "bg-purple-400"
                            : i === 1
                            ? "bg-blue-400"
                            : "bg-emerald-400"
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail */}
      <div className="w-full lg:w-80">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">
            {selectedDate
              ? isToday(selectedDate)
                ? "Today"
                : format(selectedDate, "EEEE, MMMM d")
              : "Select a date"}
          </h3>

          {selectedDateSessions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CalendarIcon className="mb-3 h-10 w-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">No sessions scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateSessions.map((session) => (
                <div
                  key={session.id}
                  className="group cursor-pointer rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 transition-colors hover:border-purple-500/30 hover:bg-zinc-800"
                  onClick={() => onSessionClick?.(session)}
                >
                  {/* Time */}
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-purple-300">
                      {format(new Date(session.scheduledAt), "h:mm a")}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {session.duration}min
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                        session.status === "SCHEDULED"
                          ? "bg-blue-500/10 text-blue-400"
                          : session.status === "IN_PROGRESS"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-zinc-700 text-zinc-400"
                      )}
                    >
                      {session.status === "IN_PROGRESS"
                        ? "Live"
                        : session.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="mb-1 text-sm font-medium text-white">
                    {session.title}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {session.communityName && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.communityName}
                      </span>
                    )}
                    {session.hostName && (
                      <span>by {session.hostName}</span>
                    )}
                  </div>

                  {/* Export buttons (visible on hover) */}
                  <div className="mt-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={getGoogleCalLink(session)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md bg-zinc-700/50 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      Google Cal
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateICS(session);
                      }}
                      className="flex items-center gap-1 rounded-md bg-zinc-700/50 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      <Download className="h-3 w-3" />
                      .ics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
