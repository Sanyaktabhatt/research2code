import { CardSkeleton } from "@/components/feedback/skeletons";

export default function ProjectLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
