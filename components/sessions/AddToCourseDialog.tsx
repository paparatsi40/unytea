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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  addSessionToCourse,
  getAvailableCourses,
  createCourseFromSession,
} from "@/app/actions/session-course";

interface AddToCourseDialogProps {
  sessionId: string;
  sessionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  isPaid: boolean;
  price?: number;
  modules: { id: string; title: string }[];
  _count: { enrollments: number };
}

export function AddToCourseDialog({
  sessionId,
  sessionTitle,
  open,
  onOpenChange,
  onSuccess,
}: AddToCourseDialogProps) {
  const [activeTab, setActiveTab] = useState("existing");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);

  // Existing course form state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState(sessionTitle);
  const [isFree, setIsFree] = useState(false);

  // New course form state
  const [newCourseTitle, setNewCourseTitle] = useState(`Course: ${sessionTitle}`);
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseIsPaid, setNewCourseIsPaid] = useState(false);
  const [newCoursePrice, setNewCoursePrice] = useState("");

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  async function fetchCourses() {
    setFetchingCourses(true);
    try {
      const result = await getAvailableCourses(sessionId);
      if (result.success) {
        setCourses(result.courses || []);
      } else {
        toast.error("Failed to load courses");
      }
    } catch (error) {
      toast.error("Error loading courses");
    } finally {
      setFetchingCourses(false);
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  async function handleAddToExistingCourse() {
    if (!selectedCourseId) {
      toast.error("Please select a course");
      return;
    }

    setLoading(true);
    try {
      const result = await addSessionToCourse(sessionId, selectedCourseId, {
        moduleId: selectedModuleId || undefined,
        lessonTitle: lessonTitle || undefined,
        isFree,
      });

      if (result.success) {
        toast.success(result.message || "Session added to course!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to add session");
      }
    } catch (error) {
      toast.error("Error adding session to course");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNewCourse() {
    if (!newCourseTitle.trim()) {
      toast.error("Please enter a course title");
      return;
    }

    setLoading(true);
    try {
      const result = await createCourseFromSession(
        sessionId,
        newCourseTitle,
        {
          description: newCourseDescription || undefined,
          isPaid: newCourseIsPaid,
          price: newCourseIsPaid ? parseFloat(newCoursePrice) || 0 : 0,
        }
      );

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
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            Add Session to Course
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Convert this live session into permanent course content
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
            <TabsTrigger
              value="existing"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              Existing Course
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              Create New
            </TabsTrigger>
          </TabsList>

          {/* EXISTING COURSE TAB */}
          <TabsContent value="existing" className="space-y-4 mt-4">
            {fetchingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-400">No courses found in this community.</p>
                <Button
                  variant="link"
                  className="text-purple-400"
                  onClick={() => setActiveTab("new")}
                >
                  Create a new course instead
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Select Course</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={(value) => {
                      setSelectedCourseId(value);
                      setSelectedModuleId(""); // Reset module when course changes
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Choose a course..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {courses.map((course) => (
                        <SelectItem
                          key={course.id}
                          value={course.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          <div className="flex items-center gap-2">
                            <span>{course.title}</span>
                            <span className="text-xs text-zinc-500">
                              ({course._count.enrollments} enrolled)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCourse && selectedCourse.modules.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-zinc-300">
                      Module (optional - auto-creates &quot;Live Sessions&quot; if empty)
                    </Label>
                    <Select
                      value={selectedModuleId}
                      onValueChange={setSelectedModuleId}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select module or leave empty..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {selectedCourse.modules.map((module) => (
                          <SelectItem
                            key={module.id}
                            value={module.id}
                            className="text-white hover:bg-zinc-700"
                          >
                            {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-zinc-300">Lesson Title</Label>
                  <Input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Enter lesson title"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-700 text-purple-500"
                  />
                  <Label htmlFor="isFree" className="text-sm text-zinc-300">
                    Make this lesson free (preview)
                  </Label>
                </div>

                <Button
                  onClick={handleAddToExistingCourse}
                  disabled={loading || !selectedCourseId}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Add to Course
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          {/* NEW COURSE TAB */}
          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Course Title</Label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Enter course title"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Description</Label>
              <Input
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
                placeholder="Brief description of the course"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Pricing</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newCourseIsPaid ? "outline" : "default"}
                  onClick={() => setNewCourseIsPaid(false)}
                  className={!newCourseIsPaid ? "bg-purple-600 hover:bg-purple-700" : "border-zinc-700 bg-zinc-800 text-zinc-300"}
                >
                  Free
                </Button>
                <Button
                  type="button"
                  variant={newCourseIsPaid ? "default" : "outline"}
                  onClick={() => setNewCourseIsPaid(true)}
                  className={newCourseIsPaid ? "bg-purple-600 hover:bg-purple-700" : "border-zinc-700 bg-zinc-800 text-zinc-300"}
                >
                  Paid
                </Button>
              </div>
            </div>

            {newCourseIsPaid && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Price (USD)</Label>
                <Input
                  type="number"
                  value={newCoursePrice}
                  onChange={(e) => setNewCoursePrice(e.target.value)}
                  placeholder="29.99"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            )}

            <Button
              onClick={handleCreateNewCourse}
              disabled={loading || !newCourseTitle.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course from Session
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
