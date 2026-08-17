"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, Pencil, Send, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Review step between drafting a recap and publishing it.
 *
 * The recap used to reach the community feed on its own; the host's only view
 * of it was a card reading "Already shared". Here they read the draft, change
 * anything they want, and nothing is posted until they press share.
 *
 * The draft is loaded on open rather than passed in, because it is derived from
 * session notes that may have been edited since the session ended — the host
 * should review what would actually be posted now.
 */

export type RecapReviewState = "draft" | "edited" | "shared";

interface RecapReviewPanelProps {
  /** Fetches the suggested text. Must not publish anything. */
  onLoadDraft: () => Promise<string | null>;
  /** Publishes the given text. Called only from the share button. */
  onShare: (content: string) => Promise<boolean>;
  /** Closes the panel without publishing. */
  onDismiss: () => void;
  /** True when this session already has a recap on the feed. */
  alreadyShared: boolean;
}

export function RecapReviewPanel({
  onLoadDraft,
  onShare,
  onDismiss,
  alreadyShared,
}: RecapReviewPanelProps) {
  const t = useTranslations("liveSession.postSessionFlow.recap");
  const tCommon = useTranslations("common");

  const [draft, setDraft] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Deliberately not keyed on `onLoadDraft`: the parent re-creates that
    // callback on every render, and re-running this effect would reset the
    // host's edits underneath them. Loading once per mount is the whole
    // contract. (Same class of bug as the room reconnect loop.)
    void (async () => {
      // `.catch` rather than try/finally: the React compiler cannot lower a
      // `finally` clause and downgrades the whole component, which costs a lint
      // warning and the compiler's memoisation.
      const text = await onLoadDraft().catch(() => null);
      if (cancelled) return;

      if (text === null) {
        setLoadError(true);
      } else {
        setDraft(text);
        setContent(text);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEdited = draft !== null && content.trim() !== draft.trim();
  const canShare = content.trim().length > 0 && !isSharing && !shared && !alreadyShared;

  const state: RecapReviewState =
    shared || alreadyShared ? "shared" : isEdited ? "edited" : "draft";

  async function handleShare() {
    if (!canShare) return;
    setIsSharing(true);

    // Same reason as the loader above: no `finally`, so the React compiler can
    // lower this component. A rejected share resolves to false and the panel
    // stays open with the host's text intact.
    const ok = await onShare(content).catch(() => false);
    if (ok) setShared(true);
    setIsSharing(false);
  }

  return (
    <Card className="border-blue-500/40 bg-zinc-900/70" data-testid="recap-review-panel">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Share2 className="h-5 w-5 text-blue-400" />
              {t("title")}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
          </div>
          {/* Labelled "close", not "discard": two controls sharing one
              accessible name is indistinguishable to a screen reader, and this
              one is the same gesture as the Discard button below. */}
          <button
            onClick={onDismiss}
            aria-label={tCommon("close")}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* State badge — draft / edited / shared */}
        <div>
          {state === "shared" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300">
              <CheckCircle className="h-3 w-3" />
              {t("statusShared")}
            </span>
          ) : state === "edited" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
              <Pencil className="h-3 w-3" />
              {t("statusEdited")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/50 px-3 py-1 text-xs font-medium text-zinc-300">
              {t("statusDraft")}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : loadError ? (
          <p className="py-6 text-sm text-red-400">{t("loadError")}</p>
        ) : (
          <>
            <label htmlFor="recap-content" className="sr-only">
              {t("editorLabel")}
            </label>
            <textarea
              id="recap-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={shared || alreadyShared}
              rows={14}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 font-mono text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                onClick={onDismiss}
                variant="outline"
                disabled={isSharing}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                {t("dismiss")}
              </Button>
              <Button
                onClick={handleShare}
                disabled={!canShare}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSharing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {t("share")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
