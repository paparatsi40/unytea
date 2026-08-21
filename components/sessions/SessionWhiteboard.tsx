"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  BROADCAST_INTERVAL_MS,
  type WhiteboardElement,
  type WhiteboardFile,
  type WhiteboardFiles,
} from "@/lib/whiteboard/protocol";

// Excalidraw 0.18+ ships CSS as a separate export (breaking change vs 0.17 which
// auto-injected styles). Without this import the component mounts but the toolbar,
// color panel, and library button render unstyled (effectively invisible).
import "@excalidraw/excalidraw/index.css";

function WhiteboardLoading() {
  const t = useTranslations("liveSession.whiteboard");
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
        <p className="text-sm text-gray-600">{t("loading")}</p>
      </div>
    </div>
  );
}

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <WhiteboardLoading />,
});

interface SessionWhiteboardProps {
  onClose: () => void;
  sessionId: string;
  embedded?: boolean;
  /**
   * The host draws; everyone else watches. A viewer gets `viewModeEnabled`, no
   * change listener and no toolbar — read-only is enforced by not wiring the
   * writer, not by asking the component nicely.
   */
  isHost?: boolean;
  /** Live scene from the channel. Ignored for the host, who owns the scene. */
  remoteElements?: readonly WhiteboardElement[];
  /** Bumps on every applied update, so the viewer knows to re-render. */
  remoteRevision?: number;
  /** Image bytes from the channel, to hand to Excalidraw's own file store. */
  remoteFiles?: readonly WhiteboardFile[];
  /** Bumps on every file that lands, for the same reason `remoteRevision` does. */
  remoteFileRevision?: number;
  /** Host only: called with the whole scene, already coalesced. */
  onSceneChange?: (elements: readonly WhiteboardElement[]) => void;
  /**
   * Host only: called with Excalidraw's `files` map on every change.
   *
   * Separate from `onSceneChange` because the two have nothing in common on the
   * wire. Elements are small, versioned and diffed every tick; a file is
   * hundreds of kilobytes, immutable, and sent once. Coalescing them on the
   * same timer would delay an image behind a stroke for no reason.
   */
  onFilesChange?: (files: WhiteboardFiles) => void;
}

