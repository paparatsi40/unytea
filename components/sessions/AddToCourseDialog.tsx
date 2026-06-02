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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useTranslations } from "next-intl";
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
  description: string | null;
  isPaid: boolean;
  price: number | null;
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
  const t = useTranslations("liveSession.addToCourse");
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
        toast.error(t("toasts.loadFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.loadError"));
    } finally {
      setFetchingCourses(false);
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  async function handleAddToExistingCourse() {
    if (!selectedCourseId) {
      toast.error(t("validation.selectCourse"));
      return;
    }

    setLoading(true);
    try {
      const result = await addSessionToCourse(sessionId, selectedCourseId, {
        moduleId: selectedModuleId || undefined,
        lessonTitle: lessonTitle || undefined,
        isFree,
        source: "add_to_course_dialog_existing",
      });

      if (result.success) {
        toast.success(result.message || t("toasts.added"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || t("toasts.addFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.addError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNewCourse() {
    if (!newCourseTitle.trim()) {
      toast.error(t("validation.enterTitle"));
      return;
    }

    setLoading(true);
    try {
      const result = await createCourseFromSession(sessionId, newCourseTitle, {
        description: newCourseDescription || undefined,
        isPaid: newCourseIsPaid,
        price: newCourseIsPaid ? parseFloat(newCoursePrice) || 0 : 0,
        source: "add_to_course_dialog_new",
      });

      if (result.success) {
        toast.success(result.message || t("toasts.created"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || t("toasts.createFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
            <TabsTrigger
              value="existing"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              {t("tabExisting")}
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              {t("tabNew")}
            </TabsTrigger>
          </TabsList>

          {/* EXISTING COURSE TAB */}
          <TabsContent value="existing" className="mt-4 space-y-4">
            {fetchingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : courses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-zinc-400">{t("existing.noCourses")}</p>
                <Button
                  variant="link"
                  className="text-purple-400"
                  onClick={() => setActiveTab("new")}
                >
                  {t("existing.createNewInstead")}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-300">{t("existing.courseLabel")}</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={(value) => {
                      setSelectedCourseId(value);
                      setSelectedModuleId(""); // Reset module when course changes
                    }}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                      <SelectValue placeholder={t("existing.coursePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-800">
                      {courses.map((course) => (
                        <SelectItem
                          key={course.id}
                          value={course.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          <div className="flex items-center gap-2">
                            <span>{course.title}</span>
                            <span className="text-xs text-zinc-500">
                              ({t("existing.enrolled", { count: course._count.enrollments })})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCourse && selectedCourse.modules.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-zinc-300">{t("existing.moduleLabel")}</Label>
                    <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                        <SelectValue placeholder={t("existing.modulePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
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
                  <Label className="text-zinc-300">{t("existing.lessonTitleLabel")}</Label>
                  <Input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder={t("existing.lessonTitlePlaceholder")}
                    className="border-zinc-700 bg-zinc-800 text-white"
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
                    {t("existing.makeFree")}
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
                      {t("existing.adding")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t("existing.submit")}
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          {/* NEW COURSE TAB */}
          <TabsContent value="new" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">{t("new.courseTitleLabel")}</Label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder={t("new.courseTitlePlaceholder")}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">{t("new.descriptionLabel")}</Label>
              <Input
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
                placeholder={t("new.descriptionPlaceholder")}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-300">{t("new.pricingLabel")}</Label>
              <RadioGroup
                value={newCourseIsPaid ? "paid" : "free"}
                onValueChange={(value) => setNewCourseIsPaid(value === "paid")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="free"
                    id="free"
                    className="border-zinc-600 text-purple-500"
                  />
                  <Label htmlFor="free" className="cursor-pointer text-zinc-300">
                    {t("new.free")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="paid"
                    id="paid"
                    className="border-zinc-600 text-purple-500"
                  />
                  <Label htmlFor="paid" className="cursor-pointer text-zinc-300">
                    {t("new.paid")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {newCourseIsPaid && (
              <div className="space-y-2">
                <Label className="text-zinc-300">{t("new.priceLabel")}</Label>
                <Input
                  type="number"
                  value={newCoursePrice}
                  onChange={(e) => setNewCoursePrice(e.target.value)}
                  placeholder="29.99"
                  className="border-zinc-700 bg-zinc-800 text-white"
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
                  {t("new.creating")}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("new.submit")}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
