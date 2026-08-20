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
