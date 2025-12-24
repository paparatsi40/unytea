"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, IText, Rect, Circle, Line } from "fabric";
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
  const fabricRef = useRef<Canvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
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
    loadWhiteboard(canvas);

    // Save to history on object added
    canvas.on("object:added", () => {
      saveToHistory(canvas);
    });

    canvas.on("object:modified", () => {
      saveToHistory(canvas);
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load whiteboard state
  const loadWhiteboard = async (canvas: Canvas) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/whiteboard`);
      if (response.ok) {
        const data = await response.json();
        if (data.canvasData) {
          canvas.loadFromJSON(data.canvasData, () => {
            canvas.renderAll();
            setIsLoading(false);
          });
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

  // Auto-save whiteboard
  useEffect(() => {
    if (!fabricRef.current || !isModerator) return;

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
        console.error("Error saving whiteboard:", error);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [sessionId, isModerator]);

  // Save to history
  const saveToHistory = (canvas: Canvas) => {
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
    if (!canvas) return;

    canvas.isDrawingMode = tool === "draw";
    canvas.selection = tool === "select";

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [tool, color, strokeWidth]);

  // Tool handlers
  const handleAddText = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator) return;

    const text = new IText("Double click to edit", {
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

  const handleAddRectangle = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator) return;

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
  };

  const handleAddCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator) return;

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
  };

  const handleAddLine = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator) return;

    const line = new Line([50, 50, 200, 50], {
      stroke: color,
      strokeWidth: strokeWidth,
    });

    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;
    
    const canvas = fabricRef.current;
    if (!canvas) return;

    const previousState = history[historyStep - 1];
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      setHistoryStep((prev) => prev - 1);
    });
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return;
    
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
    if (!canvas || !isModerator) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `whiteboard-${sessionId}.png`;
    link.click();
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas || !isModerator) return;

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
      {!isModerator && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
             View-only mode • Only the moderator can edit
          </p>
        </div>
      )}
    </div>
  );
}
