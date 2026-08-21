"use client";

/**
 * Shrinking a pasted image before the room has to carry it.
 *
 * A whiteboard is a screen, and a screen is not a photo lab. A 4000-pixel-wide
 * photo pasted onto a board is displayed at a few hundred pixels and broadcast
 * at full resolution to everyone in the room — as a base64 dataURL, which is a
 * third larger again. Capping the long edge costs nothing anyone can see and
 * takes a 2 MB photo comfortably under a megabyte.
 *
 * ## Where this runs, and why not earlier
 *
 * The natural place would be before Excalidraw computes the file id, so that
 * the id belongs to the smaller copy and nothing downstream ever sees the
 * original. Excalidraw 0.18 does not allow it: its paste handler creates the
 * image element and calls `insertImageElement` *before* it consults the
 * `onPaste` prop, and returns straight afterwards, so a host application never
 * gets a look at an image file. Drops and the file picker never reach `onPaste`
 * at all.
 *
 * So the shrink happens at the next honest point — the moment the file map is
 * first observed — and the smaller copy is handed back to Excalidraw under the
 * same id. From there the id is the only thing anything downstream knows about,
 * and it has not changed: the delta path, the snapshot, the convergence pass
 * and the send dedup all key on it and none of them can tell the difference.
 */

/**
 * The long edge a whiteboard image is capped at.
 *
 * 1600 covers a full-width image on a 2560-wide display at 1× and still has
 * room on a HiDPI panel, where the board itself is rarely more than half the
 * window. Above that is detail nobody can see on a shared canvas.
 */
export const MAX_IMAGE_EDGE_PX = 1600;

/**
 * Below this, do not even decode it.
 *
 * Decoding, drawing and re-encoding an icon costs more than it saves, and the
 * saving would be invisible against a session's video.
 */
export const MIN_DOWNSCALE_BYTES = 64 * 1024;

/** JPEG quality for images that have no transparency to lose. */
export const JPEG_QUALITY = 0.85;

/**
 * The types worth rescaling.
 *
 * SVG is vector — rasterising it to fit a pixel cap would make it larger and
 * worse at once. GIF may be animated, and a canvas re-encode keeps one frame,
 * which is a silent way to break a picture. Both pass through untouched.
 */
const RESIZABLE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface ImageFacts {
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Whether this image is worth shrinking.
 *
 * Dimension is the test, not weight: an image wider than the cap has more
 * pixels than any viewer will see, whatever it happens to compress to. The byte
 * floor only skips the work for files too small for it to matter.
 */
export function shouldDownscale(facts: ImageFacts): boolean {
  if (!RESIZABLE_TYPES.has(facts.mimeType)) return false;
  if (facts.bytes < MIN_DOWNSCALE_BYTES) return false;
  return Math.max(facts.width, facts.height) > MAX_IMAGE_EDGE_PX;
}

/**
 * The size to draw at, with the aspect ratio kept.
 *
 * Rounded rather than floored, and never below one pixel: a 4000×3 banner
 * scaled by the long edge would otherwise come out zero pixels tall, and a
 * canvas of zero height throws.
 */
export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE_PX
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * What to re-encode as.
 *
 * PNG stays PNG: it is the format that carries transparency, and a pasted
 * screenshot with a transparent corner turns into a black corner the moment it
 * becomes a JPEG. Everything else becomes JPEG, which is dramatically smaller
 * for the photographs that are the reason this module exists.
 */
export function outputMimeType(sourceMimeType: string): string {
  return sourceMimeType === "image/png" ? "image/png" : "image/jpeg";
}

/** Bytes a base64 data URL actually occupies once encoded. */
export function dataUrlByteLength(dataURL: string): number {
  const comma = dataURL.indexOf(",");
  if (comma === -1) return dataURL.length;

  const payload = dataURL.length - comma - 1;
  const padding = dataURL.endsWith("==") ? 2 : dataURL.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload * 3) / 4) - padding);
}

/**
 * Why an image came out the size it did.
 *
 * Returned rather than inferred, because the caller is the only place that can
 * say it out loud and silence was indistinguishable from "the feature is not
 * running" — which is exactly the question that had to be answered by driving
 * the component in a test harness instead of reading a log.
 */
export type DownscaleReason =
  | "shrunk"
  | "already_small"
  | "unsupported_type"
  | "below_floor"
  | "not_smaller"
  | "failed";

export interface DownscaleOutcome {
  dataURL: string;
  mimeType: string;
  reason: DownscaleReason;
  bytesBefore: number;
  bytesAfter: number;
}

/**
 * How long to wait for the browser to decode an image before giving up.
 *
 * `new Image()` resolves through `onload`, and there is no guarantee either
 * handler ever fires — a data URL the decoder rejects outright can leave both
 * silent. That used to be survivable, because the file was forwarded before any
 * of this ran. It stopped being survivable when the order was inverted to send
 * only the shrunk copy: a promise that never settles now withholds the image
 * from the room for the rest of the session.
 *
 * So the wait is bounded and the timeout falls back to sending what we were
 * given. Hygiene must not be able to lose a picture.
 */
