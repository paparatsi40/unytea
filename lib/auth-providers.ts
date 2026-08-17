/**
 * Which OAuth providers are actually usable, decided from the environment.
 *
 * Both halves of the app have to agree on this: `lib/auth.ts` uses it to decide
 * which providers to register with NextAuth, and the sign-in / sign-up pages use
 * it to decide which buttons to render. They read the same function, so a button
 * can never point at a provider that does not exist.
 *
 * Before this existed, the providers were registered unconditionally with
 * `process.env.GOOGLE_CLIENT_ID!`. The non-null assertion silenced the compiler,
 * `undefined` reached the provider, and the failure only surfaced at the OAuth
 * handshake — Google answered `invalid_client`, and GitHub let the user type
 * their password before failing. The button promised something the server could
 * not deliver.
 *
 * Deployment note: `/[locale]/auth/signin` and `/[locale]/auth/signup` are
 * prerendered, so the button list is baked in at build time while `lib/auth.ts`
 * reads the same variables when the server boots. Adding credentials to the
 * hosting dashboard therefore needs a redeploy before the button appears — the
 * variables must be present for the build, not just at runtime.
 *
 * Note that the env vars are the classic `*_CLIENT_ID` / `*_CLIENT_SECRET`
 * names, not NextAuth v5's auto-detected `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
 * convention. Because `lib/auth.ts` passes the credentials explicitly, the
 * `AUTH_*` names are inert here — setting them would do nothing.
 */

export const OAUTH_PROVIDER_IDS = ["google", "github"] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/** The exact env var names each provider reads. */
export const OAUTH_ENV_VARS: Record<OAuthProviderId, { id: string; secret: string }> = {
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  github: { id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET" },
};

type Env = Record<string, string | undefined>;

/**
 * A variable that exists but holds an empty or whitespace-only string counts as
 * absent. Hosting dashboards make it easy to save a blank value, and a blank
 * client id fails the handshake exactly like a missing one.
 */
function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The credentials for one provider, or `null` when either half is missing.
 * Returning the validated strings is what lets the caller drop the `!`.
 */
export function oauthCredentials(
  provider: OAuthProviderId,
  env: Env = process.env
): OAuthCredentials | null {
  const names = OAUTH_ENV_VARS[provider];
  const clientId = env[names.id];
  const clientSecret = env[names.secret];

  // Both or neither. A half-configured provider is a broken button, not a
  // usable one.
  if (!present(clientId) || !present(clientSecret)) {
    return null;
  }

  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

/** The provider ids that are fully configured, in display order. */
export function configuredOAuthProviders(env: Env = process.env): OAuthProviderId[] {
  return OAUTH_PROVIDER_IDS.filter((provider) => oauthCredentials(provider, env) !== null);
}
