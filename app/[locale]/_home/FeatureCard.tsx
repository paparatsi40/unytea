"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

/**
 * Feature card with image fallback handling. Client component because of
 * the imgError state (onError is a client-side event handler).
 */
export function FeatureCard({
  image,
  title,
  description,
  highlighted = false,
  large = false,
}: {
  image: string;
  title: string;
  description: string;
  highlighted?: boolean;
  large?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        highlighted
          ? "border-primary bg-gradient-to-br from-primary/10 to-purple-100"
          : "bg-gradient-to-br from-white to-gray-50"
      } ${large ? "flex h-full flex-col" : ""}`}
    >
      <div
        className={`absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 transition-transform group-hover:scale-150 ${
          highlighted ? "bg-primary" : "bg-gray-400"
        }`}
      />

      <div
        className={`relative mb-4 w-full overflow-hidden rounded-xl shadow-md ${
          large ? "h-48" : "h-32"
        } ${imgError ? "bg-gradient-to-br from-gray-200 to-gray-300" : ""}`}
      >
        {!imgError && (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
        {imgError && (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                highlighted ? "bg-primary/20" : "bg-gray-300"
              }`}
            >
              <Sparkles className={`h-6 w-6 ${highlighted ? "text-primary" : "text-gray-500"}`} />
            </div>
          </div>
        )}
        {highlighted && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        )}
      </div>
      <h3 className={`relative mb-2 font-semibold ${large ? "text-xl" : "text-lg"}`}>{title}</h3>
      <p className={`relative text-muted-foreground ${large ? "flex-grow text-base" : "text-sm"}`}>
        {description}
      </p>
    </div>
  );
}
