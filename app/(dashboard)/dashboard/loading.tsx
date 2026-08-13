import {
  HeaderSkeleton,
  CardSkeleton,
  MetricRowSkeleton,
  CardGridSkeleton,
  ListSkeleton,
} from "@/components/skeletons/dashboard-skeletons";

/**
 * Dashboard home. Also the fallback for any dashboard route without a closer
 * `loading.tsx`, which is why it stays generic below the header.
 */
export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <HeaderSkeleton />
      <CardSkeleton className="h-28" />
      <MetricRowSkeleton />
      <CardGridSkeleton cards={3} />
      <ListSkeleton rows={4} />
    </div>
  );
}
