"use client";

import { useState } from "react";
import { Hand, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HandRaiseEntry } from "@/hooks/use-hand-raise";
import { formatDistanceToNow } from "date-fns";

interface HandRaiseQueueProps {
  queue: HandRaiseEntry[];
  onLowerHand: (participantId: string) => void;
  onClearAll: () => void;
  isModerator?: boolean;
}

export function HandRaiseQueue({
  queue,
  onLowerHand,
  onClearAll,
  isModerator = false,
}: HandRaiseQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-20 w-80 rounded-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Hand className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Raised Hands</h3>
            <p className="text-xs text-muted-foreground">
              {queue.length} {queue.length === 1 ? "person" : "people"} waiting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isModerator && queue.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="h-7 px-2"
              title="Clear all hands"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Queue List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto p-2">
          {queue.map((entry, index) => (
            <div
              key={entry.participantId}
              className="group flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Position Badge */}
                <Badge
                  variant={index === 0 ? "default" : "outline"}
                  className="h-6 w-6 flex items-center justify-center p-0 flex-shrink-0"
                >
                  {index + 1}
                </Badge>

                {/* Participant Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {entry.participantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {isModerator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLowerHand(entry.participantId)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                  title="Lower hand"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer tip */}
      {isExpanded && isModerator && (
        <div className="border-t border-border px-4 py-2 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Click X to lower someone's hand
          </p>
        </div>
      )}
    </div>
  );
}
