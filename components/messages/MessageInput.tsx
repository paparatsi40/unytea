"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Smile, Loader2 } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export function MessageInput({ conversationId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    const result = await sendMessage(conversationId, message.trim());

    if (result.success) {
      setMessage("");
      onMessageSent?.();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } else {
      alert(result.error || "Failed to send message");
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  };

  return (
    <div className="border-t border-white/10 bg-zinc-900/50 backdrop-blur-sm p-4">
      <div className="flex items-end gap-3">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            disabled={isSending}
            className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-24 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
            rows={1}
            style={{ minHeight: "48px", maxHeight: "150px" }}
          />

          {/* Toolbar */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Emoji picker (placeholder) */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* File upload (placeholder) */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Character count */}
            {message.length > 0 && (
              <span className="text-xs text-white/40 px-2">
                {message.length}/2000
              </span>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-white/30 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
