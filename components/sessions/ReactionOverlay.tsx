"use client";

import { useTranslations } from "next-intl";
import type { RoomReaction } from "@/hooks/useSessionDataChannel";

/**
 * Reactions, on screen.
 *
 * The room has had a reactions bar since the beginning and no way to see one.
 * `ReactionsBar` published a packet, and the data-channel handler answered it
 * with `case "reaction": break;` — so pressing ❤️ did exactly nothing visible,
 * for the sender and for everyone else. This is the receiving half.
 *
 * A layer over the stage rather than a list somewhere: a reaction is an
 * interruption that should not cost anyone their place. It takes no pointer
 * events, so it never sits between a viewer and what they were watching, and
 * each one leaves on its own after `REACTION_TTL_MS`.
 *
 * Positions come from the reaction's own id, not from `Math.random()`, so the
 * same reaction lands in the same place on every render and does not jump
 * around while it floats.
 */
/**
 * The labels this room knows how to name. `label` arrives from another
 * participant, and `t()` on an unknown key is an error, not a blank — so an
 * old or hand-rolled client must not be able to break the overlay for
 * everyone by sending one.
 */
const KNOWN_LABELS = new Set(["thumbsup", "heart", "fire", "party", "clap"]);

export function ReactionOverlay({ reactions }: { reactions: RoomReaction[] }) {
  const t = useTranslations("liveSession.reactionsBar");

  if (reactions.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      data-testid="reaction-overlay"
    >
      {reactions.map((reaction, index) => (
        <span
          key={reaction.id}
          className="absolute bottom-6 animate-bounce text-4xl drop-shadow-lg"
          style={{ left: `${8 + ((index * 13) % 78)}%` }}
        >
          {KNOWN_LABELS.has(reaction.label) && <span className="sr-only">{t(reaction.label)}</span>}
          <span aria-hidden="true">{reaction.emoji}</span>
        </span>
      ))}
    </div>
  );
}
