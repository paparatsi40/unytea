"use client";

import { useState } from "react";
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
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(files[0] || null);
  const [zoom, setZoom] = useState(100);

  if (files.length === 0) {
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

  const currentFile = selectedFile || files[0];
  const isPDF = currentFile.type === "application/pdf";
  const isImage = currentFile.type.startsWith("image/");

  return (
    <div className="flex h-full">
      {/* File list sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Files ({files.length})</h4>
        
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`group flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedFile?.id === file.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50"
              }`}
              onClick={() => setSelectedFile(file)}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.id);
                    if (selectedFile?.id === file.id) {
                      setSelectedFile(files[0]?.id !== file.id ? files[0] : null);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* File viewer */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">{currentFile.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {isImage && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
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
            <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
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
