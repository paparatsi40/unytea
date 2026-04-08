"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, X, ChevronRight, Sparkles } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  items,
  onDismiss,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    // Auto-dismiss when all complete
    if (completed === total && total > 0) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [completed, total]);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-indigo-950/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">
              Getting Started
            </p>
            <p className="text-xs text-zinc-500">
              {completed}/{total} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progress === 100
                  ? "bg-emerald-500"
                  : "bg-purple-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{progress}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              onDismiss?.();
            }}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {/* Items */}
      {isOpen && (
        <div className="border-t border-zinc-800/50 px-4 pb-4">
          <div className="mt-3 space-y-1">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                  item.completed
                    ? "opacity-60"
                    : "hover:bg-zinc-800/50"
                }`}
              >
                {item.completed ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-zinc-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      item.completed
                        ? "text-zinc-500 line-through"
                        : "text-white"
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.completed && (
                    <p className="text-xs text-zinc-500">{item.description}</p>
                  )}
                </div>
                {!item.completed && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
