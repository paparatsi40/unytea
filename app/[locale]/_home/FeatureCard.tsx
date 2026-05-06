"use client";

import { useState } from "react";
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
      className={`group relative p-6 rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden ${
        highlighted
          ? "border-primary bg-gradient-to-br from-primary/10 to-purple-100"
          : "bg-gradient-to-br from-white to-gray-50"
      } ${large ? "h-full flex flex-col" : ""}`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150 ${
          highlighted ? "bg-primary" : "bg-gray-400"
        }`}
      />

      <div
        className={`relative w-full rounded-xl mb-4 overflow-hidden shadow-md ${
          large ? "h-48" : "h-32"
        } ${imgError ? "bg-gradient-to-br from-gray-200 to-gray-300" : ""}`}
      >
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
        {imgError && (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                highlighted ? "bg-primary/20" : "bg-gray-300"
              }`}
            >
              <Sparkles
                className={`w-6 h-6 ${
                  highlighted ? "text-primary" : "text-gray-500"
                }`}
              />
            </div>
          </div>
        )}
        {highlighted && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        )}
      </div>
      <h3
        className={`relative font-semibold mb-2 ${
          large ? "text-xl" : "text-lg"
        }`}
      >
        {title}
      </h3>
      <p
        className={`relative text-muted-foreground ${
          large ? "text-base flex-grow" : "text-sm"
        }`}
      >
        {description}
      </p>
    </div>
  );
}
