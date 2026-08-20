"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import {
  applyDelta,
  chunkElements,
  diffElements,
  diffFiles,
  filesForScene,
  FILE_REQUEST_RETRY_MS,
  missingFileIds,
  orderedElements,
  pendingFileRequests,
  recordFileRequests,
  type FileRequestAttempt,
  type WhiteboardElement,
  type WhiteboardFile,
  type WhiteboardFiles,
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

/**
 * The bytes of one pasted image, on their own byte stream.
 *
 * Not the packet path the deltas use: a pasted screenshot is 200 KB–1 MB, and
 * as a base64 dataURL that is twenty to ninety times a reliable packet's
 * budget. `streamBytes` chunks at 15 KB and reassembles on the far side, which
 * is the same machinery the snapshot already trusts — one call instead of a
 * sequencing protocol the delta format deliberately does not have.
 *
 * The dataURL travels verbatim as UTF-8. Neither side re-encodes it: the host
 * has exactly what Excalidraw handed it and the guest hands exactly that back
 * to `addFiles`, so there is no image processing anywhere in this path and
 * nothing that can silently degrade a picture.
 */
const FILE_TOPIC = "unytea.whiteboard.file";

/**
 * How many files one request may ask for, or one answer may carry.
 *
 * A board with fifty images and a viewer that just reconnected would otherwise
 * ask the host to open fifty streams at once. The convergence pass runs again
 * on its own clock, so the rest arrive on the following sweeps.
 */
const MAX_FILES_PER_REQUEST = 8;

type WhiteboardMessage =
  | { kind: "whiteboard_mode"; open: boolean }
  | { kind: "whiteboard_delta"; elements: WhiteboardElement[] }
  /** A viewer asking for the current board. Answered only by the host. */
  | { kind: "whiteboard_request" }
  /**
   * A viewer asking for image bytes it can see referenced but does not hold.
   *
   * The counterpart of `whiteboard_request`, and necessary for the same reason
   * in a harder case: a lost delta is repaired by the next stroke, because the
   * host re-diffs its whole scene every tick. A lost file is never re-sent, so
   * without this one dropped stream leaves a grey placeholder that nothing will
   * ever fill.
   */
  | { kind: "whiteboard_file_request"; fileIds: string[] };

function isWhiteboardMessage(value: unknown): value is WhiteboardMessage {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "whiteboard_mode" ||
    kind === "whiteboard_delta" ||
    kind === "whiteboard_request" ||
    kind === "whiteboard_file_request"
  );
}

export interface WhiteboardChannel {
  /** True when the host has the board open. Drives the viewer's stage. */
  isOpen: boolean;
  /** The scene to render, ordered. Empty until the first delta or snapshot. */
  elements: WhiteboardElement[];
  /** Bumped on every applied update, so a consumer can react without diffing. */
  revision: number;
  /** Image bytes received so far, for the canvas to absorb. Viewer side. */
  files: WhiteboardFile[];
  /** Bumped on every file that lands, for the same reason `revision` exists. */
  fileRevision: number;
  /** Host only: announce the board opening or closing. */
  publishMode: (open: boolean) => void;
  /** Host only: send whatever changed since the last call. */
  publishElements: (elements: readonly WhiteboardElement[]) => void;
  /** Host only: broadcast any image the room has not been sent yet. */
  publishFiles: (files: WhiteboardFiles) => void;
  /** Host only: forget what has been sent, so the next publish resends all. */
  resetSentVersions: () => void;
}

