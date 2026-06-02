"use client";

import { useMemo } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface RecordingDistributionActionsProps {
  recordingUrl: string | null;
  publicUrl: string | null;
  title: string;
}

export function RecordingDistributionActions({
  recordingUrl,
  publicUrl,
  title,
}: RecordingDistributionActionsProps) {
  const t = useTranslations("liveSession.recordingDistribution");
  const tNav = useTranslations("liveSession.publicPage.nav");
  const shareUrl = useMemo(() => publicUrl || recordingUrl || "", [publicUrl, recordingUrl]);

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error(t("noLink"));
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const handleShare = async () => {
    if (!shareUrl) {
      toast.error(t("noLink"));
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: t("shareText", { title }),
          url: shareUrl,
        });
        return;
      } catch {
        // fallback below
      }
    }

    const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      t("socialText", { title })
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitter, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        type="button"
        variant="outline"
        className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
        {t("copyLink")}
      </Button>

      <a
        href={recordingUrl || "#"}
        download
        className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
      >
        <Download className="h-4 w-4" />
        {t("download")}
      </a>

      <Button
        type="button"
        variant="outline"
        className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
        {tNav("share")}
      </Button>
    </div>
  );
}
