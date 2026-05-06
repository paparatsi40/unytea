"use client";

import { useState } from "react";
import { CheckCircle, Users } from "lucide-react";

/**
 * Use case card with image fallback handling. Client component because of
 * the imgError state (onError is a client-side event handler).
 */
export function UseCaseCard({
  image,
  title,
  features,
}: {
  image: string;
  title: string;
  features: string[];
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />

      <div className="relative">
        <div
          className={`w-full h-40 rounded-xl overflow-hidden mb-4 shadow-sm ${
            imgError ? "bg-gradient-to-br from-gray-200 to-gray-300" : ""
          }`}
        >
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-primary/60" />
              </div>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
