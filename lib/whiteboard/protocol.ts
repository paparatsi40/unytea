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

// ───────────────────────────────────────────────────────────────────────────
// Images
//
// An image on the board is two things and only one of them was ever broadcast.
// The element carries the geometry and a `fileId`; the bytes live in a separate
// map Excalidraw calls `files`, keyed by that id. `onChange` hands over both —
// its signature is `(elements, appState, files)` — and the third argument was
// being discarded, so a guest received the element, looked up its `fileId` in
// an empty map, and Excalidraw drew its pending placeholder: a grey rectangle
// with a picture glyph, forever.
//
// Files ride their own transport (LiveKit byte streams) rather than the delta
// packets. A pasted screenshot is 200 KB–1 MB, which as a base64 dataURL is
// 267 KB–1.3 MB — twenty to ninety times a reliable packet's budget. The delta
// path has no sequence numbers and reassembles nothing; the stream API chunks
// and reassembles for us, the same way the late-join snapshot already relies on.
//
// The helpers below are the parts with no LiveKit in them.
// ───────────────────────────────────────────────────────────────────────────

/** One entry of Excalidraw's `files` map, as it travels. */
export interface WhiteboardFile {
  id: string;
  mimeType: string;
  /** The base64 data URL, moved verbatim — never re-encoded on either side. */
  dataURL: string;
}

/** The shape of Excalidraw's `files` argument, narrowed to what is used. */
export type WhiteboardFiles = Record<string, { mimeType?: string; dataURL?: string } | undefined>;

/**
 * The files that have not been sent yet.
 *
 * Identity is enough, unlike elements, which need a version: an Excalidraw file
 * id is derived from the file's contents and the entry is immutable once added.
 * A file that has been sent can never need sending again under the same id.
 */
export function diffFiles(sent: ReadonlySet<string>, files: WhiteboardFiles): WhiteboardFile[] {
  const fresh: WhiteboardFile[] = [];

  for (const [id, file] of Object.entries(files)) {
    if (!file?.dataURL || sent.has(id)) continue;
    fresh.push({
      id,
      mimeType: file.mimeType ?? "application/octet-stream",
      dataURL: file.dataURL,
    });
  }

  return fresh;
}

/**
 * File ids the scene refers to but the viewer does not hold.
 *
 * This is the convergence check. A stroke that fails to arrive is repaired by
 * the next stroke, because the host re-diffs its whole scene every tick — but a
 * file is sent once and never again, so a dropped stream leaves a placeholder
 * that nothing will ever fill. Asking for what is missing is what turns
 * "usually works" into "converges".
 *
 * Deleted elements are skipped: their bytes would be fetched to draw nothing.
 */
export function missingFileIds(
  elements: readonly WhiteboardElement[],
  held: ReadonlySet<string>
): string[] {
  const wanted = new Set<string>();

  for (const element of elements) {
    if (element.isDeleted) continue;
    if (element.type !== "image") continue;
    const fileId = element.fileId;
    if (typeof fileId !== "string" || fileId.length === 0) continue;
    if (held.has(fileId)) continue;
    wanted.add(fileId);
  }

  return [...wanted];
}

/** How long before a file asked for and not delivered is asked for again. */
export const FILE_REQUEST_RETRY_MS = 5_000;

/**
 * How many times to ask for one file before giving up.
 *
 * Bounded on purpose. The host may have closed the board, left the room, or
 * genuinely no longer hold that file, and a viewer that asks forever is a
 * viewer generating traffic nobody will ever answer.
 */
export const FILE_REQUEST_MAX_ATTEMPTS = 3;

export interface FileRequestAttempt {
  attempts: number;
  lastAskedAt: number;
}

/**
 * Which of the wanted files to ask for right now.
 *
 * Filters out the ones already in flight — a request sent 200 ms ago is still
 * arriving, and asking again would have the host stream the same megabyte
 * twice — and the ones already asked for the maximum number of times.
 *
 * Pure: the caller records the attempt with `recordFileRequests` once the
 * request has actually gone out, so a publish that fails is retried on the next
 * pass rather than being counted as an attempt.
 */
export function pendingFileRequests(
  wanted: readonly string[],
  ledger: ReadonlyMap<string, FileRequestAttempt>,
  now: number
): string[] {
  return wanted.filter((fileId) => {
    const previous = ledger.get(fileId);
    if (!previous) return true;
    if (previous.attempts >= FILE_REQUEST_MAX_ATTEMPTS) return false;
    return now - previous.lastAskedAt >= FILE_REQUEST_RETRY_MS;
  });
}

/** Record that these files were just asked for. Mutates the ledger. */
export function recordFileRequests(
  ledger: Map<string, FileRequestAttempt>,
  fileIds: readonly string[],
  now: number
): Map<string, FileRequestAttempt> {
  for (const fileId of fileIds) {
    const previous = ledger.get(fileId);
    ledger.set(fileId, { attempts: (previous?.attempts ?? 0) + 1, lastAskedAt: now });
  }
  return ledger;
}

/**
 * The files a scene needs, in the order they are referenced.
 *
 * Used to answer a late joiner: the host holds every file it has ever pasted,
 * but only the ones the current scene points at are worth streaming.
 */
export function filesForScene(
  elements: readonly WhiteboardElement[],
  held: ReadonlyMap<string, WhiteboardFile>
): WhiteboardFile[] {
  const out: WhiteboardFile[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    if (element.isDeleted) continue;
    if (element.type !== "image") continue;
    const fileId = element.fileId;
    if (typeof fileId !== "string" || seen.has(fileId)) continue;
    const file = held.get(fileId);
    if (!file) continue;
    seen.add(fileId);
    out.push(file);
  }

  return out;
}
