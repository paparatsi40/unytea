"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    ),
  }
);

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Load saved whiteboard state
  useEffect(() => {
    if (!excalidrawAPI) return;

    const loadWhiteboardState = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/whiteboard`);
        if (response.ok) {
          const data = await response.json();
          if (data.elements) {
            excalidrawAPI.updateScene(data);
          }
        }
      } catch (error) {
        console.error("Error loading whiteboard:", error);
      }
    };

    loadWhiteboardState();
  }, [excalidrawAPI, sessionId]);

  // Auto-save whiteboard state
  useEffect(() => {
    if (!excalidrawAPI || !isModerator) return;

    const saveInterval = setInterval(async () => {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      try {
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              currentItemFontFamily: appState.currentItemFontFamily,
            },
          }),
        });
      } catch (error) {
        console.error("Error saving whiteboard:", error);
      }
    }, 3000); // Save every 3 seconds

    return () => clearInterval(saveInterval);
  }, [excalidrawAPI, sessionId, isModerator]);

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemFontFamily: 1,
          },
        }}
        viewModeEnabled={!isModerator}
        zenModeEnabled={false}
        gridModeEnabled={true}
        theme="light"
      />
    </div>
  );
}
