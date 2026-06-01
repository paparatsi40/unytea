"use client";

import { useState, useMemo } from "react";
import { Plus, Radio, Calendar, Clock, Video, Mic, Check } from "lucide-react";
import { createSessionOrSeries } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";

type RecurrenceType = "once" | "weekly" | "monthly";
type SessionMode = "now" | "scheduled";
type SessionType = "video" | "audio";

interface CreateSessionDialogProps {
  triggerText?: string;
  className?: string;
  communityId?: string;
  defaultDuration?: number;
  presetTitle?: string;
  presetDescription?: string;
  onSuccess?: () => void;
}

// Weekday values 0-6 (Sun-Sat); labels resolved via i18n (sessions.weekdays.*).
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

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
  triggerText,
  className,
  communityId,
  defaultDuration = 60,
  presetTitle,
  presetDescription,
  onSuccess,
}: CreateSessionDialogProps) {
  const t = useTranslations("dashboard.communityAdmin.sessions");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Mode: now or scheduled
  const [mode, setMode] = useState<SessionMode>("scheduled");

  // Session type: video or audio
  const [sessionType, setSessionType] = useState<SessionType>("video");

  // Form state
  const [title, setTitle] = useState(presetTitle || "");
  const [description, setDescription] = useState(presetDescription || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(defaultDuration);
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

  // Format date for display (locale-aware)
  const formatDate = (date: Date) => format(date, "MMM d", { locale: dfLocale });

  // Format date with day name (locale-aware)
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "EEE, MMM d, h:mm a", { locale: dfLocale });
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
          mode: sessionType === "audio" ? "AUDIO" : "VIDEO",
        });

        if (result.success) {
          const successResult = result as { success: true; session?: { id: string } };
          toast.success(t("createDialog.toasts.started"));
          setIsOpen(false);
          resetForm();
          onSuccess?.();
          router.refresh();

          // Redirect to room immediately
          if (successResult.session?.id) {
            router.push(`/dashboard/sessions/${successResult.session.id}/room`);
          }
        } else {
          const errorResult = result as { success: false; error?: string };
          toast.error(errorResult.error || t("createDialog.toasts.startFailed"));
        }
      } else {
        // Schedule session
        const scheduledDate = new Date(scheduledAt);

        const apiRepeat =
          recurrence === "once" ? "once" : recurrence === "weekly" ? "WEEKLY" : "MONTHLY";

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
          mode: sessionType === "audio" ? "AUDIO" : "VIDEO",
        });

        if (result.success) {
          const successResult = result as { success: true; type?: string; generatedCount?: number };
          toast.success(
            successResult.type === "recurring"
              ? t("createDialog.toasts.scheduledRecurring", {
                  count: successResult.generatedCount ?? 0,
                })
              : t("createDialog.toasts.scheduledOnce")
          );
          setIsOpen(false);
          resetForm();
          onSuccess?.();
          router.refresh();
        } else {
          const errorResult = result as { success: false; error?: string };
          toast.error(errorResult.error || t("createDialog.toasts.createFailed"));
        }
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(t("createDialog.toasts.unexpectedError"));
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setMode("scheduled");
    setSessionType("video");
    setDuration(defaultDuration);
    setTitle(presetTitle || "");
    setDescription(presetDescription || "");
    setScheduledAt("");
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

  // Duration field JSX - reused for both modes
  const DurationField = (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground/80">
        <Clock className="mr-1 inline h-4 w-4" />
        {t("createDialog.durationLabel")}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 30))}
          min={5}
          step={5}
          className="w-24 rounded-xl border border-border bg-background px-4 py-2.5 text-center text-foreground focus:border-purple-500 focus:outline-none"
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
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {preset}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const getRecurrenceSummary = () => {
    if (recurrence === "once") return "";
    if (recurrence === "weekly") {
      return t("createDialog.summaryWeekly", {
        count: generateCount,
        interval,
        day: t(`weekdays.${dayOfWeek}`),
      });
    }
    return t("createDialog.summaryMonthly", { count: generateCount, interval });
  };

  return (
    <>
      <button
        onClick={() => {
          setTitle(presetTitle || "");
          setDescription(presetDescription || "");
          setDuration(defaultDuration);
          setIsOpen(true);
        }}
        className={
          className ||
          "flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        }
      >
        {!className?.includes("Schedule your first") && <Plus className="h-4 w-4" />}
        {triggerText ?? t("createDialog.triggerDefault")}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">{t("createDialog.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("createDialog.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mode Selection: Now vs Scheduled */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "now"
                      ? "bg-purple-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  {t("createDialog.modeNow")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("scheduled")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "scheduled"
                      ? "bg-purple-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  {t("createDialog.modeScheduled")}
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
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  {t("createDialog.typeVideo")}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType("audio")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    sessionType === "audio"
                      ? "border-purple-500 bg-purple-500/20 text-purple-400"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  {t("createDialog.typeAudio")}
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                  {t("createDialog.titleLabel")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none"
                  placeholder={t("createDialog.titlePlaceholder")}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                  {t("createDialog.descriptionLabel")}{" "}
                  <span className="text-zinc-500">{t("createDialog.descriptionOptional")}</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none"
                  placeholder={t("createDialog.descriptionPlaceholder")}
                />
              </div>

              {/* Duration - Always visible */}
              {DurationField}

              {/* Date & Time - Only for scheduled */}
              {mode === "scheduled" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                      <Calendar className="mr-1 inline h-4 w-4" />
                      {t("createDialog.dateTimeLabel")}
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => handleDateChange(e.target.value)}
                      required={mode === "scheduled"}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-purple-500 focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90"
                    />
                    {scheduledAt && (
                      <p className="mt-1 text-sm text-purple-400">{formatDateFull(scheduledAt)}</p>
                    )}
                  </div>

                  {/* Timezone - Friendly names */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                      {t("createDialog.timezoneLabel")}
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-purple-500 focus:outline-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    {scheduledAt && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("createDialog.yourTime", { tz: timezoneLabel })}
                      </p>
                    )}
                  </div>

                  {/* Growth tip for weekly - shorter text */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-amber-300">{t("createDialog.weeklyTip")}</p>
                  </div>

                  {/* Repeat */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      {t("createDialog.repeatLabel")}
                    </label>
                    <div className="flex gap-2">
                      {(["once", "weekly", "monthly"] as const).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRecurrence(id)}
                          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            recurrence === id
                              ? "border-purple-500 bg-purple-500/20 text-purple-400"
                              : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}
                        >
                          {t(`createDialog.repeat${id.charAt(0).toUpperCase()}${id.slice(1)}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recurrence Options */}
                  {recurrence !== "once" && (
                    <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
                      {/* Interval */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t("createDialog.every")}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={interval}
                            onChange={(e) => setInterval(parseInt(e.target.value))}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm text-muted-foreground">
                            {recurrence === "weekly"
                              ? t("createDialog.intervalWeek", { count: interval })
                              : t("createDialog.intervalMonth", { count: interval })}
                          </span>
                        </div>
                      </div>

                      {/* Day of Week (for weekly) */}
                      {recurrence === "weekly" && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("createDialog.on")}
                          </span>
                          <div className="flex gap-1">
                            {WEEKDAYS.map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setDayOfWeek(value)}
                                className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                                  dayOfWeek === value
                                    ? "bg-purple-600 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                              >
                                {t(`weekdays.${value}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generate Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t("createDialog.totalSessions")}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGenerateCount(Math.max(2, generateCount - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-accent"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-medium text-foreground">
                            {generateCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGenerateCount(Math.min(12, generateCount + 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-accent"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Dates */}
                  {previewDates.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                        {t("createDialog.upcomingSessions")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {previewDates.map((date, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-muted px-2 py-1 text-xs text-foreground/80"
                          >
                            {formatDate(date)}
                          </span>
                        ))}
                        {generateCount > 6 && (
                          <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {t("createDialog.moreCount", { count: generateCount - 6 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Auto Post Toggle */}
              {communityId && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background">
                    {autoPostToFeed && <Check className="h-3 w-3 text-purple-400" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPostToFeed}
                    onChange={(e) => setAutoPostToFeed(e.target.checked)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("createDialog.autoPostTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("createDialog.autoPostHint")}
                    </p>
                  </div>
                </label>
              )}

              {/* Summary for scheduled */}
              {mode === "scheduled" && recurrence !== "once" && scheduledAt && (
                <p className="text-center text-xs text-muted-foreground">
                  {getRecurrenceSummary()}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {t("createDialog.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    (mode === "scheduled" && (!scheduledAt || !title)) ||
                    (mode === "now" && !title)
                  }
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading
                    ? mode === "now"
                      ? t("createDialog.starting")
                      : t("createDialog.creating")
                    : mode === "now"
                      ? t("createDialog.submitStartNow")
                      : recurrence === "once"
                        ? t("createDialog.submitOnce")
                        : t("createDialog.submitRecurring")}
                </button>
              </div>

              {/* Subtle count text */}
              {mode === "scheduled" && recurrence !== "once" && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("createDialog.willBeCreated", { count: generateCount })}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
