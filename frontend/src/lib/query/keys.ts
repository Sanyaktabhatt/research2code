/**
 * Central query-key factory. Every feature imports from here instead of
 * hand-rolling key arrays, so cache invalidation can't drift out of sync
 * with what a query was actually keyed under.
 */
export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  projects: {
    all: () => ["projects"] as const,
    list: (page = 1, pageSize = 20) => [...queryKeys.projects.all(), "list", page, pageSize] as const,
    detail: (projectId: string) => [...queryKeys.projects.all(), "detail", projectId] as const,
  },
  papers: {
    all: (projectId: string) => ["papers", projectId] as const,
    list: (projectId: string) => [...queryKeys.papers.all(projectId), "list"] as const,
    detail: (projectId: string, paperId: string) => [...queryKeys.papers.all(projectId), paperId] as const,
    recent: (limit: number) => ["papers", "recent", limit] as const,
  },
  knowledge: {
    list: (paperId: string) => ["knowledge", paperId, "list"] as const,
    latest: (paperId: string) => ["knowledge", paperId, "latest"] as const,
    version: (paperId: string, version: number) => ["knowledge", paperId, "version", version] as const,
  },
  embeddings: {
    status: (paperId: string) => ["embeddings", paperId, "status"] as const,
  },
  graph: {
    snapshot: (paperId: string) => ["graph", paperId, "snapshot"] as const,
  },
  rag: {
    /** Client-persisted (localStorage) conversation history - no backend conversation resource exists. */
    conversations: (projectId: string) => ["rag", projectId, "conversations"] as const,
  },
  codegen: {
    detail: (generatedProjectId: string) => ["codegen", generatedProjectId] as const,
    files: (generatedProjectId: string) => [...queryKeys.codegen.detail(generatedProjectId), "files"] as const,
    recent: (limit: number, statuses?: string[]) =>
      ["generated-projects", "recent", limit, statuses ?? []] as const,
    forPaper: (paperId: string) => ["generated-projects", "for-paper", paperId] as const,
    latestForPaper: (paperId: string) => ["generated-projects", "for-paper", paperId, "latest"] as const,
    version: (paperId: string, version: number) => ["generated-projects", "for-paper", paperId, "version", version] as const,
    downloadUrl: (generatedProjectId: string) => ["generated-projects", generatedProjectId, "download-url"] as const,
  },
  executionRuns: {
    detail: (runId: string) => ["execution-runs", runId] as const,
    metrics: (runId: string) => [...queryKeys.executionRuns.detail(runId), "metrics"] as const,
    recent: (limit: number, statuses?: string[]) =>
      ["execution-runs", "recent", limit, statuses ?? []] as const,
    forGeneratedProject: (generatedProjectId: string) =>
      ["execution-runs", "for-generated-project", generatedProjectId] as const,
    latestForGeneratedProject: (generatedProjectId: string) =>
      ["execution-runs", "for-generated-project", generatedProjectId, "latest"] as const,
    version: (generatedProjectId: string, version: number) =>
      ["execution-runs", "for-generated-project", generatedProjectId, "version", version] as const,
    tensorboardUrl: (runId: string) => [...queryKeys.executionRuns.detail(runId), "tensorboard-url"] as const,
    logDownloadUrl: (runId: string) => [...queryKeys.executionRuns.detail(runId), "log-download-url"] as const,
    compare: (runIds: string[]) => ["execution-runs", "compare", [...runIds].sort()] as const,
  },
  health: {
    ready: () => ["health", "ready"] as const,
  },
} as const;
