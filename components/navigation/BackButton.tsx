"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
  className?: string;
}

export function BackButton({ 
  label = "Back", 
  fallbackUrl = "/dashboard",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Try browser back first
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to specific URL
      router.push(fallbackUrl);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}