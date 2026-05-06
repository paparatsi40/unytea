"use client";

/**
 * Image used in the "Most community platforms are built like forums from 2010"
 * section. Hides itself on broken src so the colored circle behind it stays
 * visible. onError is a client-side event handler, so this needs "use client"
 * — that's why it's a tiny component instead of inline JSX in the server page.
 */
export function ProblemImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
