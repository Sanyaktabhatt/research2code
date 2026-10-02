"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useHealthSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { cn } from "@/lib/utils/cn";

const CHECK_LABEL: Record<string, string> = {
  database: "Database",
  redis: "Redis",
  neo4j: "Neo4j",
  minio: "MinIO",
};

export function SystemHealth() {
  const { data } = useHealthSuspense();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
        {data.status === "ok" ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
        <span className="text-sm font-medium">{data.status === "ok" ? "All systems operational" : "Degraded"}</span>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {Object.entries(data.checks).map(([key, value]) => {
          const isOk = value === "ok";
          return (
            <li
              key={key}
              className={cn(
                "flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm",
                !isOk && "border-destructive/40 bg-destructive/[0.04]",
              )}
            >
              <span>{CHECK_LABEL[key] ?? key}</span>
              {isOk ? (
                <CheckCircle2 className="size-3.5 text-success" />
              ) : (
                <XCircle className="size-3.5 text-destructive" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
