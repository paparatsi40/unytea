"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Users,
  DollarSign,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  createCourse,
  getCommunityCourses,
  updateCourse,
  deleteCourse,
} from "@/app/actions/courses";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPaid: boolean;
  price: number | null;
  currency: string | null;
  isPublished: boolean;
  enrollmentCount: number;
  createdAt: string | Date;
  _count: {
    modules: number;
    enrollments: number;
  };
}

export default function CommunityCoursesPage() {
  const t = useTranslations("dashboard.communityAdmin.courses");
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    isPaid: false,
    price: 0,
  });

  // Fetch community ID and courses
  const fetchCourses = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      // First get community ID from slug
      const res = await fetch(`/api/communities/${slug}`);
      if (!res.ok) {
        toast.error(t("toasts.communityNotFound"));
      } else {
        const community = await res.json();
        setCommunityId(community.id);

        const result = await getCommunityCourses(community.id);
        if (result.success && result.courses) {
          setCourses(result.courses as unknown as Course[]);
        } else {
          toast.error(result.error || t("toasts.loadFailed"));
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error(t("toasts.loadFailed"));
    }
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim(),
    });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityId) return;

    setIsSubmitting(true);
    try {
      const result = await createCourse({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || undefined,
        communityId,
        isPaid: formData.isPaid,
        price: formData.isPaid ? formData.price : 0,
      });

      if (result.success && result.course) {
        toast.success(t("toasts.created"));
        setShowCreateForm(false);
        setFormData({ title: "", slug: "", description: "", isPaid: false, price: 0 });
        // Navigate to the course builder
        router.push(`/dashboard/c/${slug}/courses/${result.course.id}`);
      } else {
        toast.error(result.error || t("toasts.createFailed"));
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(t("toasts.createFailed"));
    }
    setIsSubmitting(false);
  };

  const handleTogglePublish = async (course: Course) => {
    const result = await updateCourse(course.id, {
      isPublished: !course.isPublished,
    });
    if (result.success) {
      toast.success(course.isPublished ? t("toasts.unpublished") : t("toasts.published"));
      fetchCourses();
    } else {
      toast.error(result.error || t("toasts.updateFailed"));
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm(t("toasts.deleteConfirm"))) {
      return;
    }
    const result = await deleteCourse(courseId);
    if (result.success) {
      toast.success(t("toasts.deleted"));
      fetchCourses();
    } else {
      toast.error(result.error || t("toasts.deleteFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <GraduationCap className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          {t("createButton")}
        </button>
      </div>

      {/* Create Course Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("createDialog.title")}</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-5 p-6">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("createDialog.titleLabel")} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t("createDialog.titlePlaceholder")}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("createDialog.slugLabel")}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">/courses/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder={t("createDialog.slugPlaceholder")}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("createDialog.descriptionLabel")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("createDialog.descriptionPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Free / Paid Toggle */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formData.isPaid
                          ? t("createDialog.paidCourse")
                          : t("createDialog.freeCourse")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formData.isPaid ? t("createDialog.paidHint") : t("createDialog.freeHint")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPaid: !formData.isPaid })}
                    className="text-gray-500 hover:text-purple-600"
                  >
                    {formData.isPaid ? (
                      <ToggleRight className="h-8 w-8 text-purple-600" />
                    ) : (
                      <ToggleLeft className="h-8 w-8" />
                    )}
                  </button>
                </div>

                {/* Price Input */}
                {formData.isPaid && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t("createDialog.priceLabel")} *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder={t("createDialog.pricePlaceholder")}
                        className="w-full rounded-lg border border-gray-200 py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        required={formData.isPaid}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("createDialog.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("createDialog.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Image */}
              {course.imageUrl ? (
                <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                  <Image
                    src={course.imageUrl}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                  <BookOpen className="h-12 w-12 text-purple-300" />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute left-3 top-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    course.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {course.isPublished ? t("card.published") : t("card.draft")}
                </span>
              </div>

              {/* Price Badge */}
              {course.isPaid && (
                <div className="absolute right-3 top-3 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">
                  ${course.price || 0}
                </div>
              )}
              {!course.isPaid && (
                <div className="absolute right-3 top-3 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  {t("card.free")}
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                <h3 className="mb-1 line-clamp-1 text-base font-semibold text-gray-900">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-500">{course.description}</p>
                )}

                {/* Stats */}
                <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{t("card.modulesCount", { count: course._count.modules })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t("card.enrolledCount", { count: course._count.enrollments })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/c/${slug}/courses/${course.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("card.edit")}
                  </button>
                  <button
                    onClick={() => handleTogglePublish(course)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    title={course.isPublished ? t("card.unpublish") : t("card.publish")}
                  >
                    {course.isPublished ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <GraduationCap className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{t("empty.title")}</h3>
          <p className="mb-6 text-sm text-gray-500">{t("empty.description")}</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            {t("empty.cta")}
          </button>
        </div>
      )}
    </div>
  );
}
