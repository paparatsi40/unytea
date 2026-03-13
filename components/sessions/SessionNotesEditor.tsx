"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Save, 
  Clock, 
  Sparkles, 
  BookOpen, 
  Link as LinkIcon,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrCreateSessionNotes, updateSessionNotes } from "@/app/actions/sessionNotes";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface SessionNotesEditorProps {
  sessionId: string;
  isHost?: boolean;
}

interface NoteData {
  id: string;
  content: string;
  summary?: string | null;
  keyInsights: string[];
  resources: string[];
  updatedAt: Date;
  lastEditedBy?: string | null;
}

export function SessionNotesEditor({ sessionId, isHost }: SessionNotesEditorProps) {
  const [note, setNote] = useState<NoteData | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<"notes" | "insights" | "resources">("notes");
  const [insights, setInsights] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [newInsight, setNewInsight] = useState("");
  const [newResource, setNewResource] = useState("");
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load notes on mount
  useEffect(() => {
    async function loadNotes() {
      try {
        const result = await getOrCreateSessionNotes(sessionId);
        if (result.success) {
          setNote(result.note);
          setContent(result.note.content);
          setInsights(result.note.keyInsights || []);
          setResources(result.note.resources || []);
          setLastSaved(new Date(result.note.updatedAt));
        }
      } catch (error) {
        console.error("Failed to load notes:", error);
        toast.error("Failed to load session notes");
      } finally {
        setIsLoading(false);
      }
    }
    loadNotes();
  }, [sessionId]);

  // Auto-save every 3 seconds when content changes
  useEffect(() => {
    if (!note || isLoading) return;

    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }

    autoSaveRef.current = setTimeout(async () => {
      await handleAutoSave();
    }, 3000);

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [content, insights, resources, note, isLoading]);

  const handleAutoSave = async () => {
    if (!note) return;

    try {
      const result = await updateSessionNotes({
        noteId: note.id,
        content,
        summary: note.summary || "",
        keyInsights: insights,
        resources,
      });

      if (result.success) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleManualSave = async () => {
    if (!note) return;

    setIsSaving(true);
    try {
      const result = await updateSessionNotes({
        noteId: note.id,
        content,
        summary: note.summary || "",
        keyInsights: insights,
        resources,
      });

      if (result.success) {
        setLastSaved(new Date());
        toast.success("Notes saved");
      } else {
        toast.error("Failed to save notes");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const addInsight = () => {
    if (!newInsight.trim()) return;
    setInsights([...insights, newInsight.trim()]);
    setNewInsight("");
  };

  const removeInsight = (index: number) => {
    setInsights(insights.filter((_, i) => i !== index));
  };

  const addResource = () => {
    if (!newResource.trim()) return;
    setResources([...resources, newResource.trim()]);
    setNewResource("");
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="h-5 w-5 animate-spin" />
          <span>Loading notes...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-white">Session Notes</span>
          {isHost && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
              Host
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => setActiveSection("notes")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSection === "notes"
              ? "text-purple-400 border-b-2 border-purple-500 bg-zinc-800/50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Notes
        </button>
        <button
          onClick={() => setActiveSection("insights")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSection === "insights"
              ? "text-yellow-400 border-b-2 border-yellow-500 bg-zinc-800/50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          Insights ({insights.length})
        </button>
        <button
          onClick={() => setActiveSection("resources")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSection === "resources"
              ? "text-green-400 border-b-2 border-green-500 bg-zinc-800/50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          Resources ({resources.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {activeSection === "notes" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400 mb-2">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Capture key points, decisions, and action items
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Session Notes

Key takeaways:
• 

Action items:
• 

Questions to follow up:
• `}
                className="w-full min-h-[300px] bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

          {activeSection === "insights" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400 mb-2">
                <Lightbulb className="h-4 w-4 inline mr-1" />
                Key insights and learnings from this session
              </div>
              
              {/* Add new insight */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInsight}
                  onChange={(e) => setNewInsight(e.target.value)}
                  placeholder="Add a key insight..."
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  onKeyDown={(e) => e.key === "Enter" && addInsight()}
                />
                <Button onClick={addInsight} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                  Add
                </Button>
              </div>

              {/* Insights list */}
              <div className="space-y-2">
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No insights yet. Add key learnings from this session.
                  </div>
                ) : (
                  insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 group"
                    >
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-zinc-300 flex-1">{insight}</span>
                      <button
                        onClick={() => removeInsight(index)}
                        className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === "resources" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400 mb-2">
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Links, tools, and resources shared during the session
              </div>
              
              {/* Add new resource */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  placeholder="https://example.com or resource name"
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  onKeyDown={(e) => e.key === "Enter" && addResource()}
                />
                <Button onClick={addResource} size="sm" className="bg-green-600 hover:bg-green-700">
                  Add
                </Button>
              </div>

              {/* Resources list */}
              <div className="space-y-2">
                {resources.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No resources yet. Add links and tools shared.
                  </div>
                ) : (
                  resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 group"
                    >
                      <LinkIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <a
                        href={resource.startsWith("http") ? resource : `https://${resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 flex-1 truncate"
                      >
                        {resource}
                      </a>
                      <button
                        onClick={() => removeResource(index)}
                        className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}