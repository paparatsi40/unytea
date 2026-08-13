import Pusher from "pusher";

/**
 * The single server-side Pusher emitter.
 *
 * Realtime events are emitted **only** from server code that has already
 * authorized the underlying write. There used to be a `PUT /api/pusher` that
 * took a channel name, event name and payload straight from the client and
 * forwarded them to Pusher, which let any authenticated user inject fabricated
 * `message` events into any community's channel or anyone's DM thread (SEC-06).
 * That endpoint is gone; this module replaces it.
 *
 * Two Pusher clients previously existed — one in the route, one in
 * app/actions/messages.ts — so this also removes the duplication.
 */

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

/**
 * Channel naming. The client subscribes to `private-channel-{id}`, where the id
 * is either a community `Channel.id` or a `Conversation.id` — the two are
 * distinguished at authorization time in app/api/pusher/route.ts.
 */
export function realtimeChannelName(id: string): string {
  return `private-channel-${id}`;
}

/** The event names the product actually emits. Nothing else may be sent. */
export type RealtimeEvent = "message" | "message:deleted";

export interface RealtimeMessagePayload {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  conversationId?: string;
  channelId?: string;
}

/**
 * Emit to a private channel. Best-effort: a realtime failure must never fail
 * the write that already succeeded, so this logs and swallows.
 *
 * Callers are responsible for authorization — every current caller is a Server
 * Action that has already passed the `defineAction` seam.
 */
export async function emitRealtime(
  channelId: string,
  event: RealtimeEvent,
  payload: RealtimeMessagePayload | { messageId: string }
): Promise<void> {
  try {
    await pusher.trigger(realtimeChannelName(channelId), event, payload);
  } catch (error) {
    console.error(`[pusher] emit failed for ${event}:`, error);
  }
}

/** Authorizes a socket for a private channel. Call only after the caller's access is verified. */
export function authorizePrivateChannel(
  socketId: string,
  channel: string,
  user: { id: string; name?: string | null }
) {
  return pusher.authorizeChannel(socketId, channel, {
    user_id: user.id,
    user_info: { name: user.name ?? null },
  });
}
