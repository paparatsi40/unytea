"use client";

import { Video, Monitor, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionMode = "video" | "screen" | "whiteboard";

interface ModeSwitcherProps {
  currentMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  hasWhiteboard?: boolean;
}

const MODES = [
  { id: "video" as SessionMode, label: "Video", icon: Video },
  { id: "screen" as SessionMode, label: "Screen", icon: Monitor },
  { id: "whiteboard" as SessionMode, label: "Whiteboard", icon: Pencil },
];

export function ModeSwitcher({
  currentMode,
  onModeChange,
  hasWhiteboard = false,
}: ModeSwitcherProps) {
  const availableModes = MODES.filter((mode) => {
    if (mode.id === "whiteboard" && !hasWhiteboard) return false;
    return true;
  });

  return (
    <div className="flex items-center">
      {availableModes.map((mode, index) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        const isFirst = index === 0;
        const isLast = index === availableModes.length - 1;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all duration-200",
              isFirst && "rounded-l-full",
              isLast && "rounded-r-full",
              isActive
                ? "bg-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
