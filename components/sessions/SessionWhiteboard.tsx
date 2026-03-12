"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brush, Eraser, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  color: string;
  size: number;
  mode: "draw" | "erase";
  points: Point[];
};

interface SessionWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

const COLORS = [
  "#ffffff",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

export function SessionWhiteboard({
  isOpen,
  onClose,
  sessionId,
}: SessionWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);

  const storageKey = useMemo(
    () => `mentorly:whiteboard:${sessionId}`,
    [sessionId]
  );

  useEffect(() => {
    if (!isOpen) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Stroke[];
      if (Array.isArray(parsed)) {
        setStrokes(parsed);
      }
    } catch (error) {
      console.error("Failed to load whiteboard state:", error);
    }
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(strokes));
    } catch (error) {
      console.error("Failed to save whiteboard state:", error);
    }
  }, [strokes, isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      redrawAll();
    };

    const timer = window.setTimeout(resizeCanvas, 0);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isOpen, strokes]);

  const getCanvasPoint = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    preview = false
  ) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.mode === "erase" ? "#111827" : stroke.color;
    ctx.globalCompositeOperation =
      stroke.mode === "erase" ? "destination-out" : "source-over";

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
      if (stroke.mode === "erase") {
        ctx.fillStyle = "#000";
      } else {
        ctx.fillStyle = stroke.color;
      }
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i += 1) {
      const p = stroke.points[i];
      ctx.lineTo(p.x, p.y);
    }

    if (preview) {
      ctx.globalAlpha = 1;
    }

    ctx.stroke();
    ctx.restore();
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    redrawAll();
  }, [strokes, isOpen]);

  const startStroke = (point: Point) => {
    setIsDrawing(true);
    setStrokes((prev) => [
      ...prev,
      {
        color,
        size: brushSize,
        mode: tool,
        points: [point],
      },
    ]);
  };

  const appendPoint = (point: Point) => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;

      const next = [...prev];
      const last = next[next.length - 1];

      next[next.length - 1] = {
        ...last,
        points: [...last.points, point],
      };

      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    startStroke(point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    appendPoint(point);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearBoard = () => {
    setStrokes([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full flex-col bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Whiteboard</h2>
            <p className="text-xs text-zinc-400">Session: {sessionId}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={tool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("draw")}
              className="border-zinc-700"
            >
              <Brush className="mr-2 h-4 w-4" />
              Draw
            </Button>

            <Button
              type="button"
              variant={tool === "erase" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("erase")}
              className="border-zinc-700"
            >
              <Eraser className="mr-2 h-4 w-4" />
              Erase
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearBoard}
              className="border-zinc-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear
            </Button>

            <Button type="button" variant="destructive" size="sm" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Color</span>
            <div className="flex items-center gap-2">
              {COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setColor(item);
                    setTool("draw");
                  }}
                  className={`h-7 w-7 rounded-full border-2 ${
                    color === item ? "border-white" : "border-zinc-700"
                  }`}
                  style={{ backgroundColor: item }}
                  aria-label={`Select color ${item}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Brush</span>
            <input
              type="range"
              min={2}
              max={24}
              step={1}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-40"
            />
            <span className="min-w-[24px] text-xs text-zinc-300">{brushSize}</span>
          </div>
        </div>

        <div ref={containerRef} className="relative min-h-0 flex-1 bg-zinc-900">
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerLeave={endDrawing}
            onPointerCancel={endDrawing}
          />
        </div>
      </div>
    </div>
  );
}