import { AsyncSection } from "@/components/feedback/async-section";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton, ListSkeleton } from "@/components/feedback/skeletons";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { GettingStarted, WhenHasProjects, WhenNoProjects } from "@/features/dashboard/components/getting-started";
import { ContinuePanel } from "@/features/dashboard/components/continue-panel";
import { UsageStatistics } from "@/features/dashboard/components/usage-statistics";
import { RecentProjects } from "@/features/dashboard/components/recent-projects";
import { RunningJobs } from "@/features/dashboard/components/running-jobs";
import { ActivityTimeline } from "@/features/dashboard/components/activity-timeline";
import { MotionGrid, MotionItem } from "@/features/dashboard/components/motion-grid";

/**
 * Deliberately short: greeting and one action, the next step on your latest
 * project, four numbers, then the work itself - your projects on the left, what's running and what just happened
 * on the right. Everything else is a click away in the top bar or ⌘K.
 */
export default function DashboardPage() {
  return (
    <MotionGrid className="space-y-8 pt-2">
      <MotionItem>
        <DashboardHeader />
      </MotionItem>

      <AsyncSection label="dashboard" fallback={<CardSkeleton />}>
        <WhenNoProjects>
          <MotionItem>
            <GettingStarted />
          </MotionItem>
        </WhenNoProjects>

        <WhenHasProjects>
          <div className="space-y-8">
            <MotionItem>
              <ContinuePanel />
            </MotionItem>

            <MotionItem>
              <UsageStatistics />
            </MotionItem>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <MotionItem className="lg:col-span-2">
                <SectionCard title="Recent projects" action={{ href: "/projects", label: "View all" }}>
                  <AsyncSection label="recent projects" fallback={<ListSkeleton rows={6} />}>
                    <RecentProjects />
                  </AsyncSection>
                </SectionCard>
              </MotionItem>

              <div className="space-y-6">
                <MotionItem>
                  <SectionCard title="Running now">
                    <AsyncSection label="running jobs" fallback={<ListSkeleton rows={3} />}>
                      <RunningJobs />
                    </AsyncSection>
                  </SectionCard>
                </MotionItem>

                <MotionItem>
                  <SectionCard title="Recent activity">
                    <AsyncSection label="recent activity" fallback={<ListSkeleton rows={5} />}>
                      <ActivityTimeline />
                    </AsyncSection>
                  </SectionCard>
                </MotionItem>
              </div>
            </div>
          </div>
        </WhenHasProjects>
      </AsyncSection>
    </MotionGrid>
  );
}
