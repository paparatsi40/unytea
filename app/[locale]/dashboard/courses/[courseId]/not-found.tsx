import Link from "next/link";
import { BookX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
          <BookX className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Course Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The course you're looking for doesn't exist or has been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/courses/browse">
            <Button>Browse Courses</Button>
          </Link>
          <Link href="/dashboard/courses">
            <Button variant="outline">My Courses</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
