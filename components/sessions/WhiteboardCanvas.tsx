"use client";

import { useState, useEffect, useRef } from "react";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Loader2, Eraser, Pencil, Trash2, Undo, Redo, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Load saved whiteboard state
  useEffect(() => {
    const loadWhiteboardState = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/whiteboard`);
        if (response.ok) {
          const data = await response.json();
          if (data.paths && canvasRef.current) {
            await canvasRef.current.loadPaths(data.paths);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading whiteboard:", error);
        setIsLoading(false);
      }
    };

    loadWhiteboardState();
  }, [sessionId]);

  // Auto-save whiteboard state
  useEffect(() => {
    if (!isModerator || !canvasRef.current) return;

    const saveInterval = setInterval(async () => {
      try {
        const paths = await canvasRef.current?.exportPaths();
        
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths }),
        });
      } catch (error) {
        console.error("Error saving whiteboard:", error);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [sessionId, isModerator]);

  const handleClear = () => {
    if (!isModerator) return;
    canvasRef.current?.clearCanvas();
  };

  const handleUndo = () => {
    if (!isModerator) return;
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    if (!isModerator) return;
    canvasRef.current?.redo();
  };

  const handleExport = async () => {
    try {
      const imageData = await canvasRef.current?.exportImage("png");
      if (imageData) {
        const link = document.createElement("a");
        link.href = imageData;
        link.download = `whiteboard-${sessionId}.png`;
        link.click();
      }
    } catch (error) {
      console.error("Error exporting whiteboard:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Toolbar */}
      {isModerator && (
        <div className="flex items-center gap-2 border-b border-gray-200 p-3 flex-wrap bg-gray-50">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Draw
          </Button>
          
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => {
              setTool("eraser");
              canvasRef.current?.eraseMode(true);
            }}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Erase
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
          >
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setTool("pen");
                canvasRef.current?.eraseMode(false);
              }}
              className="h-8 w-12 cursor-pointer rounded border border-gray-300"
              title="Color"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-600 w-6">{strokeWidth}</span>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={handleClear}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={tool === "eraser" ? "#ffffff" : color}
          canvasColor="#ffffff"
          style={{
            border: "none",
            borderRadius: "0",
            width: "100%",
            height: "100%",
            pointerEvents: isModerator ? "auto" : "none",
          }}
          exportWithBackgroundImage={false}
          allowOnlyPointerType="all"
          withTimestamp={false}
        />
      </div>

      {/* View-only indicator */}
      {!isModerator && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            🔒 View-only mode • Only the moderator can draw
          </p>
        </div>
      )}
    </div>
  );
}
