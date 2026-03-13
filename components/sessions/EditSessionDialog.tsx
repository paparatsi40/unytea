"use client";

import { useState, useMemo } from "react";
import { Edit2, AlertCircle, Repeat, Calendar, Clock } from "lucide-react";
import { editSession, editSeriesFromSession } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type EditScope = "this" | "future";

interface EditSessionDialogProps {
  session: {
    id: string;
    title: string;
    description?: string | null;
    scheduledAt: Date;
    duration: number;
    timezone?: string;
    seriesId?: string | null;
    isException?: boolean;
    mentorId: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditSessionDialog({
  session,
  trigger,
  onSuccess,
}: EditSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<EditScope>("this");
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description || "");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(session.scheduledAt).toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState(session.duration);
  const [timezone, setTimezone] = useState(
    session.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );

  const isRecurring = !!session.seriesId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const scheduledDate = new Date(scheduledAt);
      let result;

      if (isRecurring && scope === "future") {
        // Edit series from this session onward
        result = await editSeriesFromSession(session.id, {
          title,
          description,
          scheduledAt: scheduledDate,
          duration,
        });
      } else {
        // Edit just this session instance
        result = await editSession(session.id, {
          title,
          description,
          scheduledAt: scheduledDate,
          duration,
        });
      }

      if (result.success) {
        toast.success(
          scope === "future" && isRecurring
            ? "Series updated! Future sessions regenerated."
            : "Session updated successfully!"
        );
        setIsOpen(false);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update session");
      }
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("An unexpected error occurred");
    }

    setIsLoading(false);
  };

  // Scope selector for recurring sessions
  const ScopeSelector = () => {
    if (!isRecurring) return null;

    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-200">
              This session is part of a recurring series
            </h4>
            <p className="mt-1 text-sm text-amber-300/80">
              Choose how to apply your changes:
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/20 bg-black/20 p-3 transition-colors hover:bg-black/30">
                <input
                  type="radio"
                  name="editScope"
                  value="this"
                  checked={scope === "this"}
                  onChange={() => setScope("this")}
                  className="mt-1 h-4 w-4 accent-amber-500"
                />
                <div>
                  <span className="font-medium text-white">This session only</span>
                  <p className="text-sm text-zinc-400">
                    Only modify this instance. Future sessions stay unchanged.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/20 bg-black/20 p-3 transition-colors hover:bg-black/30">
                <input
                  type="radio"
                  name="editScope"
                  value="future"
                  checked={scope === "future"}
                  onChange={() => setScope("future")}
                  className="mt-1 h-4 w-4 accent-amber-500"
                />
                <div>
                  <span className="font-medium text-white">
                    This and future sessions
                  </span>
                  <p className="text-sm text-zinc-400">
                    Update series rules and regenerate all future sessions from this point.
                  </p>
                  <p className="mt-1 text-xs text-amber-400/80">
                    ⚠️ This will delete and recreate future unmodified sessions.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </button>
      )}

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
                {isRecurring ? "Edit Session" : "Edit Session"}
              </h2>
              <p className="text-sm text-zinc-400">
                {isRecurring
                  ? "Modify this session or update the entire series"
                  : "Update your session details"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Scope Selector (only for recurring) */}
              {isRecurring && <ScopeSelector />}

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
                    onChange={(e) => setScheduledAt(e.target.value)}
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
              </div>

              {/* Info for recurring sessions */}
              {isRecurring && scope === "this" && (
                <p className="text-xs text-zinc-500">
                  This change will only affect this specific session. The rest
                  of the series will continue as scheduled.
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
                  disabled={isLoading || !scheduledAt || !title}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading
                    ? "Saving..."
                    : isRecurring && scope === "future"
                      ? "Update Series"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
