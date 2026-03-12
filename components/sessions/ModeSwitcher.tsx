"use client";

import { Video, Monitor, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SessionMode = "video" | "screen" | "whiteboard";

interface ModeSwitcherProps {
  currentMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  hasWhiteboard?: boolean;
  hasScreenShare?: boolean;
}

const modes: { id: SessionMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "screen", label: "Screen", icon: Monitor },
  { id: "whiteboard", label: "Whiteboard", icon: Pencil },
];

export function ModeSwitcher({
  currentMode,
  onModeChange,
  hasWhiteboard = true,
  hasScreenShare = true,
}: ModeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
      {modes.map((mode) => {
        // Skip screen mode if not available
        if (mode.id === "screen" && !hasScreenShare) return null;
        // Skip whiteboard mode if not available
        if (mode.id === "whiteboard" && !hasWhiteboard) return null;

        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <Button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex items-center gap-2 px-3",
              isActive
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
