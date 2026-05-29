import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallLockedViewProps {
  communityName: string;
  communityImageUrl?: string | null;
  locale: string;
}

const STRINGS = {
  title: (name: string) => `${name} is paused`,
  description:
    "This community is temporarily unavailable. The host is working to bring it back online. Your membership and content are preserved.",
  browseCta: "Browse other communities",
};

export function PaywallLockedView({
  communityName,
  communityImageUrl,
  locale,
}: PaywallLockedViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        {communityImageUrl && (
          <div className="relative mx-auto mb-6 h-20 w-20 overflow-hidden rounded-2xl bg-muted opacity-60">
            <Image
              src={communityImageUrl}
              alt={communityName}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        )}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">{STRINGS.title(communityName)}</h1>
        <p className="mb-6 text-muted-foreground">{STRINGS.description}</p>
        <Button asChild variant="outline">
          <Link href={`/${locale}/explore`}>{STRINGS.browseCta}</Link>
        </Button>
      </div>
    </div>
  );
}
