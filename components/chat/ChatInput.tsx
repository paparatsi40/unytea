"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { sendChannelMessage } from "@/app/actions/channels";
import { Send, Smile, Paperclip } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { useCurrentUser } from "@/hooks/use-current-user";

type Props = {
  channelId: string;
  channelName: string;
};

export function ChatInput({ channelId, channelName }: Props) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { socket, isConnected } = useSocket();
  const { user } = useCurrentUser();

  const handleTyping = () => {
    if (!socket || !isConnected || !user) return;

    // Emit typing event via WebSocket
    socket.emit("typing:start", {
      channelId,
      userId: user.id,
      userName: user.name || "Anonymous",
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isConnected && user) {
        socket.emit("typing:stop", {
          channelId,
          userId: user.id,
        });
      }
    }, 3000);
  };

  const stopTyping = () => {
    if (socket && isConnected && user) {
      socket.emit("typing:stop", {
        channelId,
        userId: user.id,
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    stopTyping();

    const result = await sendChannelMessage(channelId, message);

    if (result.success) {
      setMessage("");
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="flex items-end space-x-3">
      {/* Connection Status Indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="hidden sm:inline">Connected</span>
        </div>
      )}

      {/* Textarea */}
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder={`Message #${channelName}`}
          rows={1}
          disabled={isSending}
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
          style={{ maxHeight: "200px" }}
        />
        <p className="mt-1 text-xs text-gray-400">
          Press <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono">Enter</kbd> to send, <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {/* Emoji Button (future) */}
        <button
          type="button"
          disabled
          className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Attachment Button (future) */}
        <button
          type="button"
          disabled
          className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 p-2.5 text-white transition-all hover:from-purple-700 hover:to-pink-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
