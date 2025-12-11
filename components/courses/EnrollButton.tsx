"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollInCourse } from "@/app/actions/courses";

type EnrollButtonProps = {
  courseId: string;
  isPaid?: boolean;
};

export function EnrollButton({ courseId, isPaid }: EnrollButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEnroll = async () => {
    setIsLoading(true);
    setError("");

    try {
      // If paid, redirect to payment flow (Stripe checkout)
      if (isPaid) {
        // TODO: Implement Stripe checkout for course payment
        alert("Stripe checkout coming soon! For now, course is free.");
      }

      // Enroll user
      const result = await enrollInCourse(courseId);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to enroll");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleEnroll}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enrolling...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isPaid ? "Buy Now" : "Enroll for Free"}
          </>
        )}
      </Button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {!isPaid && (
        <p className="text-xs text-center text-muted-foreground">
          Free access to all course content
        </p>
      )}
    </div>
  );
}
