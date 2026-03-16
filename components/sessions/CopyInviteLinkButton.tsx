"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyInviteLinkButtonProps {
  invitePath: string;
}

export function CopyInviteLinkButton({ invitePath }: CopyInviteLinkButtonProps) {
  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}${invitePath}`;
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant="outline"
      className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
    >
      <Copy className="mr-2 h-4 w-4" />
      Copy invite link
    </Button>
  );
}
