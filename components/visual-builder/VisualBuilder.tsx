"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { User, ImagePlus, Type, MousePointer2, Trash2, Move } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";

/* ======================
   Types
====================== */

type ElementType = "bio" | "image" | "text" | "button" | "stats";

interface BaseContent {
  text?: string;
  label?: string;
  url?: string;
}

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: BaseContent;
}

/* ======================
   Constants
====================== */

const CANVAS_WIDTH = 1000;
const CANVAS_MIN_HEIGHT = 1400;

/* ======================
   Sidebar Draggable (native HTML5 for create)
====================== */

function SidebarDraggable({
  type,
  icon: Icon,
  label,
}: {
  type: ElementType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("elementType", type);
      }}
      className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-3 cursor-move hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}

/* ======================
   Canvas Draggable Element
====================== */

interface DraggableProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onResizeEnd: (id: string, size: { width: number; height: number }) => void;
}

const DraggableCanvasElement = function DraggableCanvasElement({
  element,
  isSelected,
  onSelect,
  onDelete,
  onResizeEnd,
}: DraggableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef, // drag handle only
    transform,
    isDragging: isDndDragging,
  } = useDraggable({ id: element.id });

  const styleTransform = transform ? CSS.Translate.toString(transform) : undefined;

  // Resize state (local for live feedback)
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({
    width: 0,
    height: 0,
    mouseX: 0,
    mouseY: 0,
  });
  const [resizeHandle, setResizeHandle] = useState<
    "bottom-right" | "bottom-left" | "top-right" | "top-left" | "right" | "bottom" | null
  >(null);
  const [size, setSize] = useState({ width: element.width, height: element.height });

  // Sync when element size changes from outside (e.g., properties panel)
  useEffect(() => {
    setSize({ width: element.width, height: element.height });
  }, [element.width, element.height]);

  // Mouse move/up listeners during resize
  useEffect(() => {
    if (!isResizing) return;

    function handleMove(e: MouseEvent) {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      if (resizeHandle === "bottom-right") {
        newWidth += deltaX;
        newHeight += deltaY;
      } else if (resizeHandle === "bottom-left") {
        newWidth -= deltaX;
        newHeight += deltaY;
      } else if (resizeHandle === "top-right") {
        newWidth += deltaX;
        newHeight -= deltaY;
      } else if (resizeHandle === "top-left") {
        newWidth -= deltaX;
        newHeight -= deltaY;
      } else if (resizeHandle === "right") {
        newWidth += deltaX;
      } else if (resizeHandle === "bottom") {
        newHeight += deltaY;
      }

      newWidth = Math.max(50, Math.min(newWidth, CANVAS_WIDTH - element.x));
      newHeight = Math.max(50, newHeight);

      setSize({ width: newWidth, height: newHeight });
    }

    function handleUp() {
      setIsResizing(false);
      onResizeEnd(element.id, { width: size.width, height: size.height });
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing, resizeHandle, resizeStart, element.id, element.x, size.width, size.height, onResizeEnd]);

  // Render content per type
  const renderContent = () => {
    switch (element.type) {
      case "bio":
        return (
          <div className="p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-200" />
              <div>
                <div className="text-sm font-bold">Owner Name</div>
                <div className="text-xs text-gray-600">Founder</div>
              </div>
            </div>
            <p className="text-xs text-gray-700">Bio content...</p>
          </div>
        );
      case "image":
        return (
          <div className="flex h-full items-center justify-center bg-gray-100">
            {element.content?.url ? (
              <img
                src={element.content.url}
                alt={element.content.label || "Canvas image"}
                className="h-full w-full object-cover"
                draggable={false}                // evita drag nativo del navegador
              />
            ) : (
              <ImagePlus className="h-8 w-8 text-gray-400" />
            )}
          </div>
        );
      case "text":
        return (
          <div className="p-4">
            <p className="text-sm">{element.content?.text || "Text..."}</p>
          </div>
        );
      case "button":
        return (
          <div className="flex h-full items-center justify-center">
            <button
              data-interactive
              className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white"
              onClick={(e) => e.preventDefault()}
            >
              {element.content?.label || "Button"}
            </button>
          </div>
        );
      case "stats":
        return (
          <div className="grid grid-cols-3 gap-2 p-4">
            <div className="text-center">
              <div className="text-lg font-bold">100+</div>
              <div className="text-xs text-gray-600">Members</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">50+</div>
              <div className="text-xs text-gray-600">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">10+</div>
              <div className="text-xs text-gray-600">Courses</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      // IMPORTANTE: no poner listeners/attributes aquí (solo en la barra/asa)
      className="absolute"
      style={{
        left: element.x,
        top: element.y,
        width: size.width,
        height: size.height,
        transform: styleTransform,
        zIndex: isDndDragging ? 20 : isSelected ? 10 : 1,
        userSelect: "none",
        touchAction: "none",
      }}
      onMouseDown={(e) => {
        // Permite seleccionar incluso si clicas sobre una imagen (quitamos 'img' del selector)
        const inside = (e.target as HTMLElement).closest(
          "input, textarea, button, select, [data-interactive]"
        );
        if (inside) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Card */}
      <div
        data-selected={isSelected ? "" : undefined} // el atributo va en el card (donde están las clases data-*)
        className={[
          "pointer-events-auto h-full w-full overflow-hidden rounded-lg border-2 bg-white transition-shadow",
          // v4: data-variant; v3: fallback con ternario
          "data-[selected]:ring-2 data-[selected]:ring-primary data-[selected]:ring-offset-2",
          isSelected ? "ring-2 ring-primary ring-offset-2" : "", // fallback Tailwind v3
        ].join(" ")}
      >
        {renderContent()}
      </div>

      {/* Toolbar (DRAG HANDLE) */}
      {isSelected && (
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className="absolute -top-10 left-0 flex cursor-move items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs text-white"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label={`Move ${element.type}`}
        >
          <Move className="h-3 w-3" />
          <span className="mx-2 capitalize">{element.type}</span>
          <button
            type="button"
            aria-label="Delete element"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 hover:bg-white/20"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Resize Handles */}
      {isSelected && (
        <>
          {([
            ["bottom-right", "bottom-0 right-0 cursor-se-resize"],
            ["bottom-left", "bottom-0 left-0 cursor-sw-resize"],
            ["top-right", "top-0 right-0 cursor-ne-resize"],
            ["top-left", "top-0 left-0 cursor-nw-resize"],
          ] as const).map(([handle, classes]) => (
            <div
              key={handle}
              className={`absolute h-3 w-3 rounded-full bg-primary ${classes}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizeStart({
                  width: size.width,
                  height: size.height,
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                });
                setResizeHandle(handle);
                setIsResizing(true);
              }}
              aria-label={`Resize ${handle}`}
            />
          ))}

          <div
            className="absolute right-0 top-1/2 h-6 w-2 -translate-y-1/2 cursor-e-resize rounded-l-full bg-primary"
            onMouseDown={(e) => {
              e.stopPropagation();
              setResizeStart({
                width: size.width,
                height: size.height,
                mouseX: e.clientX,
                mouseY: e.clientY,
              });
              setResizeHandle("right");
              setIsResizing(true);
            }}
            aria-label="Resize right"
          />
          <div
            className="absolute left-1/2 bottom-0 h-2 w-6 -translate-x-1/2 cursor-s-resize rounded-t-full bg-primary"
            onMouseDown={(e) => {
              e.stopPropagation();
              setResizeStart({
                width: size.width,
                height: size.height,
                mouseX: e.clientX,
                mouseY: e.clientY,
              });
              setResizeHandle("bottom");
              setIsResizing(true);
            }}
            aria-label="Resize bottom"
          />
        </>
      )}
    </div>
  );
};

/* ======================
   Main Visual Builder
====================== */

export function VisualBuilder() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleCanvasDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("elementType") as ElementType;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 75;

    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: type === "stats" ? 300 : 200,
      height: type === "stats" ? 100 : type === "button" ? 60 : 150,
      content:
        type === "text"
          ? { text: "Edit this text..." }
          : type === "button"
          ? { label: "Click me", url: "" }
          : type === "image"
          ? { url: "" }
          : {},
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedElementId((prev) => (prev === id ? null : prev));
  }, []);

  const handleResizeEnd = useCallback(
    (id: string, size: { width: number; height: number }) => {
      updateElement(id, { width: size.width, height: size.height });
    },
    [updateElement]
  );

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    dragStartPositions.current[id] = { x: el.x, y: el.y };
    setSelectedElementId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    const start = dragStartPositions.current[id];
    if (!start) return;

    const el = elements.find((e) => e.id === id);
    if (!el) return;

    const nextX = Math.max(0, Math.min(CANVAS_WIDTH - el.width, start.x + delta.x));
    const nextY = Math.max(0, start.y + delta.y);

    updateElement(id, { x: nextX, y: nextY });
  };

  return (
    <div className="flex h-[800px] gap-4">
      {/* LEFT PANEL */}
      <div className="w-64 shrink-0 overflow-y-auto rounded-2xl border bg-card p-4">
        <h3 className="mb-4 text-sm font-bold">Elements</h3>
        <div className="space-y-2">
          <SidebarDraggable type="bio" icon={User} label="Owner Bio" />
          <SidebarDraggable type="image" icon={ImagePlus} label="Image" />
          <SidebarDraggable type="text" icon={Type} label="Text Block" />
          <SidebarDraggable type="button" icon={MousePointer2} label="CTA Button" />
          <SidebarDraggable type="stats" icon={MousePointer2} label="Stats" />
        </div>

        {/* Layers */}
        <div className="mt-6 border-t pt-6">
          <h4 className="mb-2 text-xs font-bold">LAYERS ({elements.length})</h4>
          {elements.map((el) => (
            <button
              key={el.id}
              onClick={() => setSelectedElementId(el.id)}
              className={[
                "block w-full rounded p-2 text-left text-xs",
                selectedElementId === el.id ? "bg-primary text-white" : "hover:bg-muted",
              ].join(" ")}
            >
              {el.type} - {el.id.slice(-4)}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER CANVAS */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden rounded-2xl border bg-gray-50">
          <div className="h-full overflow-auto p-8">
            <div
              ref={canvasRef}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              className="relative mx-auto bg-white shadow-xl"
              style={{ width: CANVAS_WIDTH, minHeight: CANVAS_MIN_HEIGHT }}
              onMouseDown={() => setSelectedElementId(null)}
            >
              {/* Background grid */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Elements */}
              {elements.map((el) => (
                <DraggableCanvasElement
                  key={el.id}
                  element={el}
                  isSelected={selectedElementId === el.id}
                  onSelect={() => setSelectedElementId(el.id)}
                  onDelete={() => deleteElement(el.id)}
                  onResizeEnd={handleResizeEnd}
                />
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {/* RIGHT PROPERTIES PANEL */}
      <div className="w-72 shrink-0 overflow-y-auto rounded-2xl border bg-card p-4">
        <h3 className="mb-4 text-sm font-bold">Properties</h3>

        {!selectedElement && (
          <p className="text-xs text-muted-foreground">Select an element to edit its properties.</p>
        )}

        {selectedElement && (
          <div className="space-y-4">
            {/* TYPE */}
            <div>
              <label className="text-xs font-medium">Type</label>
              <div className="text-sm font-medium capitalize">{selectedElement.type}</div>
            </div>

            {/* POSITION */}
            <div>
              <label className="text-xs font-medium">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                  className="rounded border p-1 text-xs"
                />
                <input
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                  className="rounded border p-1 text-xs"
                />
              </div>
            </div>

            {/* SIZE */}
            <div>
              <label className="text-xs font-medium">Size</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={selectedElement.width}
                  onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                  className="rounded border p-1 text-xs"
                />
                <input
                  type="number"
                  value={selectedElement.height}
                  onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                  className="rounded border p-1 text-xs"
                />
              </div>
            </div>

            {/* TEXT */}
            {selectedElement.type === "text" && (
              <div>
                <label className="mb-2 block text-xs font-medium">Text</label>
                <textarea
                  value={selectedElement.content?.text ?? ""}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      content: { ...selectedElement.content, text: e.target.value },
                    })
                  }
                  className="min-h-[80px] w-full rounded border border-gray-300 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Type your text here..."
                />
              </div>
            )}

            {/* BUTTON */}
            {selectedElement.type === "button" && (
              <>
                <div>
                  <label className="text-xs font-medium">Label</label>
                  <input
                    type="text"
                    value={selectedElement.content?.label || ""}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        content: { ...selectedElement.content, label: e.target.value },
                      })
                    }
                    className="w-full rounded border p-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">URL</label>
                  <input
                    type="text"
                    value={selectedElement.content?.url || ""}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        content: { ...selectedElement.content, url: e.target.value },
                      })
                    }
                    className="w-full rounded border p-1 text-xs"
                  />
                </div>
              </>
            )}

            {/* IMAGE */}
            {selectedElement.type === "image" && (
              <div>
                <label className="text-xs font-medium">Image</label>
                <ImageUploader
                  value={selectedElement.content?.url || ""}
                  onChange={(url) =>
                    updateElement(selectedElement.id, {
                      content: { ...selectedElement.content, url },
                    })
                  }
                  onRemove={() =>
                    updateElement(selectedElement.id, {
                      content: { ...selectedElement.content, url: "" },
                    })
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
