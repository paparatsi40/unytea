"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { X, File, Image as ImageIcon, FileText, Loader2 } from "lucide-react";

type FileUploadProps = {
  endpoint: "imageUploader" | "documentUploader" | "mediaUploader";
  onUploadComplete?: (files: { url: string; name: string }[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  value?: { url: string; name: string }[];
  onChange?: (files: { url: string; name: string }[]) => void;
};

export function FileUpload({
  endpoint,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  value = [],
  onChange,
}: FileUploadProps) {
  const [files, setFiles] = useState<{ url: string; name: string }[]>(value);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (res: any) => {
    const uploadedFiles = res.map((file: any) => ({
      url: file.url,
      name: file.name,
    }));

    const newFiles = [...files, ...uploadedFiles];
    setFiles(newFiles);
    onChange?.(newFiles);
    onUploadComplete?.(uploadedFiles);
    setIsUploading(false);
  };

  const handleUploadError = (error: Error) => {
    onUploadError?.(error);
    setIsUploading(false);
  };

  const removeFile = (urlToRemove: string) => {
    const newFiles = files.filter((file) => file.url !== urlToRemove);
    setFiles(newFiles);
    onChange?.(newFiles);
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <ImageIcon className="h-8 w-8 text-purple-600" />;
    } else if (url.match(/\.(pdf)$/i)) {
      return <FileText className="h-8 w-8 text-red-600" />;
    }
    return <File className="h-8 w-8 text-gray-600" />;
  };

  const getFileName = (url: string) => {
    return url.split("/").pop() || "file";
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {files.length < maxFiles && (
        <div className="relative">
          {isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
                <p className="mt-2 text-sm text-gray-600">Uploading...</p>
              </div>
            </div>
          )}

          <UploadDropzone
            endpoint={endpoint}
            onClientUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            onUploadBegin={() => setIsUploading(true)}
            appearance={{
              container:
                "border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors",
              uploadIcon: "text-purple-600",
              label: "text-sm text-gray-700 font-medium",
              allowedContent: "text-xs text-gray-500",
              button:
                "bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all ut-ready:bg-purple-600 ut-uploading:cursor-not-allowed ut-uploading:bg-gray-400",
            }}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded files ({files.length}/{maxFiles})
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {files.map((file) => (
              <div
                key={file.url}
                className="group relative flex items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-purple-300 hover:shadow-md"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">{getFileIcon(file.url)}</div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {getFileName(file.url)}
                  </p>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    View file
                  </a>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.url)}
                  className="flex-shrink-0 rounded-full p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Image Preview */}
                {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg opacity-10">
                    <img
                      src={file.url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Max files reached */}
      {files.length >= maxFiles && (
        <p className="text-sm text-gray-500">
          Maximum number of files reached ({maxFiles})
        </p>
      )}
    </div>
  );
}