export function useWhiteboardChannel(isHost: boolean): WhiteboardChannel {
  const room = useRoomContext();

  const [isOpen, setIsOpen] = useState(false);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [revision, setRevision] = useState(0);
  const [files, setFiles] = useState<WhiteboardFile[]>([]);
  const [fileRevision, setFileRevision] = useState(0);

  /** The viewer's accumulated scene, keyed by element id. */
  const sceneRef = useRef<Map<string, WhiteboardElement>>(new Map());
  /** The host's record of what each element looked like when last sent. */
  const sentVersionsRef = useRef<Map<string, number>>(new Map());
  /** The host's latest scene, for answering a late joiner at any moment. */
  const hostSceneRef = useRef<WhiteboardElement[]>([]);
  /** Every image the host has pasted, for the same reason. */
  const hostFilesRef = useRef<Map<string, WhiteboardFile>>(new Map());
  /** What the room has already been sent, so nothing is streamed twice. */
  const sentFileIdsRef = useRef<Set<string>>(new Set());
  /** The viewer's image bytes, keyed by file id. */
  const viewerFilesRef = useRef<Map<string, WhiteboardFile>>(new Map());
  /**
   * What this viewer has asked for and when.
   *
   * Two jobs. It stops the same file being requested again while a request is
   * still in flight — the host would stream the same megabyte twice — and it
   * caps the attempts, because a host who has closed the board or left the room
   * is never going to answer and a viewer asking forever is just noise.
   */
  const fileRequestsRef = useRef<Map<string, FileRequestAttempt>>(new Map());
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

  /**
   * Put one image on the wire.
   *
   * Broadcast when `destinationIdentities` is omitted, addressed when it is not
   * — the same distinction the snapshot makes, and for the same reason: a late
   * joiner's catch-up is nobody else's business and re-sending a megabyte to
   * everyone who already has it is pure waste.
   *
   * The id and mime type travel as stream attributes rather than inside the
   * payload, so the receiver knows what it is holding before it has finished
   * reading it, and the payload stays exactly the dataURL and nothing else.
   */
  const sendFile = useCallback(
    async (file: WhiteboardFile, destinationIdentities?: string[]) => {
      if (!isDataTransportReady(room)) return false;

      try {
        const bytes = encoder.current.encode(file.dataURL);
        const writer = await room.localParticipant.streamBytes({
          topic: FILE_TOPIC,
          attributes: { fileId: file.id, mimeType: file.mimeType },
          totalSize: bytes.byteLength,
          ...(destinationIdentities ? { destinationIdentities } : {}),
        });
        await writer.write(bytes);
        await writer.close();
        return true;
      } catch (error) {
        // Not fatal, and not silent: the viewer will notice the file it can see
        // referenced is missing and ask for it again.
        console.error("[whiteboard] file send failed", error);
        return false;
      }
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

          /**
           * The images follow the snapshot; they are not in it.
           *
           * Folding the files into that payload would turn a snapshot of a few
           * kilobytes into one of several megabytes, and the joiner would stare
           * at nothing until the whole thing arrived. Sent separately, the board
           * appears immediately and the pictures fill in behind — which is
           * exactly what happens in the live case, so a late joiner sees the
           * same behaviour everyone else did.
           */
          for (const file of filesForScene(hostSceneRef.current, hostFilesRef.current)) {
            void sendFile(file, [participant.identity]);
          }
          break;
        }

        case "whiteboard_file_request": {
          // Only the host can answer, and only to whoever asked. Addressed, not
          // broadcast: everyone else already has these.
          if (!isHostRef.current || !participant) return;

          for (const fileId of message.fileIds.slice(0, MAX_FILES_PER_REQUEST)) {
            const file = hostFilesRef.current.get(fileId);
            if (file) void sendFile(file, [participant.identity]);
          }
          break;
        }
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
    // `sendFile` is memoised on `room` alone, exactly like `publish`, so
    // listing it here does not make this listener rebind any more often.
  }, [room, ingest, publish, sendFile]);

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

  // ── viewer: receive image bytes ─────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    // Same idempotent registration as the snapshot handler above, for the same
    // reason: registering a topic twice throws, and it throws during the render
    // of the whole room.
    room.unregisterByteStreamHandler(FILE_TOPIC);
    room.registerByteStreamHandler(FILE_TOPIC, (reader) => {
      const fileId = reader.info.attributes?.fileId;
      const mimeType = reader.info.attributes?.mimeType ?? reader.info.mimeType;
      if (!fileId) return;

      reader
        .readAll()
        .then((chunks) => {
          const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
          const joined = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            joined.set(chunk, offset);
            offset += chunk.byteLength;
          }

          // Straight back out as the dataURL the host put in. No decode, no
          // re-encode, no canvas — whatever the host pasted is what the viewer
          // renders.
          const dataURL = decoder.current.decode(joined);
          viewerFilesRef.current.set(fileId, { id: fileId, mimeType, dataURL });
          setFiles([...viewerFilesRef.current.values()]);
          setFileRevision((previous) => previous + 1);
        })
        .catch((error) => {
          console.error("[whiteboard] file read failed", error);
        });
    });

    return () => {
      room.unregisterByteStreamHandler(FILE_TOPIC);
    };
  }, [room, isHost]);

  // ── viewer: ask for anything referenced but not held ────────────────────
  /**
   * The convergence pass.
   *
   * A missing stroke repairs itself: the host re-diffs its whole scene every
   * tick, so the next change re-sends it. A missing file does not — it is sent
   * once, on the tick it was pasted, and never again. Without this, one dropped
   * stream leaves a grey placeholder on that viewer's board for the rest of the
   * session.
   */
  const requestMissingFiles = useCallback(() => {
    if (isHostRef.current) return;

    const wanted = missingFileIds(
      orderedElements(sceneRef.current),
      new Set(viewerFilesRef.current.keys())
    );
    if (wanted.length === 0) return;

    const now = Date.now();
    const ask = pendingFileRequests(wanted, fileRequestsRef.current, now).slice(
      0,
      MAX_FILES_PER_REQUEST
    );
    if (ask.length === 0) return;

    // Recorded only once the request is actually on the wire, so a publish that
    // was refused is retried on the next pass instead of burning an attempt.
    if (publish({ kind: "whiteboard_file_request", fileIds: ask })) {
      recordFileRequests(fileRequestsRef.current, ask, now);
    }
  }, [publish]);

  useEffect(() => {
    if (isHost) return;
    requestMissingFiles();
  }, [isHost, revision, fileRevision, requestMissingFiles]);

  useEffect(() => {
    if (isHost) return;
    // The effect above fires when something changes. Nothing changing is
    // exactly the state a lost file leaves behind, so the retry needs its own
    // clock. `pendingFileRequests` caps the attempts, so this settles.
    const timer = setInterval(requestMissingFiles, FILE_REQUEST_RETRY_MS);
    return () => clearInterval(timer);
  }, [isHost, requestMissingFiles]);

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

  /**
   * Host only: broadcast any image the room has not been sent yet.
   *
   * Identity is the whole diff. An Excalidraw file id is derived from the
   * file's contents and the entry is immutable once added, so a file that has
   * been sent can never need sending again under the same id — unlike an
   * element, which needs a version because it moves.
   */
  const publishFiles = useCallback(
    (incoming: WhiteboardFiles) => {
      const fresh = diffFiles(sentFileIdsRef.current, incoming);

      // Held regardless of whether the send succeeds: a late joiner asking two
      // minutes from now must be answerable even for a file whose broadcast was
      // refused at the time.
      for (const file of fresh) hostFilesRef.current.set(file.id, file);

      for (const file of fresh) {
        void sendFile(file).then((sent) => {
          if (sent) sentFileIdsRef.current.add(file.id);
        });
      }
    },
    [sendFile]
  );

  const resetSentVersions = useCallback(() => {
    sentVersionsRef.current = new Map();
  }, []);

  return {
    isOpen,
    elements,
    revision,
    files,
    fileRevision,
    publishMode,
    publishElements,
    publishFiles,
    resetSentVersions,
  };
}
