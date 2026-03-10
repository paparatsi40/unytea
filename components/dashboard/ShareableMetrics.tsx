"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Share2, Download, X, Sparkles } from "lucide-react";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";

interface ShareableMetricsProps {
  communities: number;
  members: number;
  revenue: number;
  engagement: number;
  communityName?: string;
}

export function ShareableMetrics({
  communities,
  members,
  revenue,
  engagement,
  communityName = "My Community",
}: ShareableMetricsProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    
    try {
      // Use html-to-image library
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });
      
      // Download the image
      const link = document.createElement("a");
      link.download = `unytea-community-stats-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    const text = `🚀 My Community Growth\n\n📊 Stats:\n• ${members} members\n• $${revenue.toLocaleString()} revenue\n• ${engagement}% engagement\n\nBuilt with @unytea 🚀`;
    
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard! Share on X, LinkedIn, or Discord.");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPreview(!showPreview)}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share Your Success
        </Button>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white"
              onClick={() => setShowPreview(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Shareable Card */}
            <div
              ref={cardRef}
              className="w-[400px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{communityName}</h3>
                  <p className="text-slate-400 text-sm">Community Growth</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Members</span>
                  </div>
                  <p className="text-2xl font-bold">{members.toLocaleString()}</p>
                </div>

                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">${revenue.toLocaleString()}</p>
                </div>

                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs">Communities</span>
                  </div>
                  <p className="text-2xl font-bold">{communities}</p>
                </div>

                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Engagement</span>
                  </div>
                  <p className="text-2xl font-bold">{engagement}%</p>
                </div>
              </div>

              {/* Footer with branding */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <p className="text-slate-500 text-sm">Built with</p>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-bold">Unytea</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4 justify-center">
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Copy Text
              </Button>
              <Button
                onClick={generateImage}
                disabled={isGenerating}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Download Image"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}