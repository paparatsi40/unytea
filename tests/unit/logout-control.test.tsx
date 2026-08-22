// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fs from "node:fs";
import path from "node:path";

/**
 * The control half of the logout fix. Kept apart from
 * `logout-client-session.test.tsx` because that one drives the real
 * `SessionProvider` and the real resync, and this one has to replace both to
 * watch the order they are called in — a `vi.mock` is hoisted to the top of its
 * file, so the two cannot share one.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

// ───────────────────────────────────────────────────────────────────────────
// 2. The control: it tells the store, and only once the server has answered.
// ───────────────────────────────────────────────────────────────────────────
const stub = vi.hoisted(() => ({
  logout: vi.fn<() => Promise<unknown>>(),
  resync: vi.fn<() => Promise<void>>(),
  order: [] as string[],
}));

vi.mock("@/app/actions/auth", () => ({
  logout: () => {
    stub.order.push("logout");
    return stub.logout();
  },
}));

vi.mock("@/lib/auth-session-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session-sync")>();
  return {
    ...actual,
    resyncClientSession: () => {
      stub.order.push("resync");
      return stub.resync();
    },
  };
});

describe("the logout control tells the store, after the fact", () => {
  const caughtByBoundary: Error[] = [];

  beforeEach(() => {
    caughtByBoundary.length = 0;
    stub.order.length = 0;
    stub.logout.mockReset();
    stub.resync.mockReset();
    stub.resync.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  /**
   * Stands in for Next's own `RedirectBoundary`.
   *
   * A completed logout ends as a thrown redirect, which React reports to the
   * nearest error boundary; in the app that boundary is Next's, and the
   * navigation has already been performed by the router by the time it arrives.
   * Catching it here keeps the signal visible to the test instead of letting it
   * fail the run — and lets the test insist that it is still thrown at all,
   * since swallowing it inside the control is the shape of "fix" that would
   * quietly break the navigation.
   */
  class RedirectBoundary extends React.Component<
    { children: React.ReactNode },
    { caught: Error | null }
  > {
    state: { caught: Error | null } = { caught: null };
    static getDerivedStateFromError(caught: Error) {
      return { caught };
    }
    componentDidCatch(caught: Error) {
      caughtByBoundary.push(caught);
    }
    render() {
      return this.state.caught ? null : this.props.children;
    }
  }

  /**
   * Rendered outside `act`, clicked inside it. A `render` nested in an `act`
   * scope does not commit until the scope ends, so the button would not be in
   * the document yet when the click looked for it.
   */
  async function clickLogout() {
    const { LogoutButton } = await import("@/components/auth/LogoutButton");
    render(
      <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
        <RedirectBoundary>
          <LogoutButton />
        </RedirectBoundary>
      </NextIntlClientProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
  }

  it("re-reads the session after a completed logout — which arrives as a rejection", async () => {
    // Next rejects the action promise with its redirect signal and performs the
    // navigation itself, so a successful logout never returns. Anything written
    // after the `await` is unreachable on the only path that matters.
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/;307;",
    });
    stub.logout.mockRejectedValue(redirect);

    await clickLogout();

    await waitFor(() => expect(stub.resync).toHaveBeenCalledTimes(1));
    // And the redirect was still thrown: the control re-reads the session
    // alongside the signal, never instead of it.
    await waitFor(() => expect(caughtByBoundary.map((e) => e.message)).toContain("NEXT_REDIRECT"));
  });

  it("waits for the server's answer before re-reading", async () => {
    // Asking any earlier reads the session that is still alive and caches
    // exactly the wrong answer — the mirror of pushing before refreshing on the
    // way in.
    let settle: (() => void) | null = null;
    stub.logout.mockImplementation(
      () =>
        new Promise<unknown>((resolve) => {
          settle = () => resolve(undefined);
        })
    );

    await clickLogout();

    expect(stub.order).toEqual(["logout"]);
    expect(stub.resync).not.toHaveBeenCalled();

    await act(async () => {
      settle!();
    });

    await waitFor(() => expect(stub.order).toEqual(["logout", "resync"]));
  });

  it("re-reads after a refusal too, and says the logout did not happen", async () => {
    // A rate-limited logout leaves the session alive; re-reading then simply
    // confirms that, which is the truth the header should be showing.
    stub.logout.mockResolvedValue({ success: false, error: "RATE_LIMIT" });

    await clickLogout();

    await waitFor(() => expect(stub.resync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button").textContent).toContain(
      MESSAGES.navigation.logoutRetry as string
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. The shapes of fix that are not fixes.
// ───────────────────────────────────────────────────────────────────────────
describe("the control does not paper over it", () => {
  const button = read("components/auth/LogoutButton.tsx");

  it("does not reload the page or wait on a timer", () => {
    // A reload would work — it is what the client `signOut()` used to do — and
    // it throws away every bit of client state on the way out. A timer would be
    // guessing at when the server answered, which the promise already knows.
    expect(button).not.toMatch(/window\.location/);
    expect(button).not.toMatch(/setTimeout/);
    expect(button).not.toMatch(/\.reload\(/);
  });

  it("still leaves the navigation, and its destination, to the server", () => {
    // The redirect target lives in `signOut({ redirectTo: "/" })`. Navigating
    // from the client is the bug this control was written to remove.
    expect(button).not.toMatch(/router\.(push|replace)/);
    expect(read("app/actions/auth.ts")).toContain('signOut({ redirectTo: "/" })');
  });

  it("leaves the sign-in path alone, which had its own, different fix", () => {
    // Sign-in's staleness is the router cache, and its fix is `router.refresh()`
    // before `router.push()`. Nothing here should disturb it.
    const signin = read("app/auth/signin/signin-content.tsx");
    const success = signin.slice(signin.indexOf('toast.success(t("auth.welcomeBack"))'));
    expect(success.indexOf("router.refresh()")).toBeGreaterThan(-1);
    expect(success.indexOf("router.push(callbackUrl)")).toBeGreaterThan(
      success.indexOf("router.refresh()")
    );
  });
});
