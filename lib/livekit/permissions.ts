import type { ParticipationRole } from "@prisma/client";

/**
 * Who may put a track on the wire, as one rule.
 *
 * This used to live only inside the token issuer, as an inline expression, and
 * the browser had no way to ask the question before connecting. So
 * `<LiveKitRoom>` was mounted with `video` and `audio` on for everyone,
 * including the audience — the client asked to publish camera and microphone,
 * the SFU refused, and the member's console filled with
 * `insufficient permissions to publish (PublishTrackError)` before they had
 * touched anything.
 *
 * Both sides now read the same function. The token still decides — this is a
 * prediction of the grant, not a substitute for it — but the two can no longer
 * disagree by accident.
 *
 * `import type` is deliberate: this module is imported by client components,
 * and a value import of `@prisma/client` would drag the query engine's types
 * and shims into the browser bundle. Prisma enums are string enums, so the
 * literal comparisons below are exact.
 */
export function canPublishTracks(role: ParticipationRole): boolean {
  return role === "host" || role === "speaker";
}

/**
 * Everyone in the room publishes data, including the audience. This is not a
 * loosening — it is what the product already is:
 *
 *   chat        `useChat` from @livekit/components-react
 *   hand raise  `hand_raise` on the data channel
 *   poll votes  `poll_vote` on the data channel
 *   reactions   `reaction` on the data channel
 *   whiteboard  `whiteboard_request` from a late joiner
 *
 * A member who cannot publish data is a member who cannot speak in chat, ask
 * for the floor, or answer a poll. The read-only part of "read-only audience"
 * is about tracks — camera, microphone, screen — and about the whiteboard
 * canvas, which is enforced by `viewModeEnabled` and by not wiring the writer.
 *
 * Named rather than inlined so that the grant in the token issuer carries this
 * reasoning at the point where it is made.
 */
export const AUDIENCE_PUBLISHES_DATA = true;

/**
 * The role the token was minted with, as the browser can see it.
 *
 * `joinSession` puts `{ userId, sessionId, role, communityId }` in the token's
 * metadata, and LiveKit hands that back on every participant. It is the only
 * client-side way to tell the host apart from anyone else who may publish: a
 * promoted speaker also carries `canPublish`, so that flag answers "may they
 * talk", never "are they running this".
 *
 * The alternative would be rebuilding the host's identity as
 * `${sessionId}:${mentorId}` and comparing. That is the identity format leaking
 * into a second place — the same coupling that broke the usage webhook — so the
 * metadata is read instead.
 *
 * Returns null for anything unparseable. Metadata is a string LiveKit relays
 * verbatim, and a participant with none is not an error.
 */
export function roleFromMetadata(metadata: string | undefined): ParticipationRole | null {
  if (!metadata) return null;

  try {
    const parsed: unknown = JSON.parse(metadata);
    const role = (parsed as { role?: unknown })?.role;
    return role === "host" || role === "speaker" || role === "listener" ? role : null;
  } catch {
    return null;
  }
}
