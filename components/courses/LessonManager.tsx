"use client";

import { useState } from "react";
import { 
  Plus, 
  FileText,
  Video,
  Mic,
  ClipboardCheck,
  Edit,
  Trash2,
  GripVertical,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createLesson, deleteLesson, updateLesson } from "@/app/actions/courses";
import { toast } from "sonner";

interface LessonManagerProps {
  module: any;
  courseId: string;
  locale: string;
}

type ContentType = "TEXT" | "VIDEO" | "AUDIO" | "QUIZ" | "ASSIGNMENT";

const contentTypeIcons = {
  TEXT: FileText,
  VIDEO: Video,
  AUDIO: Mic,
  QUIZ: ClipboardCheck,
  ASSIGNMENT: ClipboardCheck,
};

export function LessonManager({ module }: LessonManagerProps) {
  const lessons = module.lessons || [];
  const [isAdding, setIsAdding] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: "",
    content: "",
    contentType: "TEXT" as ContentType,
    videoUrl: "",
    duration: "",
    isFree: false,
  });
  const [editData, setEditData] = useState({
    title: "",
    content: "",
    contentType: "TEXT" as ContentType,
    videoUrl: "",
    duration: "",
    isFree: false,
  });

  const handleCreateLesson = async () => {
    if (!newLesson.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    if (!newLesson.content.trim() && newLesson.contentType === "TEXT") {
      toast.error("Lesson content is required");
      return;
    }

    if (!newLesson.videoUrl.trim() && newLesson.contentType === "VIDEO") {
      toast.error("Video URL is required");
      return;
    }

    try {
      const result = await createLesson({
        moduleId: module.id,
        title: newLesson.title,
        content: newLesson.content || newLesson.videoUrl || "No content",
        contentType: newLesson.contentType,
        videoUrl: newLesson.contentType === "VIDEO" ? newLesson.videoUrl : undefined,
        duration: newLesson.duration ? parseInt(newLesson.duration) * 60 : undefined, // Convert minutes to seconds
        position: lessons.length,
        isFree: newLesson.isFree,
      });

      if (result.success) {
        toast.success("Lesson created successfully! 🎉");
        setNewLesson({ title: "", content: "", contentType: "TEXT", videoUrl: "", duration: "", isFree: false });
        setIsAdding(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to create lesson");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleUpdateLesson = async (lessonId: string) => {
    if (!editData.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    try {
      const result = await updateLesson(lessonId, {
        title: editData.title,
        content: editData.content || editData.videoUrl || "No content",
        contentType: editData.contentType,
        videoUrl: editData.contentType === "VIDEO" ? editData.videoUrl : undefined,
        duration: editData.duration ? parseInt(editData.duration) * 60 : undefined, // Convert minutes to seconds
        isFree: editData.isFree,
      });

      if (result.success) {
        toast.success("Lesson updated successfully!");
        setEditingLesson(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update lesson");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${lessonTitle}"?`)) {
      return;
    }

    try {
      const result = await deleteLesson(lessonId);

      if (result.success) {
        toast.success("Lesson deleted successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete lesson");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Add Lesson Button */}
      {!isAdding && (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          className="w-full border-dashed border-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      )}

      {/* Create Lesson Form */}
      {isAdding && (
        <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">New Lesson</h4>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Lesson Title */}
            <div>
              <Label>Lesson Title *</Label>
              <Input
                placeholder="e.g., What is a Community?"
                value={newLesson.title}
                onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
              />
            </div>

            {/* Content Type */}
            <div>
              <Label>Content Type *</Label>
              <Select
                value={newLesson.contentType}
                onValueChange={(value: ContentType) =>
                  setNewLesson({ ...newLesson, contentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text/Article
                    </div>
                  </SelectItem>
                  <SelectItem value="VIDEO">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="AUDIO">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Audio
                    </div>
                  </SelectItem>
                  <SelectItem value="QUIZ">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Quiz
                    </div>
                  </SelectItem>
                  <SelectItem value="ASSIGNMENT">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Assignment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content based on type */}
            {newLesson.contentType === "TEXT" && (
              <div>
                <Label>Lesson Content *</Label>
                <Textarea
                  placeholder="Write your lesson content here... (supports markdown)"
                  value={newLesson.content}
                  onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: You can use markdown formatting (# headings, **bold**, *italic*, etc.)
                </p>
              </div>
            )}

            {newLesson.contentType === "VIDEO" && (
              <>
                <div>
                  <Label>Video URL *</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    value={newLesson.videoUrl}
                    onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports YouTube, Vimeo, or direct video URLs
                  </p>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                </div>
              </>
            )}

            {newLesson.contentType === "AUDIO" && (
              <>
                <div>
                  <Label>Audio URL *</Label>
                  <Input
                    placeholder="https://soundcloud.com/... or direct audio URL"
                    value={newLesson.videoUrl}
                    onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                </div>
              </>
            )}

            {(newLesson.contentType === "QUIZ" || newLesson.contentType === "ASSIGNMENT") && (
              <div>
                <Label>Instructions/Description *</Label>
                <Textarea
                  placeholder={
                    newLesson.contentType === "QUIZ"
                      ? "Quiz instructions and questions..."
                      : "Assignment description and requirements..."
                  }
                  value={newLesson.content}
                  onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                  rows={8}
                />
              </div>
            )}

            {/* Free Preview Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="space-y-0.5">
                <Label htmlFor="free-preview">Free Preview</Label>
                <p className="text-xs text-muted-foreground">
                  Allow non-enrolled users to access this lesson
                </p>
              </div>
              <Switch
                id="free-preview"
                checked={newLesson.isFree}
                onCheckedChange={(checked) => setNewLesson({ ...newLesson, isFree: checked })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateLesson} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create Lesson
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Lessons */}
      {lessons.length > 0 && (
        <div className="space-y-2">
          {lessons.map((lesson: any, index: number) => {
            const isEditing = editingLesson === lesson.id;
            const Icon = contentTypeIcons[lesson.contentType as ContentType] || FileText;

            return (
              <div
                key={lesson.id}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Lesson title"
                    />

                    <Select
                      value={editData.contentType}
                      onValueChange={(value: ContentType) =>
                        setEditData({ ...editData, contentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">Text/Article</SelectItem>
                        <SelectItem value="VIDEO">Video</SelectItem>
                        <SelectItem value="AUDIO">Audio</SelectItem>
                        <SelectItem value="QUIZ">Quiz</SelectItem>
                        <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                      </SelectContent>
                    </Select>

                    {editData.contentType === "TEXT" && (
                      <Textarea
                        value={editData.content}
                        onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    )}

                    {editData.contentType === "VIDEO" && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Video URL"
                          value={editData.videoUrl}
                          onChange={(e) => setEditData({ ...editData, videoUrl: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Duration (minutes)"
                          value={editData.duration}
                          onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editData.isFree}
                        onCheckedChange={(checked) => setEditData({ ...editData, isFree: checked })}
                      />
                      <Label>Free Preview</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateLesson(lesson.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingLesson(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Drag Handle */}
                    <div className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Lesson Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Lesson Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">
                          {lesson.contentType?.toLowerCase()}
                        </span>
                        {lesson.duration && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.ceil(lesson.duration / 60)} min
                            </span>
                          </>
                        )}
                        {lesson.isFree && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-green-600 font-medium">Free</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingLesson(lesson.id);
                          setEditData({
                            title: lesson.title,
                            content: lesson.content || "",
                            contentType: lesson.contentType || "TEXT",
                            videoUrl: lesson.videoUrl || "",
                            duration: lesson.duration ? (lesson.duration / 60).toString() : "",
                            isFree: lesson.isFree || false,
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {lessons.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No lessons yet. Click "Add Lesson" to get started.</p>
        </div>
      )}
    </div>
  );
}
