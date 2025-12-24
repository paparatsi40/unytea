"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Pencil, 
  Type, 
  Square, 
  Circle as CircleIcon, 
  Minus,
  MousePointer,
  Trash2, 
  Undo, 
  Redo, 
  Download,
  Eraser
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tool = "select" | "draw" | "text" | "rectangle" | "circle" | "line" | "eraser";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function WhiteboardCanvas({ sessionId, isModerator }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Load Fabric.js dynamically
  useEffect(() => {
    const loadFabric = async () => {
      try {
        const fabric = await import("fabric");
        setFabricLoaded(true);
        
        if (!canvasRef.current || fabricRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
          width: 1920,
          height: 1080,
          backgroundColor: "#ffffff",
          isDrawingMode: tool === "draw",
          selection: tool === "select",
        });

        // Configure drawing brush
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = color;
          canvas.freeDrawingBrush.width = strokeWidth;
        }

        fabricRef.current = canvas;

        // Load saved whiteboard
        await loadWhiteboard(canvas);

        // Save to history on object added
        canvas.on("object:added", () => {
          saveToHistory(canvas);
        });

        canvas.on("object:modified", () => {
          saveToHistory(canvas);
        });
      } catch (error) {
        console.error("Error loading Fabric.js:", error);
        setIsLoading(false);
      }
    };

    loadFabric();

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, []);

  // Load whiteboard state
  const loadWhiteboard = async (canvas: any) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`/api/sessions/${sessionId}/whiteboard`, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.canvasData) {
          canvas.loadFromJSON(data.canvasData, () => {
            canvas.renderAll();
            setIsLoading(false);
          });
          return;
        }
      }
    } catch (error) {
      // Silently fail - just show empty canvas
    }
    
    // Always set loading to false after timeout or error
    setIsLoading(false);
  };

  // Auto-save whiteboard
  useEffect(() => {
    if (!fabricRef.current || !isModerator || !fabricLoaded) return;

    const saveInterval = setInterval(async () => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      try {
        const canvasData = canvas.toJSON();
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasData }),
        });
      } catch (error) {
        // Silently fail
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [sessionId, isModerator, fabricLoaded]);

  // Save to history
  const saveToHistory = (canvas: any) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      return newHistory;
    });
    setHistoryStep((prev) => prev + 1);
  };

  // Update tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !fabricLoaded) return;

    canvas.isDrawingMode = tool === "draw";
    canvas.selection = tool === "select";

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [tool, color, strokeWidth, fabricLoaded]);

  // Tool handlers
  const handleAddText = async () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    const fabric = await import("fabric");
    const text = new fabric.IText("Double click to edit", {
      left: 100,
      top: 100,
      fill: color,
      fontSize: 24,
      fontFamily: "Arial",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const handleAddRectangle = async () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    const fabric = await import("fabric");
    const rect = new fabric.Rect({
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
  };

  const handleAddCircle = async () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    const fabric = await import("fabric");
    const circle = new fabric.Circle({
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
  };

  const handleAddLine = async () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    const fabric = await import("fabric");
    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: color,
      strokeWidth: strokeWidth,
    });

    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  };

  const handleUndo = () => {
    if (historyStep <= 0 || !fabricLoaded) return;
    
    const canvas = fabricRef.current;
    if (!canvas) return;

    const previousState = history[historyStep - 1];
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      setHistoryStep((prev) => prev - 1);
    });
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1 || !fabricLoaded) return;
    
    const canvas = fabricRef.current;
    if (!canvas) return;

    const nextState = history[historyStep + 1];
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      setHistoryStep((prev) => prev + 1);
    });
  };

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas || !fabricLoaded) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `whiteboard-${sessionId}.png`;
    link.click();
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator || !fabricLoaded) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.remove(...activeObjects);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Toolbar */}
      {isModerator && fabricLoaded && (
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
            variant={tool === "text" ? "default" : "outline"}
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
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Eraser
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

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddLine}
          >
            <Minus className="h-4 w-4 mr-1" />
            Line
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

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
            onClick={handleUndo}
            disabled={historyStep <= 0}
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
          >
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteSelected}
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
      <div className="flex-1 relative overflow-auto bg-gray-100 flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          className="shadow-lg"
          style={{ 
            pointerEvents: isModerator ? "auto" : "none",
          }}
        />
      </div>

      {/* View-only indicator */}
      {!isModerator && fabricLoaded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            👁️ View-only mode • Only the moderator can edit
          </p>
        </div>
      )}
    </div>
  );
}
