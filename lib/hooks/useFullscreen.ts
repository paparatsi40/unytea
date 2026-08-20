"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Put one element on the whole display, if the browser will.
 *
 * The live room's stage is a box between two panels, so a shared screen —
 * already letterboxed to fit its own aspect ratio — lands inside it at a
 * fraction of the display. Nothing about that is fixable with layout: the
 * panels are there because people use them. What the viewer wants is the
 * element on its own, briefly, which is what the Fullscreen API is for.
 *
 * Feature detection is the whole reason this is a hook rather than three lines
 * at the call site. `document.fullscreenEnabled` is false on iOS Safari, where
 * only a `<video>` element can go fullscreen and an arbitrary `<div>` cannot —
 * so a button rendered there would do nothing, every time, for a whole
 * platform. `isSupported` starts false and is resolved in an effect, because
 * the server has no `document` and a button that appears only after hydration
 * is better than a hydration mismatch.
 */

/**
 * Safari shipped the unprefixed API in 16.4. The prefixed pair is kept for the
 * versions before that, which are still a real share of desktop Safari. Typed
 * rather than cast through `any`: these are four well-known members, not an
 * unknown surface.
 */
interface WebkitFullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Whether this browser can put an arbitrary element on the display at all.
 *
 * It cannot change while the page is open, so there is nothing to subscribe to
 * — but it is still browser state, and reading it through the same primitive is
 * what keeps it out of an effect.
 */
function subscribeToNothing(): () => void {
  return () => {};
}

function supportSnapshot(): boolean {
  const doc = document as WebkitFullscreenDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

function fullscreenElement(): Element | null {
  const doc = document as WebkitFullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export interface Fullscreen {
  /** False on the server, and on browsers that cannot do this. Hide the control. */
  isSupported: boolean;
  /** True while this element — not merely some element — is fullscreen. */
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * The ref is a parameter rather than a return value, and deliberately: the
 * caller owns the element it is attaching, and a hook that hands back an object
 * with a `ref` on it makes every read of that object — `isFullscreen`,
 * `toggle` — look like a ref access during render to `react-hooks/refs`. This
 * shape keeps the returned value plain.
 */
export function useFullscreen<T extends HTMLElement>(ref: React.RefObject<T | null>): Fullscreen {
  /**
   * Both values are browser state, not React state, so they are read through
   * the primitive built for that rather than mirrored into `useState` from an
   * effect. The server snapshot is `false` for each, which is what makes the
   * control absent in the HTML and present after hydration — the alternative
   * is a mismatch on every render of the room.
   */
  const isSupported = useSyncExternalStore(subscribeToNothing, supportSnapshot, () => false);

  const subscribe = useCallback((onChange: () => void) => {
    // Escape and the browser's own chrome both leave fullscreen without going
    // through `toggle`, so the event is the source of truth rather than a
    // boolean this hook flips optimistically.
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const isFullscreen = useSyncExternalStore(
    subscribe,
    // `=== ref.current`, not `!== null`: some other element being fullscreen is
    // not this stage being fullscreen, and the label must not claim otherwise.
    useCallback(() => fullscreenElement() === ref.current, [ref]),
    () => false
  );

  const toggle = useCallback(() => {
    const element = ref.current as WebkitFullscreenElement | null;
    if (!element) return;

    // `.catch()` rather than try/catch: the request rejects when it was not
    // called from a user gesture, and the React Compiler cannot lower a bare
    // `try` without a catch. Either way a refusal is not worth interrupting
    // anyone over — the stage is still there, just small.
    if (fullscreenElement() === element) {
      const doc = document as WebkitFullscreenDocument;
      const exit = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
      void Promise.resolve(exit?.()).catch(() => {});
      return;
    }

    const request =
      element.requestFullscreen?.bind(element) ?? element.webkitRequestFullscreen?.bind(element);
    void Promise.resolve(request?.()).catch(() => {});
  }, [ref]);

  return { isSupported, isFullscreen, toggle };
}
