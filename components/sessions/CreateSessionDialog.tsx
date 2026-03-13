"use client";

import { useState } from "react";
import { Plus, Repeat, Calendar, Clock } from "lucide-react";
import { createSession } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type RecurrenceType = "once" | "weekly" | "monthly";

interface CreateSessionDialogProps {
  triggerText?: string;
  className?: string;
  communityId?: string; // Optional: if provided, session will be linked to this community
  onSuccess?: () => void;
}

export function CreateSessionDialog({ 
  triggerText = "Create Session", 
  className, 
  communityId,
  onSuccess 
}: CreateSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const scheduledAt = new Date(formData.get("scheduledAt") as string);
    const duration = parseInt(formData.get("duration") as string);

    // Create session with communityId if provided
    const result = await createSession({
      title,
      description,
      scheduledAt,
      duration,
      communityId,
      recurrence: recurrence === "once" ? undefined : recurrence,
      recurrenceCount: recurrence === "once" ? undefined : recurrenceCount,
    });

    if (result.success) {
      toast.success("Session created successfully!");
      setIsOpen(false);
      onSuccess?.();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create session");
    }

    setIsLoading(false);
  };

  const getRecurrenceLabel = () => {
    switch (recurrence) {
      case "weekly":
        return `${recurrenceCount} weekly sessions`;
      case "monthly":
        return `${recurrenceCount} monthly sessions`;
      default:
        return "One-time session";
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className || "flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"}
      >
        {!className?.includes("Schedule your first") && <Plus className="h-4 w-4" />}
        {triggerText}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Schedule Session
              </h2>
              <p className="text-sm text-zinc-400">
                Create a live session for your community
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
                  name="title"
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
                  name="description"
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
                    name="scheduledAt"
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
                    name="duration"
                    required
                    defaultValue="60"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  <Repeat className="mr-1 inline h-4 w-4" />
                  Repeat Session
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

                {/* Recurrence count selector */}
                {recurrence !== "once" && (
                  <div className="mt-3 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <span className="text-sm text-zinc-400">Create</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRecurrenceCount(Math.max(2, recurrenceCount - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium text-white">
                        {recurrenceCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecurrenceCount(Math.min(12, recurrenceCount + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-zinc-400">
                      {recurrence === "weekly" ? "weekly sessions" : "monthly sessions"}
                    </span>
                  </div>
                )}

                {/* Preview */}
                {recurrence !== "once" && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Creating {getRecurrenceLabel()}. First session on the selected date.
                  </p>
                )}
              </div>

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
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading 
                    ? "Creating..." 
                    : recurrence === "once" 
                      ? "Create Session" 
                      : `Create ${recurrenceCount} Sessions`
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
