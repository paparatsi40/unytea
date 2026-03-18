"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Smile, Loader2, X } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";
import { useToast } from "@/hooks/use-toast";
import { useUploadThing } from "@/lib/uploadthing";

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
}

const MAX_MESSAGE_LENGTH = 2000;

export function MessageInput({ conversationId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [errorText, setErrorText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { startUpload: startImageUpload } = useUploadThing("imageUploader");
  const { startUpload: startDocumentUpload } = useUploadThing("documentUploader");
  const { startUpload: startMediaUpload } = useUploadThing("mediaUploader");

  const handleSend = async () => {
    if (isSending || isUploadingAttachment) return;

    const trimmed = message.trim();

    if (!trimmed && attachments.length === 0) {
      setErrorText("Write a message or add an attachment.");
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setErrorText(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`);
      return;
    }

    setErrorText("");
    setIsSending(true);
    const result = await sendMessage(
      conversationId,
      trimmed,
      attachments.map((attachment) => attachment.url)
    );

    if (result.success) {
      setMessage("");
      setAttachments([]);
      onMessageSent?.();

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } else {
      const errorMessage = result.error || "Failed to send message";
      setErrorText(errorMessage);
      toast({
        title: "Message not sent",
        description: errorMessage,
        variant: "destructive",
      });
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
    const nextValue = e.target.value;
    setMessage(nextValue);

    if (errorText) {
      setErrorText("");
    }

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingAttachment(true);
      setErrorText("");

      const uploadedAttachments: { url: string; name: string }[] = [];

      for (const file of files) {
        const isImage = file.type.startsWith("image/");
        const isMedia = file.type.startsWith("video/") || file.type.startsWith("audio/");

        const uploadedFiles = isImage
          ? await startImageUpload([file])
          : isMedia
          ? await startMediaUpload([file])
          : await startDocumentUpload([file]);

        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedAttachments.push({
            url: uploadedFiles[0].url,
            name: uploadedFiles[0].name || file.name,
          });
        }
      }

      if (uploadedAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...uploadedAttachments]);
      }
    } catch (error) {
      const errorMessage = (error as Error)?.message || "Failed to upload attachment";
      setErrorText(errorMessage);
      toast({
        title: "Attachment upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (urlToRemove: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.url !== urlToRemove));
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.url}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700"
            >
              <span className="max-w-[180px] truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.url)}
                className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

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
            className={`w-full resize-none bg-white border rounded-xl px-4 py-3 pr-24 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-50 transition-all ${
              errorText ? "border-red-400" : "border-gray-300"
            }`}
            rows={1}
            style={{ minHeight: "48px", maxHeight: "150px" }}
          />

          {/* Toolbar */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Emoji picker (placeholder) */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* File upload */}
            <button
              type="button"
              onClick={handleAttachmentClick}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
              title="Attach file"
            >
              {isUploadingAttachment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain,video/*,audio/*"
              className="hidden"
              onChange={handleAttachmentSelected}
              disabled={isUploadingAttachment}
            />

            {/* Character count */}
            {message.length > 0 && (
              <span className={`text-xs px-2 ${message.length > MAX_MESSAGE_LENGTH ? "text-red-500" : "text-gray-500"}`}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || isSending || isUploadingAttachment}
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
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line{isUploadingAttachment ? " · Uploading attachment..." : ""}
        </p>
        {errorText ? <p className="text-xs text-red-500">{errorText}</p> : null}
      </div>
    </div>
  );
}
