"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
    Loader2,
  CheckCircle,
  Clock,
  Users,
  Check,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { createCourseFromSessions } from "@/app/actions/knowledge-library";

interface Session {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  mode: string;
  community: { id: string; name: string } | null;
  _count: { participations: number };
  engagementScore: number;
}

interface CourseSuggestion {
  title: string;
  sessionCount: number;
  sessions: Session[];
  totalDuration: number;
  totalAttendees: number;
  potentialStudents: number;
  avgEngagement: number;
}

interface CreateCourseFromSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: Session[];
  suggestions: CourseSuggestion[];
  onSuccess?: () => void;
}

export function CreateCourseFromSessionsDialog({
  open,
  onOpenChange,
  sessions,
  suggestions,
  onSuccess,
}: CreateCourseFromSessionsDialogProps) {
  const [step, setStep] = useState<"select" | "configure" | "creating">("select");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CourseSuggestion | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedSessions([]);
      setCourseTitle("");
      setCourseDescription("");
      setIsPaid(false);
      setPrice("");
      setSelectedSuggestion(null);
    }
  }, [open]);

  // Auto-fill from suggestion
  useEffect(() => {
    if (selectedSuggestion) {
      setCourseTitle(selectedSuggestion.title);
      setSelectedSessions(selectedSuggestion.sessions.map((s) => s.id));
    }
  }, [selectedSuggestion]);

  function toggleSession(sessionId: string) {
    setSelectedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  }

  function selectAll() {
    setSelectedSessions(sessions.map((s) => s.id));
  }

  function clearAll() {
    setSelectedSessions([]);
  }

  function canProceed() {
    return selectedSessions.length >= 1 && courseTitle.trim().length >= 3;
  }

  async function handleCreate() {
    if (!canProceed()) return;

    const communityId = sessions.find((s) => selectedSessions.includes(s.id))?.community?.id;
    if (!communityId) {
      toast.error("Selected sessions must belong to a community");
      return;
    }

    setCreating(true);
    try {
      const result = await createCourseFromSessions(selectedSessions, {
        title: courseTitle,
        description: courseDescription || undefined,
        communityId,
        isPaid,
        price: isPaid ? parseFloat(price) || 0 : 0,
      });

      if (result.success) {
        toast.success(result.message || "Course created successfully!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create course");
      }
    } catch (error) {
      toast.error("Error creating course");
    } finally {
      setCreating(false);
    }
  }

  const totalDuration = selectedSessions.reduce((sum, sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    return sum + (session?.duration || 0);
  }, 0);

  const totalAttendees = selectedSessions.reduce((sum, sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    return sum + (session?._count?.participations || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {step === "select" ? "Select Sessions" : "Configure Course"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "select"
              ? `Choose sessions to include in your course (${selectedSessions.length} selected)`
              : "Set up your course details and pricing"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4">
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Suggested Course Topics
                </Label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant={selectedSuggestion === suggestion ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSuggestion(selectedSuggestion === suggestion ? null : suggestion)}
                      className={
                        selectedSuggestion === suggestion
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }
                    >
                      {suggestion.title}
                      <Badge variant="secondary" className="ml-2 bg-zinc-700 text-zinc-300">
                        {suggestion.sessionCount}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Session Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">
                  Available Sessions ({sessions.length})
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="text-zinc-400 hover:text-white"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-zinc-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px] border border-zinc-800 rounded-md">
                <div className="p-3 space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedSessions.includes(session.id)
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                      }`}
                      onClick={() => toggleSession(session.id)}
                    >
                      <Checkbox
                        checked={selectedSessions.includes(session.id)}
                        onCheckedChange={() => toggleSession(session.id)}
                        className="mt-0.5 border-zinc-600 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white truncate">{session.title}</h4>
                          {session.mode === "AUDIO" && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
                              AUDIO
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {session.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {session._count.participations} attendees
                          </span>
                          <span>•</span>
                          <span>{new Date(session.scheduledAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {selectedSessions.includes(session.id) && (
                        <Check className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Summary */}
            {selectedSessions.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-400">
                    <strong className="text-white">{selectedSessions.length}</strong> sessions
                  </span>
                  <span className="text-zinc-400">
                    <strong className="text-white">{Math.round(totalDuration / 60)}h</strong> content
                  </span>
                  <span className="text-zinc-400">
                    <strong className="text-white">{totalAttendees}</strong> total attendees
                  </span>
                </div>
                <Button
                  onClick={() => setStep("configure")}
                  disabled={selectedSessions.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Sessions Preview */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Selected sessions</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select")}
                  className="text-zinc-400 hover:text-white"
                >
                  Change
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSessions.map((sessionId) => {
                  const session = sessions.find((s) => s.id === sessionId);
                  return session ? (
                    <Badge
                      key={sessionId}
                      variant="secondary"
                      className="bg-zinc-700 text-zinc-300"
                    >
                      {session.title.substring(0, 30)}
                      {session.title.length > 30 ? "..." : ""}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Course Details */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">
                Course Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g., Marketing Mastery"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="What will students learn in this course?"
                className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
              />
            </div>

            {/* Pricing */}
            <div className="space-y-3">
              <Label className="text-zinc-300">Pricing</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={isPaid ? "outline" : "default"}
                  onClick={() => setIsPaid(false)}
                  className={
                    !isPaid
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300"
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Free
                </Button>
                <Button
                  type="button"
                  variant={isPaid ? "default" : "outline"}
                  onClick={() => setIsPaid(true)}
                  className={
                    isPaid
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300"
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Paid
                </Button>
              </div>

              {isPaid && (
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-zinc-300">
                    Price (USD)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="29.99"
                    min="0"
                    step="0.01"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!canProceed() || creating}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Course
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
