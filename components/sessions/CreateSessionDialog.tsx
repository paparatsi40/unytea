"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createSession } from "@/app/actions/sessions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CreateSessionDialogProps {
  triggerText?: string;
}

export function CreateSessionDialog({ triggerText = "Create Session" }: CreateSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const scheduledAt = new Date(formData.get("scheduledAt") as string);
    const duration = parseInt(formData.get("duration") as string);

    const result = await createSession({
      title,
      description,
      scheduledAt,
      duration,
    });

    if (result.success) {
      toast.success("Session created successfully!");
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create session");
    }

    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        {triggerText}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Create Video Session
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Team standup"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  required
                  min="15"
                  max="240"
                  defaultValue="60"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}