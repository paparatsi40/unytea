"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-gray-50 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-100 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative">
        <div
          className={`relative mb-4 h-40 w-full overflow-hidden rounded-xl shadow-sm ${
            imgError ? "bg-gradient-to-br from-gray-200 to-gray-300" : ""
          }`}
        >
          {!imgError ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <Users className="h-8 w-8 text-primary/60" />
              </div>
            </div>
          )}
        </div>
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
