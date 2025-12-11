"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUploadThing } from "@/lib/uploadthing";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type AvatarUploadProps = {
  currentImage?: string | null;
  userName?: string | null;
  userEmail?: string;
};

export function AvatarUpload({ currentImage, userName, userEmail }: AvatarUploadProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("avatarUploader", {
    onClientUploadComplete: async (res) => {
      if (res?.[0]?.url) {
        await handleUploadComplete(res[0].url);
      }
    },
    onUploadError: (error: Error) => {
      setUploadError(error.message);
      setIsUploading(false);
    },
  });

  const handleUploadComplete = async (url: string) => {
    try {
      // Update user's avatar in database
      const res = await fetch("/api/user/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!res.ok) {
        throw new Error("Failed to update avatar");
      }

      setPreviewUrl(url);
      router.refresh(); // Refresh to show new avatar everywhere
    } catch (error) {
      console.error("Failed to update avatar:", error);
      setUploadError("Failed to update avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      await startUpload([file]);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Failed to upload file");
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Remove your profile picture?")) return;

    setIsUploading(true);
    try {
      const res = await fetch("/api/user/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: null }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove avatar");
      }

      setPreviewUrl(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to remove avatar:", error);
      setUploadError("Failed to remove avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar Display */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="w-24 h-24 border-4 border-white/10">
            <AvatarImage src={previewUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          {/* Upload overlay */}
          <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>

          {/* Remove button */}
          {previewUrl && !isUploading && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
              title="Remove avatar"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 mt-2">
            JPG, PNG or GIF. Max 2MB.
          </p>

          {uploadError && (
            <p className="text-xs text-red-500 mt-2">
              {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
