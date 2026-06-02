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
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrCreateSessionNotes, updateSessionNotes } from "@/app/actions/sessionNotes";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";

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
  const t = useTranslations("liveSession.notesEditor");
  const tRoom = useTranslations("liveSession.room");
  const tCommon = useTranslations("common");
  const dfLocale = getDateFnsLocale(useLocale());
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
        toast.error(t("toasts.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    }
    loadNotes();
  }, [sessionId, t]);

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
        toast.success(t("toasts.saved"));
      } else {
        toast.error(t("toasts.saveFailed"));
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(t("toasts.saveFailed"));
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
      <div className="flex h-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="h-5 w-5 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-white">{tRoom("notesPanel.title")}</span>
          {isHost && (
            <Badge variant="secondary" className="bg-purple-500/20 text-xs text-purple-400">
              {tRoom("participants.host")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              {t("saved", {
                relativeTime: formatDistanceToNow(lastSaved, {
                  addSuffix: true,
                  locale: dfLocale,
                }),
              })}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? t("saving") : tCommon("save")}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => setActiveSection("notes")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === "notes"
              ? "border-b-2 border-purple-500 bg-zinc-800/50 text-purple-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          {tRoom("panels.notes")}
        </button>
        <button
          onClick={() => setActiveSection("insights")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === "insights"
              ? "border-b-2 border-yellow-500 bg-zinc-800/50 text-yellow-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          {t("tabs.insights", { count: insights.length })}
        </button>
        <button
          onClick={() => setActiveSection("resources")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === "resources"
              ? "border-b-2 border-green-500 bg-zinc-800/50 text-green-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          {t("tabs.resources", { count: resources.length })}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {activeSection === "notes" && (
            <div className="space-y-3">
              <div className="mb-2 text-sm text-zinc-400">
                <Sparkles className="mr-1 inline h-4 w-4" />
                {t("notesHint")}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="min-h-[300px] w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

          {activeSection === "insights" && (
            <div className="space-y-3">
              <div className="mb-2 text-sm text-zinc-400">
                <Lightbulb className="mr-1 inline h-4 w-4" />
                {t("insightsHint")}
              </div>

              {/* Add new insight */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInsight}
                  onChange={(e) => setNewInsight(e.target.value)}
                  placeholder={t("insightPlaceholder")}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  onKeyDown={(e) => e.key === "Enter" && addInsight()}
                />
                <Button
                  onClick={addInsight}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {t("add")}
                </Button>
              </div>

              {/* Insights list */}
              <div className="space-y-2">
                {insights.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">{t("insightsEmpty")}</div>
                ) : (
                  insights.map((insight, index) => (
                    <div
                      key={index}
                      className="group flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                      <span className="flex-1 text-sm text-zinc-300">{insight}</span>
                      <button
                        onClick={() => removeInsight(index)}
                        className="text-zinc-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
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
              <div className="mb-2 text-sm text-zinc-400">
                <LinkIcon className="mr-1 inline h-4 w-4" />
                {t("resourcesHint")}
              </div>

              {/* Add new resource */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  placeholder={t("resourcePlaceholder")}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  onKeyDown={(e) => e.key === "Enter" && addResource()}
                />
                <Button onClick={addResource} size="sm" className="bg-green-600 hover:bg-green-700">
                  {t("add")}
                </Button>
              </div>

              {/* Resources list */}
              <div className="space-y-2">
                {resources.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">{t("resourcesEmpty")}</div>
                ) : (
                  resources.map((resource, index) => (
                    <div
                      key={index}
                      className="group flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <LinkIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <a
                        href={resource.startsWith("http") ? resource : `https://${resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-sm text-green-400 hover:text-green-300"
                      >
                        {resource}
                      </a>
                      <button
                        onClick={() => removeResource(index)}
                        className="text-zinc-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
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
