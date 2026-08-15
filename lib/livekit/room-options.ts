import type { RoomOptions } from "livekit-client";

/**
 * Room options for every LiveKit room in the product.
 *
 * Both room components previously mounted `<LiveKitRoom>` with no `options`
 * prop at all, which meant they ran on `roomOptionDefaults` from
 * livekit-client — and those defaults are tuned for correctness on first
 * contact, not for a bill. Two of them are off, and both are off in the
 * expensive direction:
 *
 * **adaptiveStream** — a subscriber receives the layer that matches the size
 * the video element is actually rendered at, and pauses tracks that are not
 * visible at all. Off, every subscriber pulls the publisher's top simulcast
 * layer (720p, ~1.7 Mbps) even for a thumbnail in a grid, and keeps pulling it
 * while scrolled out of view. This is the single largest downstream multiplier
 * available: in a grid of N tiles it is the difference between N × 1.7 Mbps and
 * N × whatever the tiles actually need.
 *
 * **dynacast** — the SFU tells a publisher to stop encoding and sending
 * simulcast layers that no subscriber is currently consuming. Off, every
 * publisher uploads all three layers (h180 + h360 + h720 ≈ 2.3 Mbps) for the
 * entire session, including the top layer when everyone is looking at a
 * thumbnail. This is the upstream half of the same waste.
 *
 * Neither changes what a participant sees. adaptiveStream only ever downgrades
 * a stream to the resolution the element is already displaying, and dynacast
 * only stops layers nobody asked for — the moment someone opens a tile to full
 * size, the layer is requested and resumes. LiveKit recommends both for
 * production; they are off by default for backwards compatibility, not because
 * they are risky.
 *
 * Deliberately NOT changed in this pass, and worth deciding separately:
 *   - `publishDefaults.videoCodec` stays VP8 (the library default). VP9/AV1
 *     would cut bitrate
 *     materially but cost CPU on the publisher and lose some client support.
 *   - `autoSubscribe` stays true. Selective subscription would help further,
 *     but the UI drives itself off `useTracks`, which assumes tracks arrive on
 *     their own; changing it is a UI change, not a config change.
 */
export const ROOM_OPTIONS: RoomOptions = {
  // Subscribe at the resolution actually rendered; pause invisible tracks.
  adaptiveStream: true,
  // Let the SFU switch off simulcast layers nobody is consuming.
  dynacast: true,
};
