import { DisconnectReason } from "livekit-client";

/**
 * Whether a disconnect is the end of the session or a bump in the road.
 *
 * `onDisconnected` fires for both, and this room treated them the same: the
 * handler called `onLeave()`, which navigates to the session list. So a signal
 * socket closing for two seconds — something livekit-client recovers from on
 * its own, without the participant noticing — threw the user out of a live
 * workshop and left them looking at a list.
 *
 * The reasons below are the ones where there is nothing to come back to. Every
 * other reason, named or unknown, is treated as recoverable: the client is
 * already reconnecting, and the worst case of staying is a few seconds of a
 * frozen tile. The worst case of leaving is losing the session.
 *
 * `UNKNOWN_REASON` is deliberately *not* terminal. It is what arrives when the
 * transport drops without a protocol-level explanation — which is the ordinary
 * shape of a bad network, not of a room that has ended.
 */
const TERMINAL_REASONS: ReadonlySet<DisconnectReason> = new Set([
  DisconnectReason.DUPLICATE_IDENTITY,
  DisconnectReason.PARTICIPANT_REMOVED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.ROOM_CLOSED,
  DisconnectReason.SERVER_SHUTDOWN,
  DisconnectReason.JOIN_FAILURE,
  DisconnectReason.USER_REJECTED,
]);

export function isTerminalDisconnect(reason?: DisconnectReason): boolean {
  if (reason === undefined) return false;
  return TERMINAL_REASONS.has(reason);
}

/**
 * The reason as a name, for a log a human will read.
 *
 * The event carries an integer. A production log that says `2` is a log nobody
 * can act on, and `DUPLICATE_IDENTITY` is the single most useful word this
 * subsystem can print — it is the difference between "two tabs are fighting
 * over one identity" and "the network is bad", which are opposite problems with
 * opposite fixes.
 */
export function disconnectReasonName(reason?: DisconnectReason): string {
  if (reason === undefined) return "NONE";
  return DisconnectReason[reason] ?? `UNKNOWN(${reason})`;
}
