"use client";

import { useState, useEffect } from "react";
import { Tldraw, TLUiOverrides } from "tldraw";
import "tldraw/tldraw.css";
import { Loader2 } from "lucide-react";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [editor, setEditor] = useState<any>(null);

  // Load saved whiteboard state
  useEffect(() => {
    if (!editor) return;

    const loadWhiteboardState = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/whiteboard`);
        if (response.ok) {
          const data = await response.json();
          if (data.snapshot) {
            editor.store.loadSnapshot(data.snapshot);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading whiteboard:", error);
        setIsLoading(false);
      }
    };

    loadWhiteboardState();
  }, [editor, sessionId]);

  // Auto-save whiteboard state
  useEffect(() => {
    if (!editor || !isModerator) return;

    const saveInterval = setInterval(async () => {
      try {
        const snapshot = editor.store.getSnapshot();
        
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
      } catch (error) {
        console.error("Error saving whiteboard:", error);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [editor, sessionId, isModerator]);

  // Custom UI overrides for read-only mode
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      if (!isModerator) {
        // Hide all tools for non-moderators (view-only mode)
        return {};
      }
      return tools;
    },
  };

  if (isLoading && editor) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Tldraw
        onMount={(editor) => setEditor(editor)}
        overrides={uiOverrides}
        options={{
          maxPages: 1,
        }}
      />
      
      {/* View-only indicator */}
      {!isModerator && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/90 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm">
          🔒 View-only mode • Only the moderator can edit
        </div>
      )}
    </div>
  );
}
