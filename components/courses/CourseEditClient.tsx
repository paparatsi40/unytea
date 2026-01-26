"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  ChevronLeft, 
  Settings,
  Eye,
  Save,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleManager } from "./ModuleManager";
import { CourseSettings } from "./CourseSettings";
import { updateCourse } from "@/app/actions/courses";
import { toast } from "sonner";

interface CourseEditClientProps {
  course: any;
  locale: string;
}

export function CourseEditClient({ course, locale }: CourseEditClientProps) {
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    try {
      const result = await updateCourse(course.id, {
        isPublished: !course.isPublished,
      });

      if (result.success) {
        toast.success(
          course.isPublished 
            ? "Course unpublished successfully" 
            : "Course published successfully! 🎉"
        );
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update course");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/dashboard/courses/${course.id}`}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Course
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  {course.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {course.isPublished ? (
                    <span className="text-green-600 font-medium">● Published</span>
                  ) : (
                    <span className="text-amber-600 font-medium">● Draft</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/${locale}/dashboard/courses/${course.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button
                onClick={handlePublishToggle}
                disabled={isPublishing}
                className={
                  course.isPublished
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                }
              >
                {isPublishing ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : course.isPublished ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Publish Course
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course Content
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <ModuleManager course={course} locale={locale} />
          </TabsContent>

          <TabsContent value="settings">
            <CourseSettings course={course} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
