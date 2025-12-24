"use client";

import { useMemo, useState } from "react";
import { Play, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isModerator: boolean;
};

type Platform = "youtube" | "vimeo" | null;

function extractVideo(url: string): { platform: Platform; id: string | null } {
  const u = url.trim();

  // YouTube patterns: watch?v=, youtu.be/, embed/, shorts/
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/i,
    /(?:youtu\.be\/)([^&\n?#]+)/i,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/i,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/i,
  ];

  for (const p of ytPatterns) {
    const m = u.match(p);
    if (m?.[1]) return { platform: "youtube", id: m[1] };
  }

  // Vimeo patterns: vimeo.com/123, player.vimeo.com/video/123
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/i,
    /player\.vimeo\.com\/video\/(\d+)/i,
  ];

  for (const p of vimeoPatterns) {
    const m = u.match(p);
    if (m?.[1]) return { platform: "vimeo", id: m[1] };
  }

  return { platform: null, id: null };
}

export function VideoEmbed({ isModerator }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const parsed = useMemo(() => extractVideo(videoUrl), [videoUrl]);

  const handleAddVideo = () => {
    setError("");

    const raw = videoUrl.trim();
    if (!raw) {
      setError("Please enter a video URL");
      return;
    }

    const { platform, id } = extractVideo(raw);
    if (!platform || !id) {
      setError("Invalid video URL. Please use YouTube or Vimeo links.");
      return;
    }

    const embedUrl =
      platform === "youtube"
        ? `https://www.youtube.com/embed/${id}?autoplay=0`
        : `https://player.vimeo.com/video/${id}`;

    setCurrentVideo(embedUrl);
    setVideoUrl("");
  };

  const handleRemoveVideo = () => {
    setCurrentVideo(null);
    setVideoUrl("");
    setError("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Video input (moderator only) */}
      {isModerator && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start space-x-2">
            <div className="flex-1">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddVideo()}
                placeholder="Paste YouTube or Vimeo URL..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />

              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

              <p className="mt-1 text-xs text-gray-500">
                Supported: YouTube (youtube.com, youtu.be, shorts) and Vimeo (vimeo.com)
              </p>

              {/* Hint opcional: muestra si reconoce la URL */}
              {videoUrl.trim() && !error && (
                <p className="mt-1 text-xs text-gray-400">
                  {parsed.platform ? `Detected: ${parsed.platform}` : "Not recognized yet"}
                </p>
              )}
            </div>

            <Button onClick={handleAddVideo} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>
        </div>
      )}

      {/* Video player */}
      <div className="flex-1 overflow-auto bg-gray-900">
        {currentVideo ? (
          <div className="relative h-full flex flex-col items-center justify-center p-8">
            <div className="relative w-full max-w-4xl aspect-video">
              <iframe
                src={currentVideo}
                className="absolute inset-0 h-full w-full rounded-lg"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                title="Embedded video"
              />
            </div>

            {isModerator && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveVideo}
                className="mt-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Video
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-gray-800 p-6">
              <Play className="h-12 w-12 text-gray-400" />
            </div>
            <p className="mt-4 text-lg font-medium text-gray-200">No video loaded</p>
            {isModerator ? (
              <p className="mt-2 text-sm text-gray-400">
                Add a YouTube or Vimeo video to share with participants
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                Waiting for moderator to share a video
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
