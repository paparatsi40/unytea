// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/en/dashboard" }));

import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import {
  PWA_DISMISSAL_KEY,
  PWA_DISMISSAL_GRACE_MS,
  isAppInstalled,
  isInstallPromptDismissed,
  recordInstallPromptDismissal,
} from "@/lib/pwa-install";

/**
 * The install banner came back after "Not now".
 *
 * Two independent reasons, and the tests below pin both. The dismissal was
 * consulted only at mount, so nothing stopped the still-registered
 * `beforeinstallprompt` handler from re-showing the banner seconds later in the
 * same session. And when the mount check did run, its window was 24 hours, so
 * the banner was designed to return every single day.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The event Chrome hands over. `new Event` gives us the dispatchable shell. */
function makeInstallEvent(outcome: "accepted" | "dismissed" = "dismissed") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

/** Fires the event and lets the reveal delay elapse. */
async function offerInstall(outcome: "accepted" | "dismissed" = "dismissed") {
  const event = makeInstallEvent(outcome);
  await act(async () => {
    window.dispatchEvent(event);
  });
  await act(async () => {
    vi.advanceTimersByTime(3500);
  });
  return event;
}

function setDisplayMode(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === "(display-mode: standalone)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  setDisplayMode(false);
  delete (window.navigator as Navigator & { standalone?: boolean }).standalone;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("the dismissal record", () => {
  it("honours a dismissal for a fortnight, not a day", () => {
    // 24 hours was the original window, and it is why the banner read as
    // broken: dismissing it bought the user until tomorrow.
    expect(PWA_DISMISSAL_GRACE_MS).toBe(14 * DAY);
  });

  it("reports no dismissal when nothing was ever stored", () => {
    expect(isInstallPromptDismissed()).toBe(false);
  });

  it("suppresses the banner inside the window", () => {
    const now = Date.parse("2026-08-17T12:00:00Z");
    recordInstallPromptDismissal(now);

    expect(isInstallPromptDismissed(now + DAY)).toBe(true);
    expect(isInstallPromptDismissed(now + 13 * DAY)).toBe(true);
  });

  it("offers it again once the window has passed", () => {
    const now = Date.parse("2026-08-17T12:00:00Z");
    recordInstallPromptDismissal(now);

    expect(isInstallPromptDismissed(now + PWA_DISMISSAL_GRACE_MS)).toBe(false);
    expect(isInstallPromptDismissed(now + 30 * DAY)).toBe(false);
  });

  it("writes the timestamp under the key an existing install already uses", () => {
    // Changing the key would silently re-offer the banner to everyone who had
    // already dismissed it.
    recordInstallPromptDismissal(1_755_000_000_000);
    expect(window.localStorage.getItem(PWA_DISMISSAL_KEY)).toBe("1755000000000");
  });

  it("treats a corrupt value as no dismissal and clears it", () => {
    // The old check computed `Date.now() - NaN < window`, which is false, so a
    // garbage value silently turned the cooldown off rather than failing.
    window.localStorage.setItem(PWA_DISMISSAL_KEY, "not-a-timestamp");

    expect(isInstallPromptDismissed()).toBe(false);
    expect(window.localStorage.getItem(PWA_DISMISSAL_KEY)).toBeNull();
  });

  it("refuses a timestamp from the future instead of suppressing forever", () => {
    const now = Date.parse("2026-08-17T12:00:00Z");
    window.localStorage.setItem(PWA_DISMISSAL_KEY, String(now + 365 * DAY));

    expect(isInstallPromptDismissed(now)).toBe(false);
    expect(window.localStorage.getItem(PWA_DISMISSAL_KEY)).toBeNull();
  });
});

describe("storage that is not available", () => {
  it("does not throw when reading is blocked", () => {
    // Private windows and "block all cookies" both throw here.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(() => isInstallPromptDismissed()).not.toThrow();
    expect(isInstallPromptDismissed()).toBe(false);
  });

  it("does not throw when writing is blocked", () => {
    // This is the one that mattered: the write lived in a click handler, so the
    // throw took the handler with it and the dismissal never landed.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    expect(() => recordInstallPromptDismissal()).not.toThrow();
  });

  it("still hides the banner for the session when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    render(<PWAInstallPrompt />);
    await offerInstall();
    expect(screen.queryByText("Install Unytea")).not.toBeNull();

    fireEvent.click(screen.getByText("Not now"));
    expect(screen.queryByText("Install Unytea")).toBeNull();

    // Nothing can be remembered, but the in-memory suppression still holds.
    await offerInstall();
    expect(screen.queryByText("Install Unytea")).toBeNull();
  });
});

