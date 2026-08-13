import { HeaderSkeleton, CardGridSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function SessionsLoading() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <HeaderSkeleton />
      <CardGridSkeleton cards={6} columns="sm:grid-cols-2" />
    </div>
  );
}