export const DECODE_TIMEOUT_MS = 5_000;

/**
 * Shrink a data URL, or hand back the one given.
 *
 * Returns the original whenever shrinking would not help or could not be done —
 * an image that is already small, a format not worth touching, a decode that
 * failed, or a re-encode that somehow came out bigger. Never throws and never
 * returns something worse than what it was given: this is hygiene, and hygiene
 * that can break a paste is not worth having.
 */
export async function downscaleDataUrl(
  dataURL: string,
  mimeType: string,
  maxEdge: number = MAX_IMAGE_EDGE_PX
): Promise<DownscaleOutcome> {
  const bytes = dataUrlByteLength(dataURL);
  const unchanged = (reason: DownscaleReason): DownscaleOutcome => ({
    dataURL,
    mimeType,
    reason,
    bytesBefore: bytes,
    bytesAfter: bytes,
  });

  if (!RESIZABLE_TYPES.has(mimeType)) return unchanged("unsupported_type");
  if (bytes < MIN_DOWNSCALE_BYTES) return unchanged("below_floor");

  try {
    const image = await loadImage(dataURL);
    if (!shouldDownscale({ mimeType, width: image.width, height: image.height, bytes })) {
      return unchanged("already_small");
    }

    const size = targetDimensions(image.width, image.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) return unchanged("failed");
    context.drawImage(image, 0, 0, size.width, size.height);

    const output = outputMimeType(mimeType);
    const shrunk = canvas.toDataURL(output, output === "image/jpeg" ? JPEG_QUALITY : undefined);
    const shrunkBytes = dataUrlByteLength(shrunk);

    // A re-encode is not guaranteed to win — a flat diagram can come out of the
    // PNG encoder larger than it went in. Keep whichever is smaller.
    if (shrunkBytes >= bytes) return unchanged("not_smaller");

    return {
      dataURL: shrunk,
      mimeType: output,
      reason: "shrunk",
      bytesBefore: bytes,
      bytesAfter: shrunkBytes,
    };
  } catch (error) {
    console.warn("[whiteboard] could not downscale an image; sending it as-is", error);
    return unchanged("failed");
  }
}

/**
 * Decode a data URL, with a deadline.
 *
 * Neither `onload` nor `onerror` is guaranteed to fire — a data URL the decoder
 * rejects outright can leave both silent — and since the forward now waits on
 * this, a promise that never settles withholds the image from the room for the
 * rest of the session. The image is held in a local until it settles so that a
 * garbage collector cannot take it mid-decode.
 */
function loadImage(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(`image decode timed out after ${DECODE_TIMEOUT_MS}ms`));
    }, DECODE_TIMEOUT_MS);

    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("image decode failed"));
    };
    image.src = dataURL;
  });
}

/**
 * Which files may be forwarded now, and which still have work to do.
 *
 * An image has two versions in its short life: the one Excalidraw built from
 * the clipboard, and the smaller one this module makes from it. Only the second
 * is worth putting on the wire, and the first was getting there anyway —
 * `onChange` fires with the original, the forward was the first line of the
 * handler, and the transport claims a file the moment it starts sending. By the
 * time the smaller copy existed, the id was already spent and the send dedup
 * filtered it out. The reduction reached the host's own canvas and nothing else.
 *
 * So an image is held back until its shrink has run. `pending` is the set being
 * worked on right now — those are withheld — and `settled` is the set whose
 * final version has already been forwarded, which are passed through again so
 * that a send refused by an unready transport still gets retried.
 *
 * Entries with no bytes yet are skipped: Excalidraw keeps a placeholder in the
 * map while it reads the file, and forwarding that would send nothing.
 */
export function partitionFilesForForward(
  files: Record<string, { mimeType?: string; dataURL?: string } | undefined>,
  settled: ReadonlySet<string>,
  pending: ReadonlySet<string>
): {
  ready: Record<string, { mimeType?: string; dataURL?: string }>;
  toShrink: Array<{ id: string; mimeType: string; dataURL: string }>;
} {
  const ready: Record<string, { mimeType?: string; dataURL?: string }> = {};
  const toShrink: Array<{ id: string; mimeType: string; dataURL: string }> = [];

  for (const [id, file] of Object.entries(files)) {
    const dataURL = file?.dataURL;
    const mimeType = file?.mimeType;
    if (!dataURL || !mimeType) continue;

    if (settled.has(id)) {
      ready[id] = file;
      continue;
    }
    if (pending.has(id)) continue;

    toShrink.push({ id, mimeType, dataURL });
  }

  return { ready, toShrink };
}
