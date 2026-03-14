"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Play,
  Share2,
  Twitter,
  Linkedin,
  Link,
  Check,
  Clock,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  detectSessionMoments,
  generateClipMetadata,
  trackClipShare,
} from "@/app/actions/public-content";

interface SessionMoment {
  startTime: number;
  endTime: number;
  type: "engagement" | "question" | "insight";
  score: number;
  label: string;
  context: string;
}

interface SessionInfo {
  id: string;
  title: string;
  description: string | null;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  host: { id: string; name: string | null; image: string | null } | null;
  community: { id: string; name: string; slug: string } | null;
}

interface ClipData {
  id: string;
  sessionId: string;
  sessionTitle: string;
  hostName: string | null;
  communityName: string;
  startTime: number;
  endTime: number;
  duration: number;
  clipUrl: string;
  sessionUrl: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  previewText: string;
  shareText: string;
}

interface CreateSocialClipDialogProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSocialClipDialog({
  sessionId,
  open,
  onOpenChange,
}: CreateSocialClipDialogProps) {
  const [loading, setLoading] = useState(true);
  const [moments, setMoments] = useState<SessionMoment[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<SessionMoment | null>(null);
  const [clip, setClip] = useState<ClipData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && sessionId) {
      loadMoments();
    }
  }, [open, sessionId]);

  async function loadMoments() {
    setLoading(true);
    try {
      const result = await detectSessionMoments(sessionId);
      if (result.success) {
        setMoments(result.moments || []);
        setSession(result.session || null);
        // Auto-select first moment
        if (result.moments && result.moments.length > 0) {
          setSelectedMoment(result.moments[0]);
        }
      } else {
        toast.error(result.error || "Failed to analyze session");
      }
    } catch (error) {
      toast.error("Error loading moments");
    } finally {
      setLoading(false);
    }
  }

  async function generateClip() {
    if (!selectedMoment) return;

    setGenerating(true);
    try {
      const result = await generateClipMetadata(
        sessionId,
        selectedMoment.startTime,
        selectedMoment.endTime
      );

      if (result.success && result.clip) {
        setClip(result.clip);
        toast.success("Clip generated! Ready to share");
      } else {
        toast.error(result.error || "Failed to generate clip");
      }
    } catch (error) {
      toast.error("Error generating clip");
    } finally {
      setGenerating(false);
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  async function shareToTwitter() {
    if (!clip) return;
    
    await trackClipShare(clip.id, "twitter");
    
    const text = encodeURIComponent(clip.shareText);
    const url = encodeURIComponent(clip.clipUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank"
    );
  }

  async function shareToLinkedIn() {
    if (!clip) return;
    
    await trackClipShare(clip.id, "linkedin");
    
    const url = encodeURIComponent(clip.clipUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank"
    );
  }

  async function copyLink() {
    if (!clip) return;
    
    await trackClipShare(clip.id, "copy");
    await navigator.clipboard.writeText(clip.clipUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
            <p className="text-zinc-400">Analyzing session for viral moments...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Create Social Clip
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Turn your best moments into shareable content
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 py-4">
            {/* Session Info */}
            {session && (
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="font-semibold text-white">{session.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {session.host?.name} • {session.community?.name}
                </p>
              </div>
            )}

            {/* Selected Moment Preview */}
            {selectedMoment && !clip && (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                      <Play className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-400">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {selectedMoment.score}/100
                        </Badge>
                        <span className="text-sm text-zinc-400">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTime(selectedMoment.startTime)} - {formatTime(selectedMoment.endTime)}
                        </span>
                      </div>
                      <h4 className="font-medium text-white mt-2">{selectedMoment.label}</h4>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {selectedMoment.context}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        Duration: {formatTime(selectedMoment.endTime - selectedMoment.startTime)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Clip */}
            {clip && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-amber-500 mb-4">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-semibold">Your Clip is Ready!</span>
                    </div>
                    
                    {/* Video Preview Placeholder */}
                    <div className="aspect-video bg-zinc-950 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                      {clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt="Clip thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-zinc-500">
                          <Play className="h-12 w-12 mb-2" />
                          <span className="text-sm">Video Preview</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-medium line-clamp-2">{clip.previewText}</p>
                        <p className="text-zinc-300 text-sm mt-1">
                          {formatTime(clip.duration)} • Watch full session on Unytea
                        </p>
                      </div>
                    </div>

                    {/* Share Text Preview */}
                    <div className="bg-zinc-950 rounded-lg p-4">
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{clip.shareText}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Share Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={shareToTwitter}
                    className="bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                  <Button
                    onClick={shareToLinkedIn}
                    className="bg-[#0A66C2] hover:bg-[#0958a8] text-white"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="border-zinc-700"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Moment Selection */}
            {!clip && moments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  AI-Detected Viral Moments ({moments.length})
                </h3>
                
                {moments.map((moment, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedMoment?.startTime === moment.startTime
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                    }`}
                    onClick={() => setSelectedMoment(moment)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {moment.type === "engagement" && "🔥"}
                          {moment.type === "question" && "❓"}
                          {moment.type === "insight" && "💡"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">
                            {moment.label}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {formatTime(moment.startTime)} - {formatTime(moment.endTime)} • {moment.context.substring(0, 50)}...
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${
                            moment.score >= 80
                              ? "bg-green-500/10 text-green-400"
                              : moment.score >= 60
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          {moment.score}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Generate Button */}
            {!clip && selectedMoment && (
              <Button
                onClick={generateClip}
                disabled={generating}
                className="w-full bg-purple-600 hover:bg-purple-700 h-12"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Clip...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Clip from This Moment
                  </>
                )}
              </Button>
            )}

            {/* No Moments */}
            {!loading && moments.length === 0 && (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">No viral moments detected</h3>
                <p className="text-zinc-400 mt-2">
                  This session needs more engagement data. Share it with your community first!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}