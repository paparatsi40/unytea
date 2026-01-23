// components/csp-nonce-provider.tsx
import { getNonce } from "@/lib/csp";

/**
 * Injects CSP nonce as a meta tag for client-side components
 * This component should be placed in the root layout <head>
 */
export async function CSPNonceProvider() {
  const nonce = await getNonce();

  if (!nonce) return null;

  return <meta property="csp-nonce" content={nonce} />;
}
