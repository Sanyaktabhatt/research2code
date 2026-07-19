import { queryOptions } from "@tanstack/react-query";
import { listProjects } from "@/lib/api/endpoints/projects";
import { queryKeys } from "@/lib/query/keys";

/**
 * Shared query definition so useQuery (project switcher, /projects list)
 * and useSuspenseQuery (dashboard) hit the exact same cache entry instead
 * of issuing duplicate requests for the same data.
 */
export function projectsListQueryOptions(page = 1, pageSize = 20) {
  return queryOptions({
    queryKey: queryKeys.projects.list(page, pageSize),
    queryFn: () => listProjects(page, pageSize),
  });
}
