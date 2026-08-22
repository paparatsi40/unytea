// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider, useSession } from "next-auth/react";
import fs from "node:fs";
import path from "node:path";

import { HeaderAuthCTA } from "@/app/[locale]/_home/HeaderAuthCTA";

/**
 * Signing out left the header signed in.
 *
 * Logging out is a server action (`app/actions/auth.ts`): it clears the cookie
 * with a `Set-Cookie` on the action response and redirects to the home page.
 * The header there, `HeaderAuthCTA`, is a client component — the marketing home
 * is statically pre-rendered per locale, which is why it reads the session on
 * the client instead of taking it as a prop.
 *
 * `SessionProvider` is mounted in the root layout with no `session` prop, so it
 * fetches the session once on mount and keeps it. Nothing in a client-side
 * navigation remounts it. So the store went on serving a session the server had
 * already discarded, and only a full page load — which is what a manual refresh
 * is — put a new provider in place.
 *
 * This is *not* the router-cache staleness the sign-in fix addressed, and
 * `router.refresh()` is not a fix for it: a refresh re-renders server
 * components, and the value in question does not come from the server at all
 * once the page is running. The first group below is that claim, tested.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

// ───────────────────────────────────────────────────────────────────────────
// 1. What actually goes stale, driven against the real provider.
// ───────────────────────────────────────────────────────────────────────────
describe("the client session store, after a server-side logout", () => {
  const SESSION = {
    user: { id: "u1", name: "Ada" },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
  let sessionOnServer: unknown = SESSION;
  let sessionFetches = 0;

  beforeEach(() => {
    sessionOnServer = SESSION;
    sessionFetches = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/session")) sessionFetches += 1;
        return { ok: true, status: 200, json: async () => sessionOnServer } as unknown as Response;
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  /**
   * The root layout, standing still, with a page that can be replaced under it.
   * Replacing the page models what the server sends after the logout redirect;
   * the provider above it is the part that does not move.
   */
  function App({ pageKey }: { pageKey: string }) {
    return (
      <SessionProvider>
        <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
          <HeaderAuthCTA key={pageKey} locale="en" />
        </NextIntlClientProvider>
      </SessionProvider>
    );
  }

  const dashboardLink = () => screen.queryByText(MESSAGES.landing.nav.goToDashboard as string);
  const signInLink = () => screen.queryByText(MESSAGES.auth.signIn as string);

  it("shows the dashboard link while the session is alive", async () => {
    render(<App pageKey="a" />);
    await waitFor(() => expect(dashboardLink()).not.toBeNull());
  });

  it("keeps showing it after the server has cleared the cookie, however fresh the page is", async () => {
    const { rerender } = render(<App pageKey="a" />);
    await waitFor(() => expect(dashboardLink()).not.toBeNull());

    // The logout happened: the server no longer recognises the caller.
    sessionOnServer = null;

    // A brand-new page arrives from the server — a stronger event than
    // `router.refresh()`, since the header itself is remounted — and the header
    // is still wrong, because the value it reads never came from the server.
    await act(async () => {
      rerender(<App pageKey="b" />);
    });

    expect(dashboardLink()).not.toBeNull();
    expect(signInLink()).toBeNull();
  });

  it("flips to the signed-out header once it is told to re-read", async () => {
    render(<App pageKey="a" />);
    await waitFor(() => expect(dashboardLink()).not.toBeNull());
    sessionOnServer = null;

    const { resyncClientSession } = await import("@/lib/auth-session-sync");
    await act(async () => {
      await resyncClientSession();
    });

    await waitFor(() => expect(dashboardLink()).toBeNull());
    expect(signInLink()).not.toBeNull();
  });

  it("really did read the session over the wire", async () => {
    // Guards the stub as much as the code: if the provider stopped fetching on
    // mount, the tests above would pass for the wrong reason.
    render(<App pageKey="a" />);
    await waitFor(() => expect(dashboardLink()).not.toBeNull());
    expect(sessionFetches).toBeGreaterThan(0);
  });

  it("update() cannot do this job, which is why it is not what we call", async () => {
    // `SessionProvider`'s `update()` calls `setSession` only `if (newSession)`,
    // so the one answer it will not store is the empty one — precisely the
    // answer a logout produces. Swapping the resync for it would read as the
    // more official API and would do nothing.
    let update: (() => Promise<unknown>) | null = null;
    function Probe() {
      const session = useSession();
      update = session.update as () => Promise<unknown>;
      return <span>{session.data?.user?.name ?? "nobody"}</span>;
    }
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await waitFor(() => expect(screen.queryByText("Ada")).not.toBeNull());

    sessionOnServer = null;
    await act(async () => {
      await update!();
    });

    expect(screen.queryByText("Ada")).not.toBeNull();
    expect(screen.queryByText("nobody")).toBeNull();
  });
});
