import { SignUpContent } from "./signup-content";
import { configuredOAuthProviders } from "@/lib/auth-providers";

/**
 * Split into a Server Component shell and a Client Component body for the same
 * reason as `app/auth/signin/page.tsx`: the OAuth button list is resolved where
 * the credentials live, so an unconfigured provider is never offered. The form
 * state stays in `SignUpContent`.
 */
export default function SignUpPage() {
  const oauthProviders = configuredOAuthProviders();

  return <SignUpContent oauthProviders={oauthProviders} />;
}
