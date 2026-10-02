import { AsyncSection } from "@/components/feedback/async-section";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/feedback/skeletons";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { UsageStatistics } from "@/features/dashboard/components/usage-statistics";
import { PipelineOverview } from "@/features/dashboard/components/pipeline-overview";
import { SystemHealth } from "@/features/dashboard/components/system-health";
import { RecentProjects } from "@/features/dashboard/components/recent-projects";
import { RecentPapers } from "@/features/dashboard/components/recent-papers";
import { RunningJobs } from "@/features/dashboard/components/running-jobs";
import { ActivityTimeline } from "@/features/dashboard/components/activity-timeline";
import { LatestGeneratedProjects } from "@/features/dashboard/components/latest-generated-projects";
import { RecentExperimentRuns } from "@/features/dashboard/components/recent-experiment-runs";
import { MotionGrid, MotionItem } from "@/features/dashboard/components/motion-grid";

export default function DashboardPage() {
  return (
    <MotionGrid className="space-y-6">
      <MotionItem>
        <DashboardHeader />
      </MotionItem>

      <MotionItem>
        <QuickActions />
      </MotionItem>

      <MotionItem>
        <AsyncSection label="usage statistics" fallback={<StatCardsSkeleton />}>
          <UsageStatistics />
        </AsyncSection>
      </MotionItem>

      {/* `h-full` on each SectionCard here is deliberate and scoped to this
          grid: it's what makes two side-by-side cards with uneven content
          (e.g. a short empty state next to a longer list) match the row's
          stretched height instead of each sizing to its own content. Card's
          own base styles no longer default to `h-full` (see card.tsx) since
          that leaked into non-grid contexts like the Artifacts page. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MotionItem className="lg:col-span-2">
          <SectionCard title="Pipeline overview" description="Project status distribution" className="h-full">
            <AsyncSection label="pipeline overview" fallback={<ChartSkeleton />}>
              <PipelineOverview />
            </AsyncSection>
          </SectionCard>
        </MotionItem>

        <MotionItem>
          <SectionCard title="System health" description="Dependency readiness" className="h-full">
            <AsyncSection label="system health" fallback={<CardSkeleton />}>
              <SystemHealth />
            </AsyncSection>
          </SectionCard>
        </MotionItem>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MotionItem>
          <SectionCard title="Recent projects" action={{ href: "/projects", label: "View all" }} className="h-full">
            <AsyncSection label="recent projects" fallback={<ListSkeleton rows={5} />}>
              <RecentProjects />
            </AsyncSection>
          </SectionCard>
        </MotionItem>

        <MotionItem>
          <SectionCard title="Recent papers" className="h-full">
            <AsyncSection label="recent papers" fallback={<ListSkeleton rows={5} />}>
              <RecentPapers />
            </AsyncSection>
          </SectionCard>
        </MotionItem>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MotionItem>
          <SectionCard title="Running jobs" description="Active codegen and execution runs" className="h-full">
            <AsyncSection label="running jobs" fallback={<ListSkeleton rows={4} />}>
              <RunningJobs />
            </AsyncSection>
          </SectionCard>
        </MotionItem>

        <MotionItem>
          <SectionCard title="Recent activity" className="h-full">
            <AsyncSection label="recent activity" fallback={<ListSkeleton rows={5} />}>
              <ActivityTimeline />
            </AsyncSection>
          </SectionCard>
        </MotionItem>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MotionItem>
          <SectionCard title="Latest generated projects" className="h-full">
            <AsyncSection label="latest generated projects" fallback={<ListSkeleton rows={5} />}>
              <LatestGeneratedProjects />
            </AsyncSection>
          </SectionCard>
        </MotionItem>

        <MotionItem>
          <SectionCard title="Recent experiment runs" className="h-full">
            <AsyncSection label="recent experiment runs" fallback={<ListSkeleton rows={5} />}>
              <RecentExperimentRuns />
            </AsyncSection>
          </SectionCard>
        </MotionItem>
      </div>
    </MotionGrid>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
