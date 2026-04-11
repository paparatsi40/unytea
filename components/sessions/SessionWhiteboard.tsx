"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading whiteboard...</p>
        </div>
      </div>
    ),
  }
);

interface SessionWhiteboardProps {
  onClose: () => void;
  sessionId: string;
  embedded?: boolean;
}

export function SessionWhiteboard({ onClose, sessionId, embedded = false }: SessionWhiteboardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const handleExportPNG = async () => {
    if (!excalidrawAPI) return;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${sessionId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const handleClear = () => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements: [] });
    }
  };

  // Embedded mode - integrated into the layout
  if (embedded) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              title="Export as PNG"
            >
              <ImageIcon className="h-4 w-4" />
              Export PNG
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              title="Clear canvas"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            theme="light"
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: false,
                export: false,
                saveToActiveFile: false,
                saveAsImage: false,
                toggleTheme: false,
              },
            }}
          />
        </div>
      </div>
    );
  }

  // Fullscreen modal mode
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">Whiteboard</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
            Session {sessionId.slice(-6)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            title="Export as PNG"
          >
            <ImageIcon className="h-4 w-4" />
            Export PNG
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            title="Clear canvas"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>

          <button
            onClick={onClose}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Close Whiteboard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="light"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </motion.div>
  );
}
