"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Pencil,
  Type,
  Square,
  Circle as CircleIcon,
  MousePointer,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tool = "select" | "draw" | "text" | "rectangle" | "circle";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId: _sessionId, isModerator }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);

  const [isReady, setIsReady] = useState(false);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const updateObjectInteractivity = (canvas: any, enabled: boolean) => {
    canvas.getObjects().forEach((obj: any) => {
      obj.selectable = enabled;
      obj.evented = enabled;
    });
  };

  // Init Fabric once
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!canvasRef.current || fabricCanvasRef.current) return;

      try {
        const { Canvas } = await import("fabric");
        if (!mounted || !canvasRef.current) return;

        const fabricCanvas = new Canvas(canvasRef.current, {
          backgroundColor: "#ffffff",
        });

        fabricCanvasRef.current = fabricCanvas;

        // Default: draw mode
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.selection = false;
        updateObjectInteractivity(fabricCanvas, false);

        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = color;
          fabricCanvas.freeDrawingBrush.width = strokeWidth;
        }

        fabricCanvas.renderAll();
      } catch (err) {
        console.error("❌ Failed to initialize Fabric canvas:", err);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize Fabric canvas to our container (NOT the Fabric wrapper)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const applySize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      // Backstore + CSS size
      canvas.setWidth(rect.width);
      canvas.setHeight(rect.height);

      // Ensure Fabric's wrapper matches container too
      if (canvas.wrapperEl) {
        canvas.wrapperEl.style.width = `${rect.width}px`;
        canvas.wrapperEl.style.height = `${rect.height}px`;
      }

      // Important after resizing
      canvas.calcOffset();
      canvas.requestRenderAll?.() ?? canvas.renderAll();
    };

    // ResizeObserver handles fullscreen/tabs/layout changes reliably
    const ro = new ResizeObserver(() => applySize());
    ro.observe(container);

    // Also apply once immediately (and next frame)
    applySize();
    const raf = requestAnimationFrame(applySize);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isReady]);

  // Tool + brush updates
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isSelect = tool === "select";
    const isDraw = tool === "draw";

    canvas.isDrawingMode = isDraw;
    canvas.selection = isSelect;

    updateObjectInteractivity(canvas, isSelect);

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    canvas.requestRenderAll?.() ?? canvas.renderAll();
  }, [tool, color, strokeWidth]);

  const handleAddText = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { IText } = await import("fabric");

      // Exit drawing mode so text edits properly
      canvas.isDrawingMode = false;
      setTool("select");

      const text = new IText("Double click to edit", {
        left: 80,
        top: 80,
        fill: color,
        fontSize: 24,
        editable: true,
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll?.() ?? canvas.renderAll();
    } catch (err) {
      console.error("Failed to add text:", err);
    }
  };

  const handleAddRectangle = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { Rect } = await import("fabric");

      const rect = new Rect({
        left: 80,
        top: 120,
        width: 220,
        height: 120,
        fill: "transparent",
        stroke: color,
        strokeWidth,
        selectable: true,
        evented: true,
      });

      canvas.add(rect);
      setTool("select");
      canvas.setActiveObject(rect);
      canvas.requestRenderAll?.() ?? canvas.renderAll();
    } catch (err) {
      console.error("Failed to add rectangle:", err);
    }
  };

  const handleAddCircle = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { Circle } = await import("fabric");

      const circle = new Circle({
        left: 80,
        top: 120,
        radius: 60,
        fill: "transparent",
        stroke: color,
        strokeWidth,
        selectable: true,
        evented: true,
      });

      canvas.add(circle);
      setTool("select");
      canvas.setActiveObject(circle);
      canvas.requestRenderAll?.() ?? canvas.renderAll();
    } catch (err) {
      console.error("Failed to add circle:", err);
    }
  };

  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    const active = canvas.getActiveObjects();
    if (!active.length) return;

    canvas.remove(...active);
    canvas.discardActiveObject();
    canvas.requestRenderAll?.() ?? canvas.renderAll();
  };

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    canvas.remove(...canvas.getObjects());
    canvas.backgroundColor = "#ffffff";
    canvas.discardActiveObject();
    canvas.requestRenderAll?.() ?? canvas.renderAll();
  };

  const handleExport = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `whiteboard-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Toolbar */}
      {isModerator && (
        <div className="flex items-center gap-2 border-b border-gray-200 p-3 flex-wrap bg-gray-50">
          <Button
            size="sm"
            variant={tool === "select" ? "default" : "outline"}
            onClick={() => setTool("select")}
          >
            <MousePointer className="h-4 w-4 mr-1" />
            Select
          </Button>

          <Button
            size="sm"
            variant={tool === "draw" ? "default" : "outline"}
            onClick={() => setTool("draw")}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Draw
          </Button>

          <Button size="sm" variant="outline" onClick={handleAddText}>
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>

          <Button size="sm" variant="outline" onClick={handleAddRectangle}>
            <Square className="h-4 w-4 mr-1" />
            Rectangle
          </Button>

          <Button size="sm" variant="outline" onClick={handleAddCircle}>
            <CircleIcon className="h-4 w-4 mr-1" />
            Circle
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-gray-300"
            title="Color"
          />

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

          <Button size="sm" variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <Button size="sm" variant="outline" onClick={handleExport}>
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
            Clear All
          </Button>
        </div>
      )}

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-100">
        {/* Important: DO NOT absolute-position the canvas. Let Fabric wrap it. */}
        <canvas ref={canvasRef} />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Initializing whiteboard...</p>
            </div>
          </div>
        )}
      </div>

      {!isModerator && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            👁️ View-only mode • Only the moderator can edit
          </p>
        </div>
      )}
    </div>
  );
}
