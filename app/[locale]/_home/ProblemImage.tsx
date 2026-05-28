"use client";

import Image from "next/image";

/**
 * Image used in the "Most community platforms are built like forums from 2010"
 * section. Hides itself on broken src so the colored circle behind it stays
 * visible. onError is a client-side event handler, so this needs "use client"
 * — that's why it's a tiny component instead of inline JSX in the server page.
 */
export function ProblemImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 768px) 33vw, 100vw"
      className="object-cover opacity-60 transition-opacity group-hover:opacity-40"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
