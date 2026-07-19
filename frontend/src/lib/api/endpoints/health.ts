import { apiFetch } from "@/lib/api/client";
import type { HealthStatus } from "@/types/domain";

/** Dependency-level readiness (db/redis/neo4j/minio), not process liveness. */
export async function getHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/health/ready");
}
