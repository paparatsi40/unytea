"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import {
  applyDelta,
  chunkElements,
  diffElements,
  orderedElements,
  type WhiteboardElement,
} from "@/lib/whiteboard/protocol";
import { isDataTransportReady, whenConnected } from "@/lib/livekit/data-transport";

/**
 * Moving the host's whiteboard to everyone else.
 *
 * Deliberately its own hook rather than more surface on
 * `useSessionDataChannel`. Both attach their own `RoomEvent.DataReceived`
 * listener — LiveKit's emitter is additive — and both ignore payloads they do
 * not recognise, so hands, polls and the whiteboard stay independent. Bundling
 * them would mean every room screen that wants a raised hand also carries the
 * whiteboard's accumulator.
 *
 * Two transports, chosen by what is being sent:
 *
 *   deltas    `publishData`, reliable, chunked to a byte budget by the
 *             protocol module. Small and frequent.
 *   snapshot  `sendText` on its own topic, addressed to one identity. Sent once
 *             per late joiner and unbounded in size, so it uses the API that
 *             chunks and reassembles for us instead of an ad-hoc framing.
 */

const SNAPSHOT_TOPIC = "unytea.whiteboard.snapshot";

type WhiteboardMessage =
  | { kind: "whiteboard_mode"; open: boolean }
  | { kind: "whiteboard_delta"; elements: WhiteboardElement[] }
  /** A viewer asking for the current board. Answered only by the host. */
  | { kind: "whiteboard_request" };

function isWhiteboardMessage(value: unknown): value is WhiteboardMessage {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "whiteboard_mode" || kind === "whiteboard_delta" || kind === "whiteboard_request";
}

export interface WhiteboardChannel {
  /** True when the host has the board open. Drives the viewer's stage. */
  isOpen: boolean;
  /** The scene to render, ordered. Empty until the first delta or snapshot. */
  elements: WhiteboardElement[];
  /** Bumped on every applied update, so a consumer can react without diffing. */
  revision: number;
  /** Host only: announce the board opening or closing. */
  publishMode: (open: boolean) => void;
  /** Host only: send whatever changed since the last call. */
  publishElements: (elements: readonly WhiteboardElement[]) => void;
  /** Host only: forget what has been sent, so the next publish resends all. */
  resetSentVersions: () => void;
}

