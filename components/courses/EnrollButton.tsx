"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollInCourse } from "@/app/actions/courses";

type EnrollButtonProps = {
  courseId: string;
  isPaid?: boolean;
  price?: number;
  currency?: string;
  userOwnsCourse?: boolean;
};

export function EnrollButton({ courseId, isPaid, price, currency, userOwnsCourse }: EnrollButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Free Flow
  const handleEnroll = async () => {
    if (!isPaid) {
      // Free enrollment
      setIsLoading(true);
      try {
        const result = await enrollInCourse(courseId);
        if (result.success) {
          router.push(`/dashboard/courses/${courseId}/success`);
          router.refresh();
        } else {
          alert(result.error || "Failed to enroll");
        }
      } catch (error) {
        alert("An error occurred");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Paid enrollment - redirect to Stripe Checkout
      setIsLoading(true);
      try {
        const response = await fetch(`/api/courses/${courseId}/checkout`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout");
        }

        const { url } = await response.json();
        
        // Redirect to Stripe Checkout
        // After successful payment, Stripe will redirect to success page
        window.location.href = url;
      } catch (error) {
        console.error("Checkout error:", error);
        alert("Failed to start checkout process");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {isPaid ? (
        <Button
          onClick={handleEnroll}
          disabled={isLoading || userOwnsCourse}
          className="w-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white hover:scale-105 transition-transform px-6 py-3 text-lg rounded-xl shadow-lg"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Paying ...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              {price && price > 0 ? `Buy for ${currency || "$"}${price}` : "Buy Now"}
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleEnroll}
          disabled={isLoading || userOwnsCourse}
          className="w-full bg-gradient-to-br from-green-400 to-green-600 text-white hover:scale-105 transition-transform px-6 py-3 text-lg rounded-xl shadow-lg"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enrolling ...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Enroll for Free
            </>
          )}
        </Button>
      )}
      {/* Info below button */}
      {isPaid ? (
        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mt-2">
          <Lock className="h-4 w-4 text-yellow-500" />
          <span>Secure checkout with Stripe</span>
        </div>
      ) : (
        <p className="text-xs text-center text-muted-foreground">
          100% free access to all course content
        </p>
      )}
    </div>
  );
}
