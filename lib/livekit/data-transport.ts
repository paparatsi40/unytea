"use client";

import { ConnectionState, RoomEvent, type Room } from "livekit-client";

/**
 * When a data packet may actually be handed to the engine.
 *
 * `<LiveKitRoom>` renders its children as soon as it mounts — it does not wait
 * for `room.connect()` to resolve, because the whole point of the context is
 * that the UI is already there when the connection lands. So every effect in
 * the room tree runs while `room.state` is still `connecting`, and anything
 * that publishes from an effect body publishes into an engine that has no peer
 * connection yet.
 *
 * That is the whiteboard's `UnexpectedConnectionState: PC manager is closed`.
 * It was read as a permission problem because it only ever showed up on the
 * member's screen, but the member's token grants `canPublishData` exactly like
 * the host's. The difference was timing, not rights: the host opens the board
 * by clicking a button, long after connecting, while the viewer asks for it
 * from a mount effect.
 *
 * `publishData` rejects rather than queues in that window, so the caller is the
 * one that has to wait. These two helpers are that wait, in one place, for the
 * three call sites that publish data.
 */

/**
 * True when a publish will reach the SFU: the engine is connected *and* this
 * participant is allowed to send data.
 *
 * The permission half defaults to `true` when `permissions` is undefined —
 * that is the window before the server's participant info has arrived, and
 * treating it as a denial would drop the first packet of every session.
 */
export function isDataTransportReady(room: Room): boolean {
  if (room.state !== ConnectionState.Connected) return false;
  return room.localParticipant.permissions?.canPublishData ?? true;
}

/**
 * Run `fn` as soon as the room is connected, or immediately if it already is.
 *
 * Returns an unsubscribe. Call it on unmount: without it, a member who leaves
 * during the connection handshake still fires whatever was waiting, into a room
 * that is on its way out.
 */
export function whenConnected(room: Room, fn: () => void): () => void {
  if (room.state === ConnectionState.Connected) {
    fn();
    return () => {};
  }

  const onStateChanged = (state: ConnectionState) => {
    if (state !== ConnectionState.Connected) return;
    room.off(RoomEvent.ConnectionStateChanged, onStateChanged);
    fn();
  };

  room.on(RoomEvent.ConnectionStateChanged, onStateChanged);
  return () => {
    room.off(RoomEvent.ConnectionStateChanged, onStateChanged);
  };
}

/**
 * How long a click will wait for a transport that is still coming up before it
 * gives up. Long enough to cover a connection handshake or a reconnect, short
 * enough that a button does not sit on a promise for a session that is never
 * coming back.
 */
export const PUBLISH_WAIT_MS = 10_000;

/**
 * Publish a data packet, waiting for the transport rather than dropping it.
 *
 * The distinction matters and it is the one `fix/room-member-data` got wrong.
 * Two kinds of thing go on this channel:
 *
 *   automatic  the whiteboard's delta stream. It has a next tick, so a packet
 *              refused now is re-sent in 250 ms. Dropping is correct, and
 *              `isDataTransportReady` is the right gate.
 *
 *   deliberate a reaction, a raised hand, a poll vote. There is no next tick —
 *              there is a person who pressed a button. Dropping it silently is
 *              worse than the exception it replaced: nothing appears, nothing
 *              is logged where the user can see it, and the room simply does
 *              not hear them.
 *
 * A member is the one who hits this. The host has been connected for minutes
 * before anyone arrives; a member presses something within seconds of landing,
 * which is exactly the window where the engine has no peer connection yet.
 *
 * Resolves to whether the packet was handed over, so the caller can undo an
 * optimistic update instead of showing a hand nobody received.
 */
export async function publishWhenReady(
  room: Room,
  payload: Uint8Array,
  options: { reliable?: boolean } = { reliable: true }
): Promise<boolean> {
  // Nothing will change for this Room instance: a disconnect is terminal, and
  // reconnects report `Reconnecting`, not `Disconnected`.
  if (room.state === ConnectionState.Disconnected) return false;

  // An explicit denial is not a wait. Unset is, because participant info can
  // still be in flight — see `isDataTransportReady`.
  if (room.localParticipant.permissions?.canPublishData === false) return false;

  if (room.state !== ConnectionState.Connected) {
    const connected = await new Promise<boolean>((resolve) => {
      let cancel = () => {};
      const timer = setTimeout(() => {
        cancel();
        resolve(false);
      }, PUBLISH_WAIT_MS);
      cancel = whenConnected(room, () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!connected) return false;
  }

  try {
    await room.localParticipant.publishData(payload, options);
    return true;
  } catch (error) {
    console.error("[livekit] data publish failed", error);
    return false;
  }
}
