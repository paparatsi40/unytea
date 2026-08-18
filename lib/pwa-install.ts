/**
 * What the install banner is allowed to remember, and how.
 *
 * The banner used to keep its own storage logic inline, and every one of the
 * ways it could get this wrong was live at once: the record was read only at
 * mount, the window was a single day, an unreadable store threw out of a click
 * handler, and a corrupt value silently disabled the whole check. Those are
 * storage concerns, not layout concerns, so they live here where they can be
 * tested without rendering anything.
 *
 * Every access is wrapped. A blocked or full store is a normal condition —
 * private windows, "block all cookies", Safari's ITP eviction — and none of it
 * may reach the render. The failure mode when storage is unavailable is that
 * the banner is offered again on the next page load, which is the only
 * behaviour available to a page that cannot remember anything; within a single
 * session the component holds the dismissal in memory regardless.
 */

/** Unchanged from the original: an existing dismissal keeps its meaning. */
export const PWA_DISMISSAL_KEY = "pwa-install-dismissed";

/**
 * How long a "not now" is honoured.
 *
 * The old value was 24 hours, which made the banner a daily event — the reason
 * it read as broken. Two weeks is long enough that a dismissal feels respected
 * and short enough that someone who changes their mind is offered it again
 * without hunting through a menu.
 */
export const PWA_DISMISSAL_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

/** Reads localStorage without ever throwing. Absent and unreadable are the same answer. */
function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes localStorage without ever throwing. */
function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do and nothing to report: the caller has already hidden the
    // banner in memory, so this session behaves correctly either way.
  }
}

function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same.
  }
}

/**
 * Is a dismissal currently in force?
 *
 * A stored value that is not a plausible timestamp is treated as no dismissal
 * and cleared. The old code did `Date.now() - parseInt(value)` and compared the
 * result to the window; on a corrupt value that is `NaN < window`, which is
 * `false`, so garbage in storage silently turned the cooldown off instead of
 * failing loudly. Clearing it means the next dismissal writes something valid
 * rather than layering on top of the bad value forever.
 *
 * A timestamp in the future is equally suspect — a clock change, or a value
 * from another origin's debris — and is treated the same way, since honouring
 * it could suppress the banner indefinitely.
 */
export function isInstallPromptDismissed(now: number = Date.now()): boolean {
  const raw = readRaw(PWA_DISMISSAL_KEY);
  if (raw === null) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0 || dismissedAt > now) {
    removeRaw(PWA_DISMISSAL_KEY);
    return false;
  }

  return now - dismissedAt < PWA_DISMISSAL_GRACE_MS;
}

/** Records a dismissal at `now`, restarting the grace window. */
export function recordInstallPromptDismissal(now: number = Date.now()): void {
  writeRaw(PWA_DISMISSAL_KEY, String(now));
}

/**
 * Is the app already installed?
 *
 * Two checks because the platforms disagree. Chrome, Edge and Android report an
 * installed PWA through the `display-mode: standalone` media query; iOS Safari
 * has never implemented that and exposes `navigator.standalone` instead. The
 * old code checked only the media query, so an iPhone user who had already
 * added Unytea to their home screen was still a candidate for the banner.
 *
 * `matchMedia` is feature-detected rather than assumed: this runs on whatever
 * the visitor brought, and an exception here would take the render with it.
 */
export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  if (iosStandalone === true) return true;

  try {
    return window.matchMedia?.("(display-mode: standalone)").matches === true;
  } catch {
    return false;
  }
}
