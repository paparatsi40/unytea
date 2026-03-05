"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

type ImageGalleryProps = {
  images: { url: string; alt?: string }[];
  columns?: 1 | 2 | 3 | 4;
};

export function ImageGallery({ images, columns = 3 }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) {
    return null;
  }

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid gap-2 ${gridCols[columns]}`}>
        {images.map((image, index) => (
          <div
            key={image.url}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition-all hover:border-purple-300 hover:shadow-lg"
            onClick={() => setSelectedImage(image.url)}
          >
            <img
              src={image.url}
              alt={image.alt || `Image ${index + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
              <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image */}
          <img
            src={selectedImage}
            alt="Full size"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