export function useWhiteboardChannel(isHost: boolean): WhiteboardChannel {
  const room = useRoomContext();

  const [isOpen, setIsOpen] = useState(false);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [revision, setRevision] = useState(0);

  /** The viewer's accumulated scene, keyed by element id. */
  const sceneRef = useRef<Map<string, WhiteboardElement>>(new Map());
  /** The host's record of what each element looked like when last sent. */
  const sentVersionsRef = useRef<Map<string, number>>(new Map());
  /** The host's latest scene, for answering a late joiner at any moment. */
  const hostSceneRef = useRef<WhiteboardElement[]>([]);
  const isOpenRef = useRef(false);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const encoder = useRef(new TextEncoder());
  const decoder = useRef(new TextDecoder());

  /**
   * Hand one message to the data channel, or decline to.
   *
   * Returns whether the message was handed over at all, so a caller that
   * records what it has sent can avoid recording something that never left.
   *
   * The check is what fixes `UnexpectedConnectionState: PC manager is closed`.
   * `publishData` rejects rather than queues when the engine has no peer
   * connection, and this hook publishes from a mount effect — which runs while
   * `<LiveKitRoom>` is still connecting, because it renders its children
   * immediately. See `lib/livekit/data-transport.ts`.
   */
  const publish = useCallback(
    (message: WhiteboardMessage): boolean => {
      if (!isDataTransportReady(room)) return false;

      room.localParticipant
        .publishData(encoder.current.encode(JSON.stringify(message)), { reliable: true })
        .catch((error) => {
          // A dropped delta is not fatal: the element keeps its old version in
          // `sentVersionsRef` only if the send succeeded, so the next tick
          // picks it up again.
          console.error("[whiteboard] publish failed", error);
        });
      return true;
    },
    [room]
  );

  // ── viewer: apply what arrives ──────────────────────────────────────────
  const ingest = useCallback((incoming: readonly WhiteboardElement[]) => {
    applyDelta(sceneRef.current, incoming);
    setElements(orderedElements(sceneRef.current));
    setRevision((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      let message: unknown;
      try {
        message = JSON.parse(decoder.current.decode(payload));
      } catch {
        return; // Not ours. Hands and polls share this channel.
      }
      if (!isWhiteboardMessage(message)) return;

      switch (message.kind) {
        case "whiteboard_mode": {
          // The host's own state is local; this is for everyone else.
          if (!isHostRef.current) setIsOpen(message.open);
          break;
        }

        case "whiteboard_delta": {
          if (!isHostRef.current) ingest(message.elements);
          break;
        }

        case "whiteboard_request": {
          // Only the host can answer, and only to whoever asked.
          if (!isHostRef.current || !participant) return;

          publish({ kind: "whiteboard_mode", open: isOpenRef.current });

          // The snapshot is the whole scene and has no size ceiling, so it goes
          // over the stream API rather than the packet API.
          if (!isDataTransportReady(room)) return;
          const snapshot = JSON.stringify({ elements: hostSceneRef.current });
          room.localParticipant
            .sendText(snapshot, {
              topic: SNAPSHOT_TOPIC,
              destinationIdentities: [participant.identity],
            })
            .catch((error) => {
              console.error("[whiteboard] snapshot failed", error);
            });
          break;
        }
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, ingest, publish]);

  // ── viewer: receive a snapshot ──────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    // `registerTextStreamHandler` throws `HandlerAlreadyRegistered` rather than
    // replacing, and an exception here happens during render of the whole room.
    // Clearing first makes the registration idempotent by construction, which
    // is cheaper than reasoning about every path that could mount this twice.
    room.unregisterTextStreamHandler(SNAPSHOT_TOPIC);
    room.registerTextStreamHandler(SNAPSHOT_TOPIC, (reader) => {
      reader
        .readAll()
        .then((raw) => {
          const parsed: unknown = JSON.parse(raw);
          const incoming = (parsed as { elements?: WhiteboardElement[] })?.elements;
          if (!Array.isArray(incoming)) return;

          // A snapshot replaces rather than merges: it is the host's whole
          // scene at a known moment, and anything held that is not in it was
          // removed while this viewer was not listening.
          sceneRef.current = new Map();
          ingest(incoming);
        })
        .catch((error) => {
          console.error("[whiteboard] snapshot read failed", error);
        });
    });

    return () => {
      room.unregisterTextStreamHandler(SNAPSHOT_TOPIC);
    };
  }, [room, isHost, ingest]);

  // ── viewer: ask for the board on arrival ────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    // Asking, rather than waiting to be told. The host cannot know when this
    // client's UI is ready, and a viewer who joins mid-session would otherwise
    // stare at an empty board until the host's next stroke.
    //
    // Asking *once connected*, rather than on mount. This effect used to fire
    // the moment the component appeared, which is several hundred milliseconds
    // before the room finishes connecting — the request threw
    // `UnexpectedConnectionState: PC manager is closed` and was never retried,
    // so the late joiner got the blank canvas the request exists to prevent.
    // It looked like a permission problem because it only ever happened to
    // members; it was a timing problem, and the host was immune only because a
    // host publishes from a click.
    const ask = () => {
      publish({ kind: "whiteboard_request" });
    };

    const cancel = whenConnected(room, ask);

    // A reconnect can span strokes this client never saw, and the accumulated
    // scene has no way to know it is stale. Ask again.
    room.on(RoomEvent.Reconnected, ask);
    return () => {
      cancel();
      room.off(RoomEvent.Reconnected, ask);
    };
  }, [isHost, publish, room]);

  // ── host: keep the answer to that request current ───────────────────────
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const publishMode = useCallback(
    (open: boolean) => {
      isOpenRef.current = open;
      setIsOpen(open);
      publish({ kind: "whiteboard_mode", open });
    },
    [publish]
  );

  const publishElements = useCallback(
    (current: readonly WhiteboardElement[]) => {
      // The host's own copy is kept regardless, so a late joiner arriving after
      // a blip still gets everything drawn during it.
      hostSceneRef.current = [...current];

      const { changed, versions } = diffElements(sentVersionsRef.current, current);
      if (changed.length === 0) return;

      let allSent = true;
      for (const chunk of chunkElements(changed)) {
        if (!publish({ kind: "whiteboard_delta", elements: chunk })) allSent = false;
      }

      // Recording versions for a chunk that was refused would mark those
      // elements as sent forever — the next diff would skip them and the stroke
      // would be lost for everyone. Only a send that happened counts.
      if (allSent) sentVersionsRef.current = versions;
    },
    [publish]
  );

  const resetSentVersions = useCallback(() => {
    sentVersionsRef.current = new Map();
  }, []);

  return { isOpen, elements, revision, publishMode, publishElements, resetSentVersions };
}
