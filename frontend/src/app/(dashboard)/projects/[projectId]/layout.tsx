import { WorkspaceLayout } from "@/features/workspace/components/workspace-layout";

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
