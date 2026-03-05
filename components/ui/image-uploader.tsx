import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2, X } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "./button";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

export function ImageUploader({ value, onChange, onRemove }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  
  const { startUpload } = useUploadThing("imageUploader");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ No file selected");
      return;
    }

    console.log("📤 Starting upload:", file.name, file.size, "bytes");

    try {
      setUploading(true);
      const res = await startUpload([file]);
      
      console.log("📥 Upload response:", res);
      
      if (res && res[0]) {
        console.log("✅ Upload successful! URL:", res[0].url);
        onChange(res[0].url);
      } else {
        console.error("❌ No URL in response:", res);
        alert("Upload completed but no URL returned");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert("Failed to upload image: " + (error as Error).message);
    } finally {
      setUploading(false);
      console.log("🏁 Upload finished, uploading state:", false);
    }
  }

  function handleUrlSubmit() {
    if (urlInput.trim()) {
      console.log("🔗 Using URL:", urlInput.trim());
      onChange(urlInput.trim());
      setUrlInput("");
      setShowUrlInput(false);
    }
  }

  console.log("🖼️ ImageUploader render - value:", value, "uploading:", uploading);

  if (value) {
    return (
      <div className="relative group">
        <img
          src={value}
          alt="Upload preview"
          className="h-32 w-full rounded-lg object-cover"
        />
        {onRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!showUrlInput ? (
        <div className="flex gap-2">
          {/* Upload from PC */}
          <label className="flex-1">
            <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 px-4 py-8 transition-colors hover:bg-muted">
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Upload from PC
                  </span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          {/* Or use URL */}
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 px-4 py-8 transition-colors hover:bg-muted"
          >
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Use URL
            </span>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <Button type="button" onClick={handleUrlSubmit} size="sm">
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
