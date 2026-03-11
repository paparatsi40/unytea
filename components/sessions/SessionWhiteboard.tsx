"use client";

import { useState, useCallback } from "react";
import { Tldraw, exportAs, exportToBlob } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { X, Download, Image as ImageIcon, FileJson } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SessionWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SessionWhiteboard({ isOpen, onClose, sessionId }: SessionWhiteboardProps) {
  const [editor, setEditor] = useState<any>(null);

  const handleMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
  }, []);

  const handleExportPNG = async () => {
    if (!editor) return;
    
    try {
      const blob = await exportToBlob({
        editor,
        ids: editor.getCurrentPageShapeIds(),
        format: "png",
        opts: { background: true },
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

  const handleExportJSON = () => {
    if (!editor) return;
    
    try {
      const snapshot = editor.store.getSnapshot();
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${sessionId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON:", error);
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
              {/* Export Buttons */}
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
                title="Export as PNG"
              >
                <ImageIcon className="h-4 w-4" />
                PNG
              </button>
              
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
                title="Export as JSON"
              >
                <FileJson className="h-4 w-4" />
                JSON
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                title="Close Whiteboard"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Whiteboard Canvas */}
          <div className="flex-1 overflow-hidden">
            <Tldraw
              onMount={handleMount}
              className="h-full w-full"
            />
          </div>

          {/* Footer Tips */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
            <p className="text-xs text-gray-500">
              <strong>Tips:</strong> Double-click to add text • Drag to select • Right-click for menu • Use toolbar for shapes
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