export function SessionWhiteboard({
  onClose,
  sessionId,
  embedded = false,
  isHost = false,
  remoteElements,
  remoteRevision = 0,
  remoteFiles,
  remoteFileRevision = 0,
  onSceneChange,
  onFilesChange,
}: SessionWhiteboardProps) {
  const t = useTranslations("liveSession.whiteboard");
  const tControls = useTranslations("liveSession.room.controls");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  /**
   * The scene the canvas is born with.
   *
   * A viewer's board used to be constructed empty and filled entirely by the
   * `updateScene` effect below — which is right for everything that arrives
   * while the board is open, and wrong for the one case where the scene is
   * already known before the canvas exists.
   *
   * That case is late join, and it is the common one. The host answers a
   * `whiteboard_request` with two things at once: the mode, which is what makes
   * the guest's stage switch to the whiteboard and mount this component, and the
   * snapshot. So by the time Excalidraw is asked for, the scene is already in
   * hand — and Excalidraw is a dynamic import that initialises itself over
   * several ticks after that, with an empty scene of its own. Pushing into it
   * while it is doing that is a race, and the guest lost it: a blank board until
   * the host's next stroke pushed everything again.
   *
   * Captured once, in a ref, because `initialData` is read at mount and a value
   * that changed afterwards would be misleading to any future reader.
   */
  const initialSceneRef = useRef({
    // Excalidraw's own element type is far wider than the handful of fields the
    // protocol reads; the objects here came from Excalidraw in the first place.
    elements: (remoteElements ? [...remoteElements] : []) as never[],
    // Same widening as the elements above, and for the same reason: the mime
    // type is a string on the wire and a narrow union in Excalidraw's types.
    //
    // `created` is Excalidraw's own bookkeeping for deciding when to evict an
    // unused file from storage, and nothing in this product reads it. A fixed
    // value rather than `Date.now()` because this runs during render, where an
    // impure call gives a different answer every time React happens to re-run
    // it — and a ref initialiser that changes is a ref nobody can reason about.
    files: Object.fromEntries(
      (remoteFiles ?? []).map((file) => [
        file.id,
        { id: file.id, mimeType: file.mimeType, dataURL: file.dataURL, created: 0 },
      ])
    ) as never,
  });

  /**
   * The host's outgoing changes, coalesced.
   *
   * Excalidraw fires `onChange` on every pointer move, so a single dragged
   * stroke is tens of calls. Publishing each one would flood the data channel
   * to no visible benefit — a viewer cannot perceive more than a few updates a
   * second. The latest scene is parked in a ref and a trailing timer sends it,
   * so the window costs one message carrying each element's final state rather
   * than one message per intermediate state.
   */
  const pendingRef = useRef<readonly WhiteboardElement[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timerRef.current = null;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending && onSceneChange) onSceneChange(pending);
  }, [onSceneChange]);

  /**
   * Excalidraw's `onChange` is `(elements, appState, files)`.
   *
   * The third argument used to be dropped on the floor — the parameter list
   * stopped at the first one — and with it went every pasted image. The element
   * carries only a `fileId`; the bytes live in that map and nowhere else, so a
   * guest received a reference to something it had never been sent and
   * Excalidraw drew its pending placeholder in place of the picture.
   *
   * The files are handed on unbatched. The stroke timer exists because
   * `onChange` fires on every pointer move; a `files` map changes only when
   * somebody pastes, and `publishFiles` diffs by id anyway, so there is nothing
   * for a timer to coalesce.
   */
  const handleChange = useCallback(
    (elements: readonly unknown[], _appState: unknown, files?: WhiteboardFiles) => {
      if (!isHost || !onSceneChange) return;
      if (files && onFilesChange) onFilesChange(files);
      pendingRef.current = elements as readonly WhiteboardElement[];
      if (timerRef.current === null) {
        timerRef.current = setTimeout(flush, BROADCAST_INTERVAL_MS);
      }
    },
    [isHost, onSceneChange, onFilesChange, flush]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  /**
   * The viewer's scene, pushed in from the channel.
   *
   * Keyed on `remoteRevision` rather than on the array: the accumulator mutates
   * in place for cost reasons, so identity is not a reliable signal that
   * something changed.
   */
  useEffect(() => {
    if (isHost || !excalidrawAPI || !remoteElements) return;
    excalidrawAPI.updateScene({ elements: remoteElements });
  }, [isHost, excalidrawAPI, remoteElements, remoteRevision]);

  /**
   * The image bytes, into Excalidraw's own file store.
   *
   * `addFiles` is idempotent by file id, so re-adding one the canvas already
   * holds costs a map write. That matters here: elements and files arrive as
   * independent messages with no ordering between them, and this effect runs
   * whenever either side moves. Whichever lands second completes the picture,
   * and neither has to know about the other.
   */
  useEffect(() => {
    if (isHost || !excalidrawAPI || !remoteFiles?.length) return;
    excalidrawAPI.addFiles(
      remoteFiles.map((file) => ({
        id: file.id,
        mimeType: file.mimeType,
        dataURL: file.dataURL,
        created: Date.now(),
      }))
    );
  }, [isHost, excalidrawAPI, remoteFiles, remoteFileRevision]);

  const handleExportPNG = async () => {
    if (!excalidrawAPI) return;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${sessionId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const handleClear = () => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements: [] });
    }
  };

  // Embedded mode - integrated into the layout
  if (embedded) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              title={t("exportPngTooltip")}
            >
              <ImageIcon className="h-4 w-4" />
              {t("exportPng")}
            </button>
            {/* Clearing the board is a write. A viewer clearing their own copy
                would only desynchronise them from the host until the next
                stroke, so it is the host's control alone. Export is a read and
                stays available to everyone. */}
            {isHost && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                title={t("clearTooltip")}
              >
                <Trash2 className="h-4 w-4" />
                {t("clear")}
              </button>
            )}
          </div>
          {!isHost && <span className="text-xs text-zinc-500">{t("viewOnly")}</span>}
        </div>
        <div className="flex-1 overflow-hidden">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            // Born with the scene when there already is one. See the ref above:
            // for a late joiner the snapshot lands before this component does.
            initialData={isHost ? undefined : initialSceneRef.current}
            theme="light"
            // The read-only half of the contract. `viewModeEnabled` removes the
            // toolbar and every editing gesture, and no change listener is
            // attached for a viewer either — nothing they could do would leave
            // their machine, but the surface should not invite the attempt.
            viewModeEnabled={!isHost}
            onChange={isHost ? handleChange : undefined}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: isHost,
                clearCanvas: false,
                export: false,
                saveToActiveFile: false,
                saveAsImage: false,
                toggleTheme: false,
              },
            }}
          />
        </div>
      </div>
    );
  }

  // Fullscreen modal mode
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{tControls("whiteboard")}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
            {t("sessionLabel", { id: sessionId.slice(-6) })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            title={t("exportPngTooltip")}
          >
            <ImageIcon className="h-4 w-4" />
            {t("exportPng")}
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            title={t("clearTooltip")}
          >
            <Trash2 className="h-4 w-4" />
            {t("clear")}
          </button>

          <button
            onClick={onClose}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title={t("closeTooltip")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="light"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </motion.div>
  );
}
