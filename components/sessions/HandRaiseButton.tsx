"use client";

import { Hand, HandMetal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HandRaiseButtonProps {
  isRaised: boolean;
  onToggle: () => void;
  className?: string;
}

export function HandRaiseButton({
  isRaised,
  onToggle,
  className,
}: HandRaiseButtonProps) {
  return (
    <Button
      variant={isRaised ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className={className}
      title={isRaised ? "Lower hand" : "Raise hand"}
    >
      {isRaised ? (
        <>
          <HandMetal className="h-4 w-4 mr-2 animate-bounce" />
          Lower Hand
        </>
      ) : (
        <>
          <Hand className="h-4 w-4 mr-2" />
          Raise Hand
        </>
      )}
    </Button>
  );
}
