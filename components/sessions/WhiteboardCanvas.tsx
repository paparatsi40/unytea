"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Eraser, Pencil, Undo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [isLoading, setIsLoading] = useState(true);

  // Load saved whiteboard state
  useEffect(() => {
    const loadWhiteboardState = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/whiteboard`);
        if (response.ok) {
          const data = await response.json();
          if (data.imageData && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            const img = new Image();
            img.onload = () => {
              ctx?.drawImage(img, 0, 0);
              setIsLoading(false);
            };
            img.src = data.imageData;
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
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
      const canvas = canvasRef.current;
      if (!canvas) return;

      const imageData = canvas.toDataURL("image/png");

      try {
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData }),
        });
      } catch (error) {
        console.error("Error saving whiteboard:", error);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [sessionId, isModerator]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isModerator) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== "mousedown") return;
    if (!isModerator) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = tool === "eraser" ? lineWidth * 5 : lineWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (!isModerator) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        <div className="flex items-center gap-2 border-b border-gray-200 p-3">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Pen
          </Button>
          
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Eraser
          </Button>

          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm font-medium">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-16 cursor-pointer rounded border border-gray-300"
            />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm font-medium">Size:</label>
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-6">{lineWidth}</span>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={clearCanvas}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
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
