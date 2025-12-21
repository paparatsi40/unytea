"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Eraser, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [isLoading, setIsLoading] = useState(true);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

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

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isModerator) return;
    
    const { x, y } = getCanvasCoordinates(e);
    setLastX(x);
    setLastY(y);
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.closePath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isModerator) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCanvasCoordinates(e);

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 10 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();

    setLastX(x);
    setLastY(y);
  };

  const clearCanvas = () => {
    if (!isModerator) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        <div className="flex items-center gap-2 border-b border-gray-200 p-3 flex-wrap">
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
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Erase
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
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
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-600 w-6">{lineWidth}</span>
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
      <div className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={2400}
          height={1350}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ imageRendering: "crisp-edges" }}
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
