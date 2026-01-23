// components/csp-script.tsx
"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Get nonce from CSP meta tag (set by middleware)
 */
function useNonce() {
  const [nonce, setNonce] = useState<string | undefined>();

  useEffect(() => {
    const metaTag = document.querySelector('meta[property="csp-nonce"]');
    if (metaTag) {
      setNonce(metaTag.getAttribute("content") || undefined);
    }
  }, []);

  return nonce;
}

/**
 * CSP-compliant Script component (Client-side)
 * Automatically injects the nonce for inline scripts
 * 
 * Usage:
 * <CSPScript strategy="afterInteractive">
 *   {`console.log('Hello world');`}
 * </CSPScript>
 */
export function CSPScript({
  children,
  strategy = "afterInteractive",
  ...props
}: {
  children: string;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload" | "worker";
  [key: string]: any;
}) {
  const nonce = useNonce();

  if (!nonce) return null;

  return (
    <Script strategy={strategy} nonce={nonce} {...props}>
      {children}
    </Script>
  );
}

/**
 * Inline script component for CSP (Client-side)
 * Use this for small inline scripts that need to run early
 * 
 * Usage:
 * <CSPInlineScript>
 *   {`console.log('Early script');`}
 * </CSPInlineScript>
 */
export function CSPInlineScript({ children }: { children: string }) {
  const nonce = useNonce();

  useEffect(() => {
    if (!nonce) return;

    const script = document.createElement("script");
    script.nonce = nonce;
    script.textContent = children;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [nonce, children]);

  return null;
}

/**
 * External script component for CSP
 * Use this for loading external scripts
 * 
 * Usage:
 * <CSPExternalScript src="https://example.com/script.js" />
 */
export function CSPExternalScript({
  src,
  strategy = "afterInteractive",
  ...props
}: {
  src: string;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload" | "worker";
  [key: string]: any;
}) {
  const nonce = useNonce();

  if (!nonce) return null;

  return <Script src={src} strategy={strategy} nonce={nonce} {...props} />;
}
