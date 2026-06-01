"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Video,
  FileText,
  Headphones,
  Eye,
  EyeOff,
  Loader2,
  Save,
  X,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getCourse,
  updateCourse,
  createModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@/app/actions/courses";

interface LessonData {
  id: string;
  title: string;
  content: string;
  contentType: "TEXT" | "VIDEO" | "AUDIO";
  videoUrl: string | null;
  duration: number | null;
  position: number;
  isPublished: boolean;
  isFree: boolean;
}

interface ModuleData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonData[];
}

interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPaid: boolean;
  price: number | null;
  currency: string | null;
  isPublished: boolean;
  modules: ModuleData[];
  community: {
    id: string;
    name: string;
    ownerId: string;
  };
}

export default function CourseBuilderPage() {
  const t = useTranslations("dashboard.communityAdmin.courses.builder");
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsOwner] = useState(false);

  // Edit course details
  const [editingDetails, setEditingDetails] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    isPaid: false,
    price: 0,
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Module state
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isAddingModule, setIsAddingModule] = useState(false);

  // Lesson state
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    contentType: "TEXT" as "TEXT" | "VIDEO" | "AUDIO",
    videoUrl: "",
    isFree: false,
  });
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  // Editing lesson
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({
    title: "",
    content: "",
    contentType: "TEXT" as "TEXT" | "VIDEO" | "AUDIO",
    videoUrl: "",
    isFree: false,
  });
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const result = await getCourse(courseId);
      if (result.success && result.course) {
        setCourse(result.course as unknown as CourseData);
        setIsOwner(!!result.isOwner);
        setCourseForm({
          title: result.course.title,
          description: result.course.description || "",
          isPaid: result.course.isPaid,
          price: result.course.price || 0,
        });
        // Expand all modules by default
        const moduleIds = new Set(result.course.modules.map((m: { id: string }) => m.id));
        setExpandedModules(moduleIds);
      } else {
        toast.error(result.error || t("toasts.loadFailed"));
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error(t("toasts.loadFailed"));
    }
    setIsLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // Toggle module expand/collapse
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Save course details
  const handleSaveDetails = async () => {
    if (!course) return;
    setIsSavingDetails(true);
    try {
      const result = await updateCourse(course.id, {
        title: courseForm.title,
        description: courseForm.description || undefined,
        isPaid: courseForm.isPaid,
        price: courseForm.isPaid ? courseForm.price : 0,
      });
      if (result.success) {
        toast.success(t("toasts.updated"));
        setEditingDetails(false);
        fetchCourse();
      } else {
        toast.error(result.error || t("toasts.updateFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.updateFailed"));
    }
    setIsSavingDetails(false);
  };

  // Add module
  const handleAddModule = async () => {
    if (!course || !newModuleTitle.trim()) return;
    setIsAddingModule(true);
    try {
      const result = await createModule({
        courseId: course.id,
        title: newModuleTitle.trim(),
        position: course.modules.length,
      });
      if (result.success) {
        toast.success(t("toasts.moduleAdded"));
        setNewModuleTitle("");
        setAddingModule(false);
        fetchCourse();
      } else {
        toast.error(result.error || t("toasts.moduleAddFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.moduleAddFailed"));
    }
    setIsAddingModule(false);
  };

  // Delete module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm(t("modules.deleteConfirm"))) return;
    const result = await deleteModule(moduleId);
    if (result.success) {
      toast.success(t("toasts.moduleDeleted"));
      fetchCourse();
    } else {
      toast.error(result.error || t("toasts.moduleDeleteFailed"));
    }
  };

  // Add lesson
  const handleAddLesson = async (moduleId: string) => {
    if (!lessonForm.title.trim()) return;
    setIsAddingLesson(true);

    const mod = course?.modules.find((m) => m.id === moduleId);
    try {
      const result = await createLesson({
        moduleId,
        title: lessonForm.title.trim(),
        content: lessonForm.content || " ",
        contentType: lessonForm.contentType,
        videoUrl: lessonForm.videoUrl || undefined,
        position: mod?.lessons.length || 0,
        isFree: lessonForm.isFree,
      });
      if (result.success) {
        toast.success(t("toasts.lessonAdded"));
        setLessonForm({ title: "", content: "", contentType: "TEXT", videoUrl: "", isFree: false });
        setAddingLessonToModule(null);
        fetchCourse();
      } else {
        toast.error(result.error || t("toasts.lessonAddFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.lessonAddFailed"));
    }
    setIsAddingLesson(false);
  };

  // Start editing lesson
  const startEditLesson = (lesson: LessonData) => {
    setEditingLesson(lesson.id);
    setEditLessonForm({
      title: lesson.title,
      content: lesson.content,
      contentType: lesson.contentType,
      videoUrl: lesson.videoUrl || "",
      isFree: lesson.isFree,
    });
  };

  // Save edited lesson
  const handleSaveLesson = async (lessonId: string) => {
    setIsSavingLesson(true);
    try {
      const result = await updateLesson(lessonId, {
        title: editLessonForm.title,
        content: editLessonForm.content,
        contentType: editLessonForm.contentType,
        videoUrl: editLessonForm.videoUrl || undefined,
        isFree: editLessonForm.isFree,
      });
      if (result.success) {
        toast.success(t("toasts.lessonUpdated"));
        setEditingLesson(null);
        fetchCourse();
      } else {
        toast.error(result.error || t("toasts.lessonUpdateFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.lessonUpdateFailed"));
    }
    setIsSavingLesson(false);
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(t("lessons.deleteConfirm"))) return;
    const result = await deleteLesson(lessonId);
    if (result.success) {
      toast.success(t("toasts.lessonDeleted"));
      fetchCourse();
    } else {
      toast.error(result.error || t("toasts.lessonDeleteFailed"));
    }
  };

  // Toggle course publish
  const handleTogglePublish = async () => {
    if (!course) return;
    const result = await updateCourse(course.id, {
      isPublished: !course.isPublished,
    });
    if (result.success) {
      toast.success(course.isPublished ? t("toasts.unpublished") : t("toasts.published"));
      fetchCourse();
    } else {
      toast.error(result.error || t("toasts.updateFailed"));
    }
  };

  const contentTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "AUDIO":
        return <Headphones className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">{t("notFound")}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          {t("goBack")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Back button */}
      <button
        onClick={() => router.push(`/dashboard/c/${slug}/courses`)}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToCourses")}
      </button>

      {/* Course Header */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("header.titleLabel")}
                  </label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("header.descriptionLabel")}
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Free/Paid Toggle */}
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {courseForm.isPaid ? t("header.paidCourse") : t("header.freeCourse")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCourseForm({ ...courseForm, isPaid: !courseForm.isPaid })}
                    >
                      {courseForm.isPaid ? (
                        <ToggleRight className="h-7 w-7 text-purple-600" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {courseForm.isPaid && (
                    <div className="mt-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={courseForm.price}
                          onChange={(e) =>
                            setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })
                          }
                          className="w-48 rounded-lg border border-gray-200 py-2 pl-8 pr-4 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSavingDetails ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("header.save")}
                  </button>
                  <button
                    onClick={() => setEditingDetails(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {t("header.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.isPublished ? t("header.published") : t("header.draft")}
                  </span>
                  {course.isPaid ? (
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      ${course.price}
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {t("header.free")}
                    </span>
                  )}
                </div>
                {course.description && (
                  <p className="mt-2 text-sm text-gray-500">{course.description}</p>
                )}
              </>
            )}
          </div>

          {!editingDetails && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingDetails(true)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                title={t("header.editDetails")}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={handleTogglePublish}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                  course.isPublished
                    ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {course.isPublished ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    {t("header.unpublish")}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    {t("header.publish")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("modules.header", { count: course.modules.length })}
          </h2>
          <button
            onClick={() => setAddingModule(true)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            <Plus className="h-4 w-4" />
            {t("modules.addButton")}
          </button>
        </div>

        {/* Add Module Form */}
        {addingModule && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder={t("modules.titlePlaceholder")}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={handleAddModule}
                disabled={isAddingModule || !newModuleTitle.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isAddingModule ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("modules.add")}
              </button>
              <button
                onClick={() => {
                  setAddingModule(false);
                  setNewModuleTitle("");
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modules */}
        {course.modules.length === 0 && !addingModule ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">{t("modules.empty")}</p>
          </div>
        ) : (
          course.modules.map((mod, modIndex) => (
            <div
              key={mod.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Module Header */}
              <div
                className="flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-gray-50"
                onClick={() => toggleModule(mod.id)}
              >
                <GripVertical className="h-4 w-4 text-gray-300" />
                {expandedModules.has(mod.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-xs font-semibold text-purple-700">
                  {modIndex + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{mod.title}</h3>
                  <p className="text-xs text-gray-500">
                    {t("modules.lessonCount", { count: mod.lessons.length })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModule(mod.id);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Module Content (Lessons) */}
              {expandedModules.has(mod.id) && (
                <div className="border-t border-gray-100">
                  {/* Lessons */}
                  {mod.lessons.map((lesson, lessonIndex) => (
                    <div key={lesson.id}>
                      {editingLesson === lesson.id ? (
                        /* Edit Lesson Form */
                        <div className="border-b border-gray-100 bg-gray-50 p-5">
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editLessonForm.title}
                              onChange={(e) =>
                                setEditLessonForm({ ...editLessonForm, title: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder={t("lessons.titlePlaceholder")}
                            />
                            {/* Content Type */}
                            <div className="flex gap-2">
                              {(["TEXT", "VIDEO", "AUDIO"] as const).map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() =>
                                    setEditLessonForm({ ...editLessonForm, contentType: type })
                                  }
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                                    editLessonForm.contentType === type
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  {contentTypeIcon(type)}
                                  {t(`lessons.type.${type}`)}
                                </button>
                              ))}
                            </div>
                            {editLessonForm.contentType === "VIDEO" && (
                              <input
                                type="url"
                                value={editLessonForm.videoUrl}
                                onChange={(e) =>
                                  setEditLessonForm({ ...editLessonForm, videoUrl: e.target.value })
                                }
                                placeholder={t("lessons.videoUrlPlaceholder")}
                                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            )}
                            <textarea
                              value={editLessonForm.content}
                              onChange={(e) =>
                                setEditLessonForm({ ...editLessonForm, content: e.target.value })
                              }
                              rows={4}
                              placeholder={t("lessons.contentPlaceholder")}
                              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            {/* Free toggle */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditLessonForm({
                                    ...editLessonForm,
                                    isFree: !editLessonForm.isFree,
                                  })
                                }
                                className="flex items-center gap-1.5 text-sm"
                              >
                                {editLessonForm.isFree ? (
                                  <Unlock className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-400" />
                                )}
                                <span
                                  className={
                                    editLessonForm.isFree ? "text-green-700" : "text-gray-500"
                                  }
                                >
                                  {editLessonForm.isFree
                                    ? t("lessons.freePreview")
                                    : t("lessons.paidOnly")}
                                </span>
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveLesson(lesson.id)}
                                disabled={isSavingLesson}
                                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                              >
                                {isSavingLesson ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                {t("lessons.save")}
                              </button>
                              <button
                                onClick={() => setEditingLesson(null)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                {t("lessons.cancel")}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Lesson Row */
                        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-b-0 hover:bg-gray-50">
                          <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                          {contentTypeIcon(lesson.contentType)}
                          <span className="text-xs text-gray-400">{lessonIndex + 1}.</span>
                          <span className="flex-1 text-sm text-gray-900">{lesson.title}</span>
                          {lesson.isFree && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                              {t("lessons.free")}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditLesson(lesson)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Lesson Form */}
                  {addingLessonToModule === mod.id ? (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={lessonForm.title}
                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                          placeholder={t("lessons.titlePlaceholder")}
                          autoFocus
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        {/* Content Type Picker */}
                        <div className="flex gap-2">
                          {(["TEXT", "VIDEO", "AUDIO"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setLessonForm({ ...lessonForm, contentType: type })}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                                lessonForm.contentType === type
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {contentTypeIcon(type)}
                              {t(`lessons.type.${type}`)}
                            </button>
                          ))}
                        </div>
                        {lessonForm.contentType === "VIDEO" && (
                          <input
                            type="url"
                            value={lessonForm.videoUrl}
                            onChange={(e) =>
                              setLessonForm({ ...lessonForm, videoUrl: e.target.value })
                            }
                            placeholder={t("lessons.videoUrlPlaceholder")}
                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        )}
                        <textarea
                          value={lessonForm.content}
                          onChange={(e) =>
                            setLessonForm({ ...lessonForm, content: e.target.value })
                          }
                          rows={3}
                          placeholder={t("lessons.contentPlaceholder")}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        {/* Free toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLessonForm({ ...lessonForm, isFree: !lessonForm.isFree })
                            }
                            className="flex items-center gap-1.5 text-sm"
                          >
                            {lessonForm.isFree ? (
                              <Unlock className="h-4 w-4 text-green-600" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                            <span
                              className={lessonForm.isFree ? "text-green-700" : "text-gray-500"}
                            >
                              {lessonForm.isFree ? t("lessons.freePreview") : t("lessons.paidOnly")}
                            </span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddLesson(mod.id)}
                            disabled={isAddingLesson || !lessonForm.title.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isAddingLesson ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            {t("lessons.addButton")}
                          </button>
                          <button
                            onClick={() => {
                              setAddingLessonToModule(null);
                              setLessonForm({
                                title: "",
                                content: "",
                                contentType: "TEXT",
                                videoUrl: "",
                                isFree: false,
                              });
                            }}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                          >
                            {t("lessons.cancel")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Add Lesson Button */
                    <button
                      onClick={() => setAddingLessonToModule(mod.id)}
                      className="flex w-full items-center gap-2 border-t border-gray-100 px-5 py-3 text-xs font-medium text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("lessons.addButton")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
