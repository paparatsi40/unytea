/**
 * The wire format for broadcasting the host's whiteboard.
 *
 * The whiteboard is a presentation surface, not a shared document: the host
 * draws, everyone else watches. That asymmetry is what makes this tractable
 * without a CRDT — there is exactly one writer, so there is nothing to merge
 * and no conflict to resolve. A viewer's copy is a projection of the host's,
 * and the only question is how to move it across cheaply.
 *
 * ## Why deltas rather than the whole scene
 *
 * LiveKit's reliable data messages are meant to stay under roughly 15 KiB. An
 * Excalidraw element serialises to somewhere around 300–600 bytes, so a full
 * scene passes that ceiling at a few dozen shapes — and a whiteboard that
 * cannot hold fifty shapes is not a whiteboard. Sending the whole scene on
 * every stroke also scales the wrong way: cost grows with what has been drawn,
 * not with what just changed, so the board gets slower the more it is used.
 *
 * Excalidraw hands us exactly what a delta needs. Every element carries a
 * `version` that increments on each change, so "what changed" is a comparison
 * against the versions last sent. Deletions ride along as ordinary updates
 * because a deleted element stays in the scene with `isDeleted: true`. And
 * stacking order lives on the element as a `index`, a
 * fractional index — so a receiver can order a partial update correctly without
 * being told the full element list. Without that last property this design
 * would need to ship every id on every change, which is most of the payload it
 * is trying to avoid.
 *
 * The full scene is still sent once per late joiner. That one is a snapshot,
 * not a delta, and it goes over LiveKit's text-stream API, which chunks for us.
 */

/** The fields the protocol reads. Everything else is passed through untouched. */
export interface WhiteboardElement {
  id: string;
  version: number;
  versionNonce?: number;
  /** Fractional index; `null` on elements not yet placed in a scene. */
  index?: string | null;
  isDeleted?: boolean;
  [key: string]: unknown;
}

/**
 * How many bytes of elements to put in one data message.
 *
 * LiveKit negotiates an SCTP `maxMessageSize` (64 KiB when it cannot be parsed
 * from the SDP) but recommends staying near 15 KiB for reliable packets. This
 * sits below that with room for the JSON envelope — type, sequence number,
 * brackets and commas — so a chunk that measures under the budget cannot be
 * pushed over it by the wrapper.
 */
export const DELTA_BUDGET_BYTES = 11_000;

/**
 * How long changes are collected before a send.
 *
 * Excalidraw's `onChange` fires on every pointer move, which for a single
 * dragged stroke is tens of events a second. Coalescing on a trailing timer
 * turns that into at most four messages a second carrying only the final state
 * of each element in the window, which is all a viewer can perceive anyway.
 * Below about 150ms the saving disappears; above about 400ms the drawing starts
 * to feel detached from the person talking over it.
 */
export const BROADCAST_INTERVAL_MS = 250;

/** UTF-8 byte length, which is what the transport actually counts. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * The elements that changed since the versions in `sent`.
 *
 * New elements have no recorded version and are always included. An element
 * whose version is unchanged is skipped even if its object identity changed,
 * which matters because Excalidraw reallocates its array freely.
 *
 * Returns the changed elements and the version map to record once they have
 * actually gone out — the caller updates its record after a successful send, so
 * a failed publish is retried on the next tick rather than silently dropped.
 */
export function diffElements(
  sent: Map<string, number>,
  elements: readonly WhiteboardElement[]
): { changed: WhiteboardElement[]; versions: Map<string, number> } {
  const changed: WhiteboardElement[] = [];
  const versions = new Map<string, number>();

  for (const element of elements) {
    versions.set(element.id, element.version);
    if (sent.get(element.id) !== element.version) {
      changed.push(element);
    }
  }

  return { changed, versions };
}

/**
 * Split elements into groups that each fit in one data message.
 *
 * A single element larger than the budget — a freedraw stroke with a very long
 * point list is the realistic case — still gets its own group and is sent
 * alone. Dropping it would leave the viewer's board permanently missing a
 * shape, and an oversized reliable packet fails loudly rather than corrupting
 * anything, so an honest attempt beats a silent hole.
 */
export function chunkElements(
  elements: readonly WhiteboardElement[],
  budget: number = DELTA_BUDGET_BYTES
): WhiteboardElement[][] {
  const chunks: WhiteboardElement[][] = [];
  let current: WhiteboardElement[] = [];
  let currentSize = 0;

  for (const element of elements) {
    const size = byteLength(JSON.stringify(element));

    if (current.length > 0 && currentSize + size > budget) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }

    current.push(element);
    currentSize += size;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Apply an incoming update to a viewer's scene.
 *
 * Last write wins by version, because there is only one writer: a lower version
 * than the one already held is a message that arrived out of order, and
 * applying it would roll the viewer backwards. `versionNonce` breaks the tie
 * when versions match, the same way Excalidraw's own reconciliation does, so
 * two clients that see the same pair of updates land on the same element.
 *
 * Mutates and returns `scene` — it is the viewer's private accumulator, and
 * copying the whole map on every delta would reintroduce the cost this design
 * exists to avoid.
 */
export function applyDelta(
  scene: Map<string, WhiteboardElement>,
  incoming: readonly WhiteboardElement[]
): Map<string, WhiteboardElement> {
  for (const element of incoming) {
    const held = scene.get(element.id);

    if (held) {
      if (element.version < held.version) continue;
      if (
        element.version === held.version &&
        (element.versionNonce ?? 0) <= (held.versionNonce ?? 0)
      ) {
        continue;
      }
    }

    scene.set(element.id, element);
  }

  return scene;
}

/**
 * The scene in the order it should be drawn.
 *
 * Stacking order is the fractional index, compared as a string — that is the
 * whole point of the format, and it is why a delta can be applied without
 * knowing the rest of the scene. Elements with no index yet sort last, in id
 * order so that every viewer agrees; Excalidraw assigns them a real index as
 * soon as they land in a scene, so this only covers the moment in between.
 */
export function orderedElements(scene: Map<string, WhiteboardElement>): WhiteboardElement[] {
  return [...scene.values()].sort((a, b) => {
    const left = a.index ?? null;
    const right = b.index ?? null;

    if (left === null && right === null) return a.id < b.id ? -1 : 1;
    if (left === null) return 1;
    if (right === null) return -1;
    if (left === right) return a.id < b.id ? -1 : 1;
    return left < right ? -1 : 1;
  });
}
