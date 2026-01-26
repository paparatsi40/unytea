"use client";

import { useState } from "react";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Edit,
  Trash2,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { createModule, deleteModule, updateModule } from "@/app/actions/courses";
import { toast } from "sonner";
import { LessonManager } from "./LessonManager";

interface ModuleManagerProps {
  course: any;
  locale: string;
}

export function ModuleManager({ course, locale }: ModuleManagerProps) {
  const modules = course.modules || [];
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newModule, setNewModule] = useState({ title: "", description: "" });
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", description: "" });

  const handleCreateModule = async () => {
    if (!newModule.title.trim()) {
      toast.error("Module title is required");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createModule({
        courseId: course.id,
        title: newModule.title,
        description: newModule.description,
        position: modules.length,
      });

      if (result.success) {
        toast.success("Module created successfully! 🎉");
        setNewModule({ title: "", description: "" });
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to create module");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editData.title.trim()) {
      toast.error("Module title is required");
      return;
    }

    try {
      const result = await updateModule(moduleId, {
        title: editData.title,
        description: editData.description,
      });

      if (result.success) {
        toast.success("Module updated successfully!");
        setEditingModule(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update module");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${moduleTitle}"? This will also delete all lessons inside.`)) {
      return;
    }

    try {
      const result = await deleteModule(moduleId);

      if (result.success) {
        toast.success("Module deleted successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete module");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Create New Module Card */}
      <Card className="p-6 border-2 border-dashed border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Add New Module
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Module Title *</label>
            <Input
              placeholder="e.g., Introduction to Community Building"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateModule();
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
            <Textarea
              placeholder="Brief description of what students will learn..."
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              rows={3}
            />
          </div>
          <Button 
            onClick={handleCreateModule} 
            disabled={isCreating || !newModule.title.trim()}
            className="w-full bg-gradient-to-r from-primary to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Module"}
          </Button>
        </div>
      </Card>

      {/* Existing Modules */}
      {modules.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Modules Yet</h3>
          <p className="text-muted-foreground">
            Create your first module above to start building your course content.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Modules ({modules.length})
          </h3>

          {modules.map((module: any, index: number) => {
            const isExpanded = expandedModules.includes(module.id);
            const isEditing = editingModule === module.id;
            const lessonsCount = module.lessons?.length || 0;

            return (
              <Card key={module.id} className="overflow-hidden">
                {/* Module Header */}
                <div className="p-6 bg-gradient-to-r from-card to-accent/10">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Module Number */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* Module Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            placeholder="Module title"
                            className="font-semibold"
                          />
                          <Textarea
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="Module description"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateModule(module.id)}>
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingModule(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-foreground mb-1">
                            {module.title}
                          </h3>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {module.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {lessonsCount} {lessonsCount === 1 ? "lesson" : "lessons"}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingModule(module.id);
                            setEditData({
                              title: module.title,
                              description: module.description || "",
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteModule(module.id, module.title)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleModule(module.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lessons */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <LessonManager 
                      module={module} 
                      courseId={course.id}
                      locale={locale}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
