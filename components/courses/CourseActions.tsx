"use client";

import { useState } from "react";
import { Archive, MoreVertical, Trash2, ArchiveRestore, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CourseActionsProps {
  courseId: string;
  courseTitle: string;
  isArchived: boolean;
  enrollmentCount: number;
}

export function CourseActions({ 
  courseId, 
  courseTitle, 
  isArchived,
  enrollmentCount 
}: CourseActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: isArchived ? "unarchive" : "archive" 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update course");
      }

      toast.success(data.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.hasEnrollments) {
          toast.error(data.error, {
            description: "Archive the course instead to hide it from the list.",
          });
        } else {
          throw new Error(data.error || "Failed to delete course");
        }
        setShowDeleteDialog(false);
        setIsLoading(false);
        return;
      }

      toast.success("Course deleted successfully");
      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete course");
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Course actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleArchive} disabled={isLoading}>
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive Course
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive Course
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <AlertDialogTitle>Delete Course Permanently?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{courseTitle}"</strong>?
              </p>
              <p className="text-red-600 font-semibold">
                This action cannot be undone.
              </p>
              {enrollmentCount > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mt-3">
                  <p className="text-amber-800 text-sm">
                    <strong>⚠️ Warning:</strong> This course has {enrollmentCount} active enrollment{enrollmentCount !== 1 ? 's' : ''}. 
                    You cannot delete it. Consider archiving instead.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading || enrollmentCount > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}