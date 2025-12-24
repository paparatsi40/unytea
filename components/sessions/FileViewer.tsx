"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FileText, Image as ImageIcon, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type FileItem = {
  id: string;
  name: string;
  type: string;
  url: string;
};

type Props = {
  files: FileItem[];
  onRemove: (id: string) => void;
  isModerator: boolean;
};

export function FileViewer({ files, onRemove, isModerator }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(files[0]?.id ?? null);
  const [zoom, setZoom] = useState(100);

  // Map para lookup rápido (y evita depender de objetos stale)
  const fileMap = useMemo(() => {
    return new Map(files.map((f) => [f.id, f]));
  }, [files]);

  // Mantener selección válida cuando cambie `files`
  useEffect(() => {
    if (files.length === 0) {
      setSelectedId(null);
      return;
    }

    // si no hay seleccionado, selecciona el primero
    if (!selectedId) {
      setSelectedId(files[0].id);
      return;
    }

    // si el seleccionado ya no existe, vuelve al primero
    if (!fileMap.has(selectedId)) {
      setSelectedId(files[0].id);
    }
  }, [files, selectedId, fileMap]);

  const currentFile = (selectedId && fileMap.get(selectedId)) ?? files[0] ?? null;

  // Resetea zoom cuando cambias de archivo (solo aplica a imágenes)
  useEffect(() => {
    setZoom(100);
  }, [selectedId]);

  if (files.length === 0 || !currentFile) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <FileText className="h-16 w-16 text-gray-300" />
        <p className="mt-4 text-lg font-medium text-gray-600">No files uploaded yet</p>
        {isModerator && (
          <p className="mt-2 text-sm text-gray-500">
            Click "Upload" to share files with participants
          </p>
        )}
      </div>
    );
  }

  const isPDF = currentFile.type === "application/pdf";
  const isImage = currentFile.type.startsWith("image/");

  const removeFile = (id: string) => {
    const fileToRemove = fileMap.get(id);

    // Si viene de URL.createObjectURL, esto evita memory leaks.
    // Si es un URL remoto normal, revokeObjectURL no hace nada útil, pero tampoco rompe.
    if (fileToRemove?.url) {
      try {
        URL.revokeObjectURL(fileToRemove.url);
      } catch {
        // ignore
      }
    }

    // Calcula siguiente selección si estabas borrando el activo
    if (selectedId === id) {
      const idx = files.findIndex((f) => f.id === id);
      const next = files[idx + 1]?.id ?? files[idx - 1]?.id ?? files[0]?.id ?? null;
      setSelectedId(next);
    }

    onRemove(id);
  };

  return (
    <div className="flex h-full">
      {/* File list sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Files ({files.length})
        </h4>

        <div className="space-y-2">
          {files.map((file) => {
            const selected = selectedId === file.id;

            return (
              <div
                key={file.id}
                className={`group flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50"
                }`}
                onClick={() => setSelectedId(file.id)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                    </p>
                  </div>
                </div>

                {isModerator && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* File viewer */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">
              {currentFile.name}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isImage && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom((z) => Math.max(25, z - 25))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {zoom}%
                </span>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}

            <a href={currentFile.url} download={currentFile.name}>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
          {isImage ? (
            <div
              className="relative"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center",
              }}
            >
              <img
                src={currentFile.url}
                alt={currentFile.name}
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={currentFile.url}
              className="w-full h-full border-0 rounded-lg shadow-lg"
              title={currentFile.name}
            />
          ) : (
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto" />
              <p className="mt-4 text-gray-600">Preview not available</p>
              <p className="text-sm text-gray-500 mt-2">Click download to view this file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
