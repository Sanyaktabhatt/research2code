import { strFromU8, unzipSync } from "fflate";

/**
 * The backend has no per-file content endpoint - `GeneratedProjectDetail`
 * only carries `file_manifest` (paths) and a presigned ZIP download URL
 * (see backend/app/api/v1/endpoints/codegen.py). Archive entries are each
 * file's path verbatim (backend/app/codegen/exporters.py::ZipExporter),
 * so this fetches that same ZIP and unzips it client-side into a
 * path -> content map, rather than requiring a backend change.
 */
export async function fetchAndUnzipProject(downloadUrl: string): Promise<Map<string, string>> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download project archive (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const entries = unzipSync(bytes);

  const files = new Map<string, string>();
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith("/")) continue; // directory entry
    files.set(path, strFromU8(data));
  }
  return files;
}
