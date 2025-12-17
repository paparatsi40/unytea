"use client";

import { useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WelcomeBannerProps {
  communitySlug: string;
  communityName: string;
  welcomeMessage: string;
  onDismiss?: () => void;
}

export function WelcomeBanner({
  communitySlug,
  communityName,
  welcomeMessage,
  onDismiss,
}: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/communities/${communitySlug}/welcome/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss welcome message");
      }

      setIsVisible(false);
      toast.success("Welcome message dismissed");
      onDismiss?.();
    } catch (error) {
      console.error("Error dismissing welcome message:", error);
      toast.error("Failed to dismiss message");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        disabled={isLoading}
        className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-all hover:bg-background/50 hover:text-foreground disabled:opacity-50"
        aria-label="Dismiss welcome message"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-3 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome to {communityName}! 🎉
            </h2>
            <p className="text-sm text-muted-foreground">
              We're excited to have you here
            </p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-sm">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {/* Support for markdown-style formatting */}
            <div 
              className="text-foreground/90 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: welcomeMessage
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                  .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
                  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>') // Links
                  .replace(/\n/g, '<br />') // Line breaks
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleDismiss}
            disabled={isLoading}
            size="lg"
            className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Dismissing...
              </>
            ) : (
              <>
                Got it!
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            This message will only be shown once
          </p>
        </div>
      </div>
    </div>
  );
}