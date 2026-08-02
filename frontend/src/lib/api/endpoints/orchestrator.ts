import { apiFetch } from "@/lib/api/client";
import type { OrchestratorAnswer, OrchestratorQueryRequest } from "@/types/domain";

export async function queryOrchestrator(payload: OrchestratorQueryRequest): Promise<OrchestratorAnswer> {
  return apiFetch<OrchestratorAnswer>("/orchestrator/query", { method: "POST", body: payload });
}
