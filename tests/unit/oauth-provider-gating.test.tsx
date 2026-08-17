// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import {
  configuredOAuthProviders,
  oauthCredentials,
  OAUTH_ENV_VARS,
  type OAuthProviderId,
} from "@/lib/auth-providers";
import { SignInContent } from "@/app/auth/signin/signin-content";
import { SignUpContent } from "@/app/auth/signup/signup-content";

/**
 * OAuth buttons were rendered from a hardcoded list, while the providers behind
 * them were registered unconditionally with `process.env.GOOGLE_CLIENT_ID!`.
 * With no credentials configured the button still appeared and the user found
 * out only at the handshake: Google answered `invalid_client`, and GitHub let
 * them type their password first and failed afterwards.
 *
 * These tests pin the contract from both ends. Registration is checked by
 * capturing the config `lib/auth.ts` hands to NextAuth, so "not registered"
 * means the provider is genuinely absent from the array — not merely hidden.
 * Rendering is checked against the same `configuredOAuthProviders()` the server
 * uses, so the two halves cannot drift apart.
 *
 * `tests/setup.ts` mocks `@/lib/auth` globally, hence the `vi.unmock` below:
 * this is the one suite that needs the real module.
 */

vi.unmock("@/lib/auth");

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

// ── module-level stubs for the UI half ─────────────────────────────────────
const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// `lib/auth.ts` calls NextAuth() at module scope. Capturing the argument is the
// only way to see the provider array it actually built.
const capturedConfigs: Array<{ providers: Array<{ id?: string }> }> = [];
vi.mock("next-auth", () => ({
  default: (config: { providers: Array<{ id?: string }> }) => {
    capturedConfigs.push(config);
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
}));

const OAUTH_ENV_KEYS = Object.values(OAUTH_ENV_VARS).flatMap((names) => [names.id, names.secret]);

/**
 * Loads `lib/auth.ts` fresh under the given environment and returns the ids of
 * the providers it registered.
 */
async function registeredProviderIds(env: Record<string, string>): Promise<string[]> {
  for (const key of OAUTH_ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  capturedConfigs.length = 0;
  vi.resetModules();
  await import("@/lib/auth");

  expect(capturedConfigs).toHaveLength(1);
  return capturedConfigs[0].providers.map((provider) => provider.id ?? "");
}

function renderSignIn(providers: OAuthProviderId[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <SignInContent oauthProviders={providers} />
    </NextIntlClientProvider>
  );
}

function renderSignUp(providers: OAuthProviderId[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <SignUpContent oauthProviders={providers} />
    </NextIntlClientProvider>
  );
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  signInMock.mockReset();
});

afterEach(() => {
  cleanup();
  process.env = { ...ORIGINAL_ENV };
});

// ───────────────────────────────────────────────────────────────────────────
describe("configuredOAuthProviders", () => {
  it("omits a provider whose variables are both absent", () => {
    expect(
      configuredOAuthProviders({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })
    ).toEqual(["google"]);
  });

  it("omits a provider that is only half configured", () => {
    // A client id with no secret is exactly as unusable as neither.
    expect(configuredOAuthProviders({ GITHUB_CLIENT_ID: "id" })).toEqual([]);
    expect(configuredOAuthProviders({ GITHUB_CLIENT_SECRET: "secret" })).toEqual([]);
  });

  it("treats an empty or whitespace-only value as absent", () => {
    expect(
      configuredOAuthProviders({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "secret" })
    ).toEqual([]);
    expect(
      configuredOAuthProviders({ GITHUB_CLIENT_ID: "   ", GITHUB_CLIENT_SECRET: "secret" })
    ).toEqual([]);
  });

  it("returns both when both are configured", () => {
    expect(
      configuredOAuthProviders({
        GOOGLE_CLIENT_ID: "gid",
        GOOGLE_CLIENT_SECRET: "gsecret",
        GITHUB_CLIENT_ID: "hid",
        GITHUB_CLIENT_SECRET: "hsecret",
      })
    ).toEqual(["google", "github"]);
  });

  it("hands back the validated credentials so callers need no assertion", () => {
    expect(
      oauthCredentials("google", { GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret" })
    ).toEqual({ clientId: "gid", clientSecret: "gsecret" });
    expect(oauthCredentials("google", {})).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("provider registration in lib/auth.ts", () => {
  it("does not register GitHub when its variables are absent", async () => {
    const ids = await registeredProviderIds({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    });

    expect(ids).not.toContain("github");
    expect(ids).toContain("google");
  });

  it("registers Google when its variables are present", async () => {
    const ids = await registeredProviderIds({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    });

    expect(ids).toContain("google");
  });

  it("registers neither OAuth provider when nothing is configured", async () => {
    const ids = await registeredProviderIds({});

    expect(ids).not.toContain("google");
    expect(ids).not.toContain("github");
  });

  it("always registers credentials, whatever the OAuth configuration", async () => {
    expect(await registeredProviderIds({})).toContain("credentials");
    expect(
      await registeredProviderIds({ GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret" })
    ).toContain("credentials");
    expect(
      await registeredProviderIds({
        GOOGLE_CLIENT_ID: "gid",
        GOOGLE_CLIENT_SECRET: "gsecret",
        GITHUB_CLIENT_ID: "hid",
        GITHUB_CLIENT_SECRET: "hsecret",
      })
    ).toContain("credentials");
  });

  it("carries the configured credentials through to the provider", async () => {
    vi.resetModules();
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    capturedConfigs.length = 0;
    await import("@/lib/auth");

    // The factory stashes whatever the caller passed under `options`; NextAuth
    // merges it over the provider defaults when it builds the real config.
    const google = capturedConfigs[0].providers.find((p) => p.id === "google") as
      | { options?: { clientId?: string; clientSecret?: string } }
      | undefined;

    expect(google?.options?.clientId).toBe("google-id");
    expect(google?.options?.clientSecret).toBe("google-secret");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("sign-in page buttons", () => {
  it("renders no GitHub button when GitHub is not configured", () => {
    const providers = configuredOAuthProviders({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    });

    renderSignIn(providers);

    expect(screen.queryByText("Continue with GitHub")).toBeNull();
    expect(screen.getByText("Continue with Google")).toBeTruthy();
  });

  it("renders the Google button when Google is configured", () => {
    renderSignIn(["google"]);

    expect(screen.getByText("Continue with Google")).toBeTruthy();
  });

  it("drops the OAuth block entirely when nothing is configured", () => {
    renderSignIn(configuredOAuthProviders({}));

    expect(screen.queryByText("Continue with Google")).toBeNull();
    expect(screen.queryByText("Continue with GitHub")).toBeNull();
    // The divider belongs to the OAuth block; without providers it would sit
    // above an empty space.
    expect(screen.queryByText("or continue with")).toBeNull();
  });

  it("keeps email and password sign-in available with no OAuth providers", () => {
    renderSignIn([]);

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("sign-up page buttons", () => {
  it("renders no GitHub button when GitHub is not configured", () => {
    const providers = configuredOAuthProviders({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    });

    renderSignUp(providers);

    expect(screen.queryByText("Continue with GitHub")).toBeNull();
    expect(screen.getByText("Continue with Google")).toBeTruthy();
  });

  it("keeps email and password sign-up available with no OAuth providers", () => {
    renderSignUp([]);

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("lib/auth.ts source tripwires", () => {
  it("no longer asserts non-null on OAuth credentials", () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, "lib/auth.ts"), "utf8");
    // Strip comments first: the ones above the providers array describe the old
    // shape and would otherwise match. Same helper pattern as
    // tests/unit/livekit-room-options.test.ts.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

    expect(code).not.toContain("process.env.GOOGLE_CLIENT_ID!");
    expect(code).not.toContain("process.env.GOOGLE_CLIENT_SECRET!");
    expect(code).not.toContain("process.env.GITHUB_CLIENT_ID!");
    expect(code).not.toContain("process.env.GITHUB_CLIENT_SECRET!");
  });
});
