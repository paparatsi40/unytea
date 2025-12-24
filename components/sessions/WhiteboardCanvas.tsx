"use client";

import { useState, useEffect, useRef } from "react";
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

type Tool = "select" | "draw" | "text" | "rectangle" | "circle" | "line" | "eraser";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId: _sessionId, isModerator }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!isClient) {
      console.log("⏳ Waiting for client-side rendering...");
      return;
    }

    let mounted = true;
    
    const initCanvas = async () => {
      // Prevent multiple initializations
      if (initializingRef.current || fabricCanvasRef.current) {
        console.log("⚠️ Already initializing or initialized");
        return;
      }
      
      // Wait for canvas ref
      if (!canvasRef.current) {
        console.log("⚠️ Canvas ref not available yet");
        return;
      }

      initializingRef.current = true;
      console.log("🎨 Initializing Fabric.js canvas...");

      try {
        const { Canvas } = await import("fabric");
        
        if (!mounted || fabricCanvasRef.current) {
          console.log("⚠️ Component unmounted or already initialized");
          return;
        }

        const fabricCanvas = new Canvas(canvasRef.current, {
          width: 1200,
          height: 700,
          backgroundColor: "#ffffff",
        });

        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = color;
          fabricCanvas.freeDrawingBrush.width = strokeWidth;
        }

        fabricCanvasRef.current = fabricCanvas;
        console.log("✅ Canvas initialized successfully");
        
        if (mounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.error("❌ Failed to initialize canvas:", error);
        setIsReady(true); // Show UI anyway
      } finally {
        initializingRef.current = false;
      }
    };

    // Larger delay to ensure DOM is fully ready
    const timer = setTimeout(initCanvas, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [isClient]);

  // Update drawing settings
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === "draw";
    canvas.selection = tool === "select";

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [tool, color, strokeWidth]);

  // Tool handlers
  const handleAddText = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { IText } = await import("fabric");
      const text = new IText("Double click to edit", {
        left: 100,
        top: 100,
        fill: color,
        fontSize: 24,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
    } catch (error) {
      console.error("Failed to add text:", error);
    }
  };

  const handleAddRectangle = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { Rect } = await import("fabric");
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 100,
        fill: "transparent",
        stroke: color,
        strokeWidth: strokeWidth,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
    } catch (error) {
      console.error("Failed to add rectangle:", error);
    }
  };

  const handleAddCircle = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    try {
      const { Circle } = await import("fabric");
      const circle = new Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: "transparent",
        stroke: color,
        strokeWidth: strokeWidth,
      });
      canvas.add(circle);
      canvas.setActiveObject(circle);
      canvas.renderAll();
    } catch (error) {
      console.error("Failed to add circle:", error);
    }
  };

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
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

  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isModerator) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.remove(...activeObjects);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Initializing whiteboard...</p>
        </div>
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

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTool("text");
              handleAddText();
            }}
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddRectangle}
          >
            <Square className="h-4 w-4 mr-1" />
            Rectangle
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddCircle}
          >
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

          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>

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
            Clear All
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto bg-gray-100 flex items-center justify-center p-4">
        <canvas 
          ref={canvasRef}
          className="shadow-lg border border-gray-300"
          style={{ 
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        />
      </div>

      {/* View-only indicator */}
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
