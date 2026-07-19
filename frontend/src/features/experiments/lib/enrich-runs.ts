import type { EnrichedRun } from "@/features/experiments/types";
import type { ExecutionRun, GeneratedProject, KnowledgeExtraction } from "@/types/domain";

/** Fills in fields that live on sibling resources (see backend/app/models/execution_run.py - no `framework`/`knowledge_extraction_version` column exists on ExecutionRun itself) so RunList/RunCard never have to know the join. */
export function enrichRuns(
  runs: ExecutionRun[],
  generatedProjects: GeneratedProject[],
  knowledgeExtractions: KnowledgeExtraction[],
): EnrichedRun[] {
  const projectById = new Map(generatedProjects.map((p) => [p.id, p]));
  const extractionVersionById = new Map(knowledgeExtractions.map((e) => [e.id, e.version]));

  const retryCounts = new Map<string, number>();
  const sorted = [...runs].sort((a, b) => a.version - b.version);

  return sorted.map((run) => {
    const project = projectById.get(run.generated_project_id);
    const priorAttempts = retryCounts.get(run.generated_project_id) ?? 0;
    retryCounts.set(run.generated_project_id, priorAttempts + 1);

    return {
      ...run,
      generatedProjectVersion: project?.version ?? run.version,
      framework: project?.framework ?? "unknown",
      knowledgeExtractionVersion: project ? (extractionVersionById.get(project.knowledge_extraction_id) ?? null) : null,
      retryCount: priorAttempts,
      durationSeconds: runDurationSeconds(run),
    };
  });
}

export function runDurationSeconds(run: ExecutionRun): number | null {
  if (!run.started_at) return null;
  const end = run.finished_at ? new Date(run.finished_at) : new Date();
  return Math.max(0, (end.getTime() - new Date(run.started_at).getTime()) / 1000);
}
