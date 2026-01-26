// lib/csp.ts
import { headers } from "next/headers";

/**
 * Generate a random nonce for CSP
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Get the current nonce from headers (set by middleware)
 */
export async function getNonce(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get("x-nonce") ?? undefined;
}

/**
 * Build CSP header with nonce
 * This replaces 'unsafe-inline' with nonce-based approach
 */
export function buildCSP(nonce: string): string {
  const cspDirectives = [
    // Default: only same-origin
    "default-src 'self'",
    
    // Scripts: self + nonce (NO unsafe-inline, solo unsafe-eval para Next.js)
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://vercel.live https://*.vercel.live`,
    
    // Styles: self + unsafe-inline (necesario para Tailwind/styled-components)
    // Note: mantener unsafe-inline en styles es aceptable, el riesgo XSS es principalmente en scripts
    `style-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live`,
    
    // Images: self + data URIs + any HTTPS (includes Cloudinary)
    "img-src 'self' data: https: blob: https://*.cloudinary.com",
    
    // Fonts: self + data URIs + vercel live
    "font-src 'self' data: https://vercel.live https://*.vercel.live",
    
    // Connect (fetch/XHR/WebSocket): self + your services
    [
      "connect-src 'self'",
      "https://www.unytea.com",
      "wss://www.unytea.com",
      "https://*.vercel.app",
      "wss://*.vercel.app",
      "ws://localhost:*",
      "wss://localhost:*",
      "https://sea1.ingest.uploadthing.com",
      "https://uploadthing.com",
      "https://utfs.io",
      "https://*.livekit.cloud",
      "https://*.livekit.io",
      "wss://*.livekit.cloud",
      "https://vercel.live",
      "https://*.vercel.live",
      "https://*.cloudinary.com",
      "https://api.cloudinary.com",
    ].join(" "),
    
    // Frames: self + video embeds + uploadthing
    [
      "frame-src 'self'",
      "data:",
      "blob:",
      "https://vercel.live",
      "https://*.vercel.live",
      "https://www.youtube.com",
      "https://youtube.com",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
      "https://vimeo.com",
      "https://utfs.io",
      "https://*.uploadthing.com",
    ].join(" "),
    
    // Object/embed: self + data + blob + uploadthing
    "object-src 'self' data: blob: https://utfs.io https://*.uploadthing.com",
    
    // Media: self + data + blob + uploadthing
    "media-src 'self' data: blob: https://utfs.io https://*.uploadthing.com",
    
    // Workers: self + blob (for Web Workers)
    "worker-src 'self' blob:",
    
    // Frame ancestors: only same origin (prevents clickjacking)
    "frame-ancestors 'self'",
    
    // Base URI: only same origin
    "base-uri 'self'",
    
    // Form action: only same origin
    "form-action 'self'",
    
    // Upgrade insecure requests (HTTP → HTTPS)
    "upgrade-insecure-requests",
  ];

  return cspDirectives.join("; ");
}

/**
 * Build CSP for report-only mode (for testing)
 * Use this first to test without breaking the site
 */
export function buildCSPReportOnly(nonce: string, reportUri?: string): string {
  const csp = buildCSP(nonce);
  if (reportUri) {
    return `${csp}; report-uri ${reportUri}`;
  }
  return csp;
}
