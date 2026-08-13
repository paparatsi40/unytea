import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function SessionDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <HeaderSkeleton />
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
