import { TableSkeleton } from "@/components/feedback/skeletons";

export default function ProjectsLoading() {
  return <TableSkeleton rows={5} columns={3} />;
}
