"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues
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
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SessionWhiteboard({ isOpen, onClose, sessionId }: SessionWhiteboardProps) {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-purple-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">Whiteboard</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                Session {sessionId.slice(-6)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Export PNG */}
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
                title="Export as PNG"
              >
                <ImageIcon className="h-4 w-4" />
                Export PNG
              </button>
              
              {/* Clear */}
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
                title="Clear canvas"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                title="Close Whiteboard"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Excalidraw Canvas */}
          <div className="flex-1 overflow-hidden">
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
      )}
    </AnimatePresence>
  );
}
