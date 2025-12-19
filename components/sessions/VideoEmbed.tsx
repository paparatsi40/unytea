"use client";

import { useState } from "react";
import { Play, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isModerator: boolean;
};

export function VideoEmbed({ isModerator }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const extractVideoId = (url: string): { platform: "youtube" | "vimeo" | null; id: string | null } => {
    // YouTube patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) return { platform: "youtube", id: match[1] };
    }

    // Vimeo patterns
    const vimeoPattern = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoPattern);
    if (vimeoMatch) return { platform: "vimeo", id: vimeoMatch[1] };

    return { platform: null, id: null };
  };

  const handleAddVideo = () => {
    setError("");
    
    if (!videoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }

    const { platform, id } = extractVideoId(videoUrl);

    if (!platform || !id) {
      setError("Invalid video URL. Please use YouTube or Vimeo links.");
      return;
    }

    let embedUrl = "";
    if (platform === "youtube") {
      embedUrl = `https://www.youtube.com/embed/${id}?autoplay=0`;
    } else if (platform === "vimeo") {
      embedUrl = `https://player.vimeo.com/video/${id}`;
    }

    setCurrentVideo(embedUrl);
    setVideoUrl("");
  };

  const handleRemoveVideo = () => {
    setCurrentVideo(null);
    setVideoUrl("");
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
              {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Supported: YouTube (youtube.com, youtu.be) and Vimeo (vimeo.com)
              </p>
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
