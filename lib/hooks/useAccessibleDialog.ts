"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Make a hand-rolled overlay behave like a dialog for keyboard and screen
 * reader users: Escape closes it, Tab cannot leave it, and focus goes back
 * where it came from when it closes.
 *
 * Why a hook rather than converting these overlays to `@radix-ui/react-dialog`
 * (which does all of this): the three panels in `live-session/` are framer-motion
 * elements whose backdrop is rendered by the *caller* (EnhancedVideoCall mounts
 * `<div className="absolute inset-0 …"><PollCreator/></div>`), inside an
 * `AnimatePresence`. Moving them onto Radix means restructuring both the panels
 * and their mount points, and re-deriving the enter/exit animation through
 * Radix's own portal and overlay. That is a rewrite of working UI to obtain
 * behaviour that is ~60 lines to implement directly. One implementation, used
 * by all of them, is the same "one correct version" outcome without the churn.
 *
 * The three behaviours are not decorative:
 *   - **Escape** is the only exit a keyboard user has from an overlay whose
 *     close button they may not have reached yet.
 *   - **The focus trap** is what stops Tab from walking into the page behind
 *     the backdrop, where a sighted keyboard user cannot see where they are and
 *     a screen reader user is told about content that is visually obscured.
 *   - **Focus restoration** is what stops focus from resetting to the top of
 *     the document when the dialog closes, which silently loses a user's place.
 *
 * Usage:
 *   const dialog = useAccessibleDialog({ onClose, label: "Create poll" });
 *   return <div {...dialog.props}>…</div>;
 */

/** Elements that can hold focus, in DOM order, excluding disabled/hidden ones. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface Options {
  /** Called on Escape. Should be the same handler the close button uses. */
  onClose: () => void;
  /** Accessible name for the dialog itself. */
  label: string;
  /** Set false to leave the DOM untouched (e.g. while the overlay is closed). */
  enabled?: boolean;
}

export function useAccessibleDialog({ onClose, label, enabled = true }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Kept in a ref so the effect below does not re-run — and so re-attach the
  // listeners — every time the parent re-renders with a new closure.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const focusables = useCallback((): HTMLElement[] => {
    const root = containerRef.current;
    if (!root) return [];

    // Filtered semantically rather than by layout. `offsetParent === null` is
    // the usual "is it visible" test, but it asks the layout engine — which
    // costs a reflow on every Tab and answers `null` for everything under
    // jsdom, silently emptying the list. `hidden` and `aria-hidden` are the
    // declarations that actually mean "not for this user", and they are
    // readable without layout.
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("hidden") && !el.closest('[aria-hidden="true"]')
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus in. The container itself is the fallback for a dialog whose
    // content is not yet interactive (a loading or confirmation state).
    const initial = focusables()[0] ?? containerRef.current;
    initial?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        // Nothing to move to — keep focus on the dialog rather than letting it
        // escape to the page behind.
        event.preventDefault();
        containerRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back in if it has somehow left.
      if (event.shiftKey && (active === first || !containerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // Capture phase: the dialog must see Escape before any inner handler can
    // stop it, and before a parent's global shortcut handler reacts to it.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Only restore if focus is still somewhere in the dialog; if the user has
      // already clicked elsewhere, yanking focus back would be the rude thing.
      if (
        previouslyFocused?.isConnected &&
        (!document.activeElement ||
          document.activeElement === document.body ||
          containerRef.current?.contains(document.activeElement))
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [enabled, focusables]);

  return {
    /** Spread onto the element that visually contains the dialog. */
    props: {
      ref: containerRef,
      role: "dialog" as const,
      "aria-modal": true,
      "aria-label": label,
      // Focusable as a last resort so the container can hold focus itself.
      tabIndex: -1,
    },
  };
}
