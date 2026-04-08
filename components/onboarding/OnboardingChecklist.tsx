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
    if (completed === total && total > 0) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [completed, total]);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              Getting Started
            </p>
            <p className="text-xs text-gray-500">
              {completed}/{total} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progress === 100 ? "bg-emerald-500" : "bg-purple-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">{progress}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              onDismiss?.();
            }}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {/* Items */}
      {isOpen && (
        <div className="border-t border-gray-100 px-5 pb-4">
          <div className="mt-2 space-y-0.5">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  item.completed
                    ? "opacity-50"
                    : "hover:bg-gray-50"
                }`}
              >
                {item.completed ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      item.completed
                        ? "text-gray-400 line-through"
                        : "font-medium text-gray-900"
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.completed && (
                    <p className="text-xs text-gray-500">{item.description}</p>
                  )}
                </div>
                {!item.completed && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
