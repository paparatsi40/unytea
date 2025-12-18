"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface WelcomeMessageEditorProps {
  communitySlug: string;
  initialMessage: string;
  initialEnabled: boolean;
}

export function WelcomeMessageEditor({
  communitySlug,
  initialMessage,
  initialEnabled,
}: WelcomeMessageEditorProps) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/communities/${communitySlug}/welcome`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcomeMessage: message,
          showWelcomeMessage: enabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save welcome message");
      }

      toast.success("Welcome message saved!", {
        description: enabled
          ? "New members will see this message when they join"
          : "Welcome message is disabled",
      });

      router.refresh();
    } catch (error) {
      console.error("Error saving welcome message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save welcome message"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>') // Links
      .replace(/\n/g, '<br />'); // Line breaks
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Enable Welcome Message
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Show a welcome banner to new members when they first join your community
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="ml-4"
          />
        </div>
      </div>

      {/* Markdown Guide */}
      <div className="rounded-2xl border border-border/50 bg-accent/30 p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-2">Formatting Tips</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• <code className="px-1.5 py-0.5 bg-background rounded">**text**</code> for <strong>bold</strong></p>
              <p>• <code className="px-1.5 py-0.5 bg-background rounded">*text*</code> for <em>italic</em></p>
              <p>• <code className="px-1.5 py-0.5 bg-background rounded">[text](url)</code> for links</p>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setShowPreview(false)}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
              !showPreview
                ? "bg-accent text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              showPreview
                ? "bg-accent text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showPreview ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome to our community! 🎉

Here's what you should know:

**Getting Started:**
• Introduce yourself in the feed
• Check out our courses
• Join our live sessions

**Community Rules:**
1. Be respectful
2. No spam
3. Help each other grow

Questions? Feel free to reach out!

[Join our Discord](https://discord.gg/example)"
              className="w-full min-h-[400px] resize-none rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <div className="min-h-[400px] rounded-xl border border-border bg-background/50 p-6">
              {/* Preview Banner */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 p-8 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-3 shadow-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Welcome to Community! 🎉
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      We're excited to have you here
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div className="rounded-2xl border border-border/50 bg-background/50 p-6">
                  {message ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: formatPreview(message) }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic">
                      Your welcome message will appear here...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="text-sm text-muted-foreground">
          {message.length} characters
          {message.length > 1000 && (
            <span className="ml-2 text-amber-500">
              • Consider keeping it shorter for better readability
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading}
          size="lg"
          className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Welcome Message
            </>
          )}
        </Button>
      </div>
    </div>
  );
}