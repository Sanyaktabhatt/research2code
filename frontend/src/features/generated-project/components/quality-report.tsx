import { SectionCard } from "@/components/ui/section-card";
import { ConfidenceBar } from "@/features/knowledge-explorer/components/confidence-bar";
import { ValidationCard } from "@/features/generated-project/components/validation-card";
import { groupQualityIssues } from "@/features/generated-project/lib/quality-grouping";
import type { QualityReport as QualityReportData } from "@/types/domain";

interface QualityReportProps {
  report: QualityReportData;
  onSelectFile?: (path: string) => void;
}

export function QualityReport({ report, onSelectFile }: QualityReportProps) {
  const groups = groupQualityIssues(report.issues);
  const errorCount = report.issues.filter((i) => i.severity === "error").length;
  const warningCount = report.issues.length - errorCount;

  return (
    <SectionCard title="Quality report" description="Automated review of the generated project">
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium">Overall score</span>
            <span className="text-sm font-semibold">{Math.round(report.score * 100)}%</span>
          </div>
          <ConfidenceBar confidence={report.score} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {errorCount} error{errorCount === 1 ? "" : "s"} · {warningCount} warning{warningCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((group) => (
            <ValidationCard key={group.id} group={group} onSelectFile={onSelectFile} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
