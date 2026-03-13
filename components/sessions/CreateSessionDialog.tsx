"use client";

import { useState } from "react";
import { Plus, Repeat, Calendar, Clock } from "lucide-react";
import { createSessionOrSeries } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type RecurrenceType = "once" | "weekly" | "monthly";

interface CreateSessionDialogProps {
  triggerText?: string;
  className?: string;
  communityId?: string;
  onSuccess?: () => void;
}

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function CreateSessionDialog({
  triggerText = "Create Session",
  className,
  communityId,
  onSuccess,
}: CreateSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [interval, setInterval] = useState(1); // every 1 week/month
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday default
  const [generateCount, setGenerateCount] = useState(8);

  // Update dayOfWeek when date changes (for weekly recurrence)
  const handleDateChange = (value: string) => {
    setScheduledAt(value);
    if (value) {
      const day = new Date(value).getDay();
      setDayOfWeek(day);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const scheduledDate = new Date(scheduledAt);

      const result = await createSessionOrSeries({
        title,
        description,
        scheduledAt: scheduledDate,
        duration,
        timezone,
        communityId,
        postToFeed: true,
        // Recurrence fields
        repeat: recurrence,
        interval: recurrence === "once" ? undefined : interval,
        dayOfWeek: recurrence === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: recurrence === "monthly" ? scheduledDate.getDate() : undefined,
        generateCount: recurrence === "once" ? undefined : generateCount,
      });

      if (result.success) {
        toast.success(
          result.type === "recurring"
            ? `Created ${result.generatedCount} sessions in series!`
            : "Session created successfully!"
        );
        setIsOpen(false);
        resetForm();
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create session");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("An unexpected error occurred");
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setDuration(60);
    setRecurrence("once");
    setInterval(1);
    setDayOfWeek(1);
    setGenerateCount(8);
  };

  const getRecurrenceSummary = () => {
    if (recurrence === "once") return "One-time session";

    const intervalText = interval === 1 ? "" : `every ${interval} `;
    const frequencyText = recurrence === "weekly" ? "weeks" : "months";
    const weekdayText =
      recurrence === "weekly"
        ? `on ${WEEKDAYS.find((d) => d.value === dayOfWeek)?.label}s`
        : "";

    return `${generateCount} sessions, ${intervalText}${frequencyText} ${weekdayText}`.trim();
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                {recurrence === "once" ? "Schedule Session" : "Create Recurring Series"}
              </h2>
              <p className="text-sm text-zinc-400">
                {recurrence === "once"
                  ? "Create a live session for your community"
                  : "Set up a recurring session series"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    <Clock className="mr-1 inline h-4 w-4" />
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., America/New_York"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Defaults to your local timezone
                </p>
              </div>

              {/* Recurrence Toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  <Repeat className="mr-1 inline h-4 w-4" />
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
                    <span className="text-sm text-zinc-400">Repeat every</span>
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
                        {interval === 1
                          ? recurrence === "weekly"
                            ? "week"
                            : "month"
                          : recurrence === "weekly"
                            ? "weeks"
                            : "months"}
                      </span>
                    </div>
                  </div>

                  {/* Day of Week (for weekly) */}
                  {recurrence === "weekly" && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">On</span>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                      >
                        {WEEKDAYS.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Generate Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Create</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGenerateCount(Math.max(2, generateCount - 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium text-white">
                        {generateCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGenerateCount(Math.min(12, generateCount + 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-zinc-400">sessions</span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-zinc-500">
                    Creating {getRecurrenceSummary()}. First session on{" "}
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleDateString()
                      : "selected date"}
                    .
                  </p>
                </div>
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
                  disabled={isLoading || !scheduledAt || !title}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading
                    ? "Creating..."
                    : recurrence === "once"
                      ? "Create Session"
                      : `Create ${generateCount} Sessions`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
