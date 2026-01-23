// app/[locale]/csp-test/page.tsx
import { headers } from "next/headers";
import CSPTestClient from "./csp-test-client";

/**
 * CSP Testing Page
 * Use this page to verify that CSP with nonce is working correctly
 * 
 * Access: http://localhost:3000/en/csp-test
 */
export default async function CSPTestPage() {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return <CSPTestClient nonce={nonce} />;
}
