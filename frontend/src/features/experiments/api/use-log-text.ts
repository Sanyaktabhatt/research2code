"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchLogText(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download logs (${response.status})`);
  const text = await response.text();
  return text.length === 0 ? [] : text.split("\n");
}

/** Historical log text for a run that isn't currently being watched live (see execution/celery_tasks.py - the WS only replays a run's live frames, never past ones). */
export function useLogText(downloadUrl: string | null) {
  const query = useQuery({
    queryKey: ["execution-runs", "log-text", downloadUrl],
    queryFn: () => fetchLogText(downloadUrl as string),
    enabled: Boolean(downloadUrl),
    staleTime: 5 * 60 * 1000,
  });

  return { lines: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}
