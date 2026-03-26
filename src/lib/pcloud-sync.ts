import { createPCloudFolderByPath } from "@/lib/pcloud-api";
import { buildPCloudFolderTree, buildResearchFolderTree, FreelancerAssignment } from "@/lib/xito-drive-utils";
import { BookedClientData } from "@/lib/sheets-api";

const BATCH_SIZE = 5;

export interface SyncProgress {
  current: number;
  total: number;
  currentPath: string;
}

async function batchCreateFolders(
  paths: string[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  const total = paths.length;
  let created = 0;
  const errors: string[] = [];

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
      onProgress?.({ current: i + j + 1, total, currentPath: path });
    }

    if (i + BATCH_SIZE < paths.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return { created, errors };
}

/**
 * Sync Photos + Videos folders to pCloud under /wedding-tales-nepal.
 */
export async function syncPCloudDriveFolders(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  const paths = buildPCloudFolderTree(clients, assignments);
  return batchCreateFolders(paths, onProgress);
}

/**
 * Sync Research folders to pCloud under /CLIENT DETAILS.
 */
export async function syncResearchFolders(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  const paths = buildResearchFolderTree(clients, assignments);
  return batchCreateFolders(paths, onProgress);
}

/** @deprecated Use syncPCloudDriveFolders or syncResearchFolders */
export async function syncAllFoldersToPCloud(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  return syncPCloudDriveFolders(clients, assignments, onProgress);
}
