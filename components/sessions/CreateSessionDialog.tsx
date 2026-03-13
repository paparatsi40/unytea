"use client";

import { useState, useMemo } from "react";
import { Plus, Radio, Calendar, Clock, Video, Mic, Check } from "lucide-react";
import { createSessionOrSeries } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type RecurrenceType = "once" | "weekly" | "monthly";
type SessionMode = "now" | "scheduled";
type SessionType = "video" | "audio";

interface CreateSessionDialogProps {
  triggerText?: string;
  className?: string;
  communityId?: string;
  onSuccess?: () => void;
}

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Common timezones with friendly names
const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / Berlin" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "UTC", label: "UTC" },
];

// Duration presets
const DURATION_PRESETS = [30, 45, 60, 90, 120];

export function CreateSessionDialog({
  triggerText = "Create Session",
  className,
  communityId,
  onSuccess,
}: CreateSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Mode: now or scheduled
  const [mode, setMode] = useState<SessionMode>("scheduled");
  
  // Session type: video or audio
  const [sessionType, setSessionType] = useState<SessionType>("video");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [autoPostToFeed, setAutoPostToFeed] = useState(true);

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [interval, setInterval] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [generateCount, setGenerateCount] = useState(8);

  // Update dayOfWeek when date changes (for weekly recurrence)
  const handleDateChange = (value: string) => {
    setScheduledAt(value);
    if (value) {
      const day = new Date(value).getDay();
      setDayOfWeek(day);
    }
  };

  // Generate preview dates for recurring sessions
  const previewDates = useMemo(() => {
    if (mode === "now" || recurrence === "once" || !scheduledAt) return [];
    
    const dates: Date[] = [];
    const startDate = new Date(scheduledAt);
    
    for (let i = 0; i < Math.min(generateCount, 6); i++) {
      const date = new Date(startDate);
      if (recurrence === "weekly") {
        date.setDate(date.getDate() + i * 7 * interval);
      } else {
        date.setMonth(date.getMonth() + i * interval);
      }
      dates.push(date);
    }
    
    return dates;
  }, [scheduledAt, recurrence, interval, generateCount, mode]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format date with day name
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "now") {
        // Start session immediately
        const result = await createSessionOrSeries({
          title,
          description,
          scheduledAt: new Date(),
          duration,
          timezone,
          communityId,
          postToFeed: autoPostToFeed,
          repeat: "once",
        });

        if (result.success) {
          const successResult = result as { success: true; session?: { id: string } };
          toast.success("Live session started!");
          setIsOpen(false);
          resetForm();
          onSuccess?.();
          
          // Redirect to room immediately
          if (successResult.session?.id) {
            router.push(`/dashboard/sessions/${successResult.session.id}/room`);
          }
        } else {
          const errorResult = result as { success: false; error?: string };
          toast.error(errorResult.error || "Failed to start session");
        }
      } else {
        // Schedule session
        const scheduledDate = new Date(scheduledAt);

        const apiRepeat = recurrence === "once" 
          ? "once" 
          : recurrence === "weekly" 
            ? "WEEKLY" 
            : "MONTHLY";

        const result = await createSessionOrSeries({
          title,
          description,
          scheduledAt: scheduledDate,
          duration,
          timezone,
          communityId,
          postToFeed: autoPostToFeed,
          repeat: apiRepeat as "once" | "WEEKLY" | "MONTHLY",
          interval: recurrence === "once" ? undefined : interval,
          dayOfWeek: recurrence === "weekly" ? dayOfWeek : undefined,
          dayOfMonth: recurrence === "monthly" ? scheduledDate.getDate() : undefined,
          generateCount: recurrence === "once" ? undefined : generateCount,
        });

        if (result.success) {
          const successResult = result as { success: true; type?: string; generatedCount?: number };
          toast.success(
            successResult.type === "recurring"
              ? `${successResult.generatedCount} sessions scheduled!`
              : "Session scheduled successfully!"
          );
          setIsOpen(false);
          resetForm();
          onSuccess?.();
          router.refresh();
        } else {
          const errorResult = result as { success: false; error?: string };
          toast.error(errorResult.error || "Failed to create session");
        }
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("An unexpected error occurred");
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setMode("scheduled");
    setSessionType("video");
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setDuration(60);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setAutoPostToFeed(true);
    setRecurrence("once");
    setInterval(1);
    setDayOfWeek(1);
    setGenerateCount(8);
  };

  // Get timezone label
  const timezoneLabel = useMemo(() => {
    const tz = TIMEZONES.find((t) => t.value === timezone);
    return tz?.label || timezone;
  }, [timezone]);

  const getRecurrenceSummary = () => {
    if (recurrence === "once") return "";
    if (recurrence === "weekly") {
      const dayName = WEEKDAYS.find((d) => d.value === dayOfWeek)?.label;
      return `${generateCount} sessions every ${interval === 1 ? "week" : `${interval} weeks`} on ${dayName}s`;
    }
    return `${generateCount} sessions every ${interval === 1 ? "month" : `${interval} months`}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        }
      >
        {!className?.includes("Schedule your first") && (
          <Plus className="h-4 w-4" />
        )}
        {triggerText}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Create Live Session
              </h2>
              <p className="text-sm text-zinc-400">
                Start now or schedule for later
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mode Selection: Now vs Scheduled */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "now"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  Start now
                </button>
                <button
                  type="button"
                  onClick={() => setMode("scheduled")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "scheduled"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Schedule
                </button>
              </div>

              {/* Session Type: Video vs Audio */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSessionType("video")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    sessionType === "video"
                      ? "border-purple-500 bg-purple-500/20 text-purple-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType("audio")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    sessionType === "audio"
                      ? "border-purple-500 bg-purple-500/20 text-purple-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  Audio only
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Weekly Coaching Call"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Description <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
                  placeholder="What will this session cover?"
                />
              </div>

              {/* Duration - Numeric Input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Duration (minutes)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 30))}
                    min={5}
                    step={5}
                    className="w-24 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-center text-white focus:border-purple-500 focus:outline-none"
                  />
                  <div className="flex flex-1 gap-1">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDuration(preset)}
                        className={`flex-1 rounded-lg text-xs font-medium transition-colors ${
                          duration === preset
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date & Time - Only for scheduled */}
              {mode === "scheduled" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      <Calendar className="mr-1 inline h-4 w-4" />
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => handleDateChange(e.target.value)}
                      required={mode === "scheduled"}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                    />
                    {scheduledAt && (
                      <p className="mt-1 text-sm text-purple-400">
                        {formatDateFull(scheduledAt)}
                      </p>
                    )}
                  </div>

                  {/* Timezone - Friendly names */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    {scheduledAt && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Your time: {timezoneLabel}
                      </p>
                    )}
                  </div>

                  {/* Growth tip for weekly */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-amber-300">
                      Weekly sessions increase community engagement by 3x
                    </p>
                  </div>

                  {/* Repeat */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Repeat
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: "once", label: "Once" },
                        { id: "weekly", label: "Weekly" },
                        { id: "monthly", label: "Monthly" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setRecurrence(option.id as RecurrenceType)}
                          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            recurrence === option.id
                              ? "border-purple-500 bg-purple-500/20 text-purple-400"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recurrence Options */}
                  {recurrence !== "once" && (
                    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                      {/* Interval */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Every</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={interval}
                            onChange={(e) => setInterval(parseInt(e.target.value))}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm text-zinc-400">
                            {recurrence === "weekly"
                              ? interval === 1 ? "week" : "weeks"
                              : interval === 1 ? "month" : "months"}
                          </span>
                        </div>
                      </div>

                      {/* Day of Week (for weekly) */}
                      {recurrence === "weekly" && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">On</span>
                          <div className="flex gap-1">
                            {WEEKDAYS.map((day) => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => setDayOfWeek(day.value)}
                                className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                                  dayOfWeek === day.value
                                    ? "bg-purple-600 text-white"
                                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generate Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Total sessions</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGenerateCount(Math.max(2, generateCount - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-medium text-white">
                            {generateCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGenerateCount(Math.min(12, generateCount + 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Dates */}
                  {previewDates.length > 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                        Upcoming sessions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {previewDates.map((date, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                          >
                            {formatDate(date)}
                          </span>
                        ))}
                        {generateCount > 6 && (
                          <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-500">
                            +{generateCount - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Auto Post Toggle */}
              {communityId && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-600 bg-zinc-800">
                    {autoPostToFeed && <Check className="h-3 w-3 text-purple-400" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPostToFeed}
                    onChange={(e) => setAutoPostToFeed(e.target.checked)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Auto-post in community feed
                    </p>
                    <p className="text-xs text-zinc-500">
                      Members will be notified about this session
                    </p>
                  </div>
                </label>
              )}

              {/* Summary for scheduled */}
              {mode === "scheduled" && recurrence !== "once" && scheduledAt && (
                <p className="text-center text-xs text-zinc-500">
                  {getRecurrenceSummary()}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (mode === "scheduled" && (!scheduledAt || !title)) || (mode === "now" && !title)}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading
                    ? mode === "now" ? "Starting..." : "Creating..."
                    : mode === "now"
                      ? "Start Live Session"
                      : recurrence === "once"
                        ? "Create Session"
                        : "Create Sessions"}
                </button>
              </div>

              {/* Subtle count text */}
              {mode === "scheduled" && recurrence !== "once" && (
                <p className="text-center text-xs text-zinc-600">
                  {generateCount} sessions will be created
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