describe("detecting an app that is already installed", () => {
  it("reads display-mode: standalone", () => {
    setDisplayMode(true);
    expect(isAppInstalled()).toBe(true);
  });

  it("reads navigator.standalone, which is all iOS Safari offers", () => {
    // The old check was the media query alone, so an iPhone with Unytea already
    // on the home screen was still a candidate for the banner.
    setDisplayMode(false);
    (window.navigator as Navigator & { standalone?: boolean }).standalone = true;
    expect(isAppInstalled()).toBe(true);
  });

  it("is false in a normal browser tab", () => {
    expect(isAppInstalled()).toBe(false);
  });

  it("survives a browser with no matchMedia", () => {
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    expect(() => isAppInstalled()).not.toThrow();
    expect(isAppInstalled()).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the banner", () => {
  it("stays hidden until the browser actually offers the install", async () => {
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    // No beforeinstallprompt means the Install button would have nothing to do.
    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("appears after the reveal delay once the browser offers it", async () => {
    render(<PWAInstallPrompt />);

    const event = makeInstallEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(screen.queryByText("Install Unytea")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText("Install Unytea")).not.toBeNull();
  });

  /**
   * The regression. `beforeinstallprompt` is not a one-shot — the browser fires
   * it again whenever it re-evaluates installability — and the old handler had
   * no dismissal guard, so each re-fire scheduled another reveal three seconds
   * out. The stored record was never consulted again after mount.
   */
  it("does not come back when the browser re-offers the install after a dismissal", async () => {
    render(<PWAInstallPrompt />);
    await offerInstall();
    fireEvent.click(screen.getByText("Not now"));
    expect(screen.queryByText("Install Unytea")).toBeNull();

    await offerInstall();
    await offerInstall();

    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("does not come back after the X either", async () => {
    render(<PWAInstallPrompt />);
    await offerInstall();

    // The close control is the only button with no text of its own.
    const closeButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.trim() === "");
    fireEvent.click(closeButton!);

    await offerInstall();
    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("records the dismissal so the next page load stays quiet", async () => {
    render(<PWAInstallPrompt />);
    await offerInstall();
    fireEvent.click(screen.getByText("Not now"));

    expect(isInstallPromptDismissed()).toBe(true);
  });

  it("is never offered while a dismissal is in force", async () => {
    recordInstallPromptDismissal();

    render(<PWAInstallPrompt />);
    await offerInstall();

    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("is offered once more after the grace window expires", async () => {
    window.localStorage.setItem(
      PWA_DISMISSAL_KEY,
      String(Date.now() - PWA_DISMISSAL_GRACE_MS - DAY)
    );

    render(<PWAInstallPrompt />);
    await offerInstall();

    expect(screen.queryByText("Install Unytea")).not.toBeNull();
  });

  it("is never offered when the app is already installed", async () => {
    setDisplayMode(true);

    render(<PWAInstallPrompt />);
    await offerInstall();

    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("disappears for good the moment the app is installed", async () => {
    render(<PWAInstallPrompt />);
    await offerInstall();
    expect(screen.queryByText("Install Unytea")).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByText("Install Unytea")).toBeNull();

    await offerInstall();
    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("hides itself while the browser's own dialog is open", async () => {
    render(<PWAInstallPrompt />);
    const event = await offerInstall("accepted");

    fireEvent.click(screen.getByText("Install"));

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Install Unytea")).toBeNull();
  });

  it("treats declining the browser's dialog as a dismissal", async () => {
    // Chrome re-offers the install after its own dialog is declined. Without
    // recording it, that re-offer is the loop all over again.
    render(<PWAInstallPrompt />);
    await offerInstall("dismissed");

    await act(async () => {
      fireEvent.click(screen.getByText("Install"));
    });

    expect(isInstallPromptDismissed()).toBe(true);
  });

  it("does not record a dismissal when the install is accepted", async () => {
    render(<PWAInstallPrompt />);
    await offerInstall("accepted");

    await act(async () => {
      fireEvent.click(screen.getByText("Install"));
    });

    expect(window.localStorage.getItem(PWA_DISMISSAL_KEY)).toBeNull();
  });

  it("leaves no timer running after it unmounts", async () => {
    const { unmount } = render(<PWAInstallPrompt />);

    const event = makeInstallEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });

    unmount();

    // The old cleanup cleared neither the reveal timer nor the appinstalled
    // listener, so a remount stacked another of each.
    expect(vi.getTimerCount()).toBe(0);
  });
});
