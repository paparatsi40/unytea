"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { BROADCAST_INTERVAL_MS, type WhiteboardElement } from "@/lib/whiteboard/protocol";

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
  /** Host only: called with the whole scene, already coalesced. */
  onSceneChange?: (elements: readonly WhiteboardElement[]) => void;
}

export function SessionWhiteboard({
  onClose,
  sessionId,
  embedded = false,
  isHost = false,
  remoteElements,
  remoteRevision = 0,
  onSceneChange,
}: SessionWhiteboardProps) {
  const t = useTranslations("liveSession.whiteboard");
  const tControls = useTranslations("liveSession.room.controls");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

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

  const handleChange = useCallback(
    (elements: readonly unknown[]) => {
      if (!isHost || !onSceneChange) return;
      pendingRef.current = elements as readonly WhiteboardElement[];
      if (timerRef.current === null) {
        timerRef.current = setTimeout(flush, BROADCAST_INTERVAL_MS);
      }
    },
    [isHost, onSceneChange, flush]
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
