"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { 
  PenTool, 
  FileText, 
  Video, 
  Upload,
  Maximize2,
  Minimize2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileViewer } from "./FileViewer";
import { VideoEmbed } from "./VideoEmbed";

// Load WhiteboardCanvas only on client to avoid hydration issues
const WhiteboardCanvas = dynamic(
  () => import("./WhiteboardCanvas").then(mod => ({ default: mod.WhiteboardCanvas })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading whiteboard...</p>
        </div>
      </div>
    )
  }
);

type ContentType = "whiteboard" | "files" | "video" | "none";

type Props = {
  sessionId: string;
  isModerator: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export function ContentPanel({ 
  sessionId, 
  isModerator,
  isFullscreen = false,
  onToggleFullscreen 
}: Props) {
  const [activeTab, setActiveTab] = useState<ContentType>("whiteboard");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create temporary URL for preview
    const url = URL.createObjectURL(file);
    
    setUploadedFiles(prev => [...prev, {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      url
    }]);

    setActiveTab("files");
  };

  return (
    <div className={`flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Content Sharing</h3>
        
        <div className="flex items-center space-x-2">
          {isModerator && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4"
                onChange={handleFileUpload}
              />
              <Button size="sm" variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </span>
              </Button>
            </label>
          )}
          
          {onToggleFullscreen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-gray-200 bg-white px-4">
            <TabsTrigger value="whiteboard" className="flex items-center space-x-2">
              <PenTool className="h-4 w-4" />
              <span>Whiteboard</span>
            </TabsTrigger>
            
            <TabsTrigger value="files" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Files</span>
              {uploadedFiles.length > 0 && (
                <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600">
                  {uploadedFiles.length}
                </span>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="video" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Video</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whiteboard" className="flex-1 m-0 p-0">
            <WhiteboardCanvas 
              sessionId={sessionId}
              isModerator={isModerator}
            />
          </TabsContent>

          <TabsContent value="files" className="flex-1 m-0 p-0">
            <FileViewer 
              files={uploadedFiles}
              onRemove={(id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))}
              isModerator={isModerator}
            />
          </TabsContent>

          <TabsContent value="video" className="flex-1 m-0 p-0">
            <VideoEmbed 
              isModerator={isModerator}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Info */}
      {!isModerator && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            Moderator is presenting • View-only mode
          </p>
        </div>
      )}
    </div>
  );
}
