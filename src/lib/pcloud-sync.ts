import { createPCloudFolderByPath } from "@/lib/pcloud-api";
import { buildFullFolderTree, FreelancerAssignment } from "@/lib/xito-drive-utils";
import { BookedClientData } from "@/lib/sheets-api";

const BATCH_SIZE = 5;

export interface SyncProgress {
  current: number;
  total: number;
  currentPath: string;
}

/**
 * Create all XITO DRIVE virtual folders in pCloud under /wedding-tales-nepal.
 * Uses createfolderifnotexists so it's safe to run multiple times.
 */
export async function syncAllFoldersToPCloud(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  const paths = buildFullFolderTree(clients, assignments);
  const total = paths.length;
  let created = 0;
  const errors: string[] = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(path => createPCloudFolderByPath(`/${path}`))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const path = batch[j];
      if (result.status === "fulfilled") {
        created++;
      } else {
        console.warn(`Failed to create pCloud folder: ${path}`, result.reason);
        errors.push(path);
      }
      onProgress?.({
        current: i + j + 1,
        total,
        currentPath: path,
      });
    }

    // Small delay between batches to be kind to pCloud API
    if (i + BATCH_SIZE < paths.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return { created, errors };
}
