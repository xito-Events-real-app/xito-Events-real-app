import { createPCloudFolderByPath, listPCloudFolderRecursive } from "@/lib/pcloud-api";
import { buildPCloudFolderTree, buildResearchFolderTree, FreelancerAssignment } from "@/lib/xito-drive-utils";
import { BookedClientData } from "@/lib/sheets-api";

const BATCH_SIZE = 5;

export interface SyncProgress {
  current: number;
  total: number;
  currentPath: string;
}

export interface PendingSyncStatus {
  pending: number;
  paths: string[];
  summaries: string[];
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
 * Generate human-readable summaries from pending paths.
 */
function generateSummaries(pendingPaths: string[]): string[] {
  const summaries: string[] = [];
  const seenClients = new Set<string>();
  const seenFreelancers = new Set<string>();

  for (const p of pendingPaths) {
    const parts = p.split("/");
    // WEDDING TALES NEPAL / 2082-10 / ClientName / Photos / Event / Freelancer
    if (parts.length >= 3) {
      const clientName = parts[2];
      const monthKey = parts[1];
      if (!seenClients.has(clientName)) {
        seenClients.add(clientName);
        summaries.push(`New client: ${clientName} (${monthKey})`);
      }
    }
    if (parts.length >= 6 && parts[3] === "Photos") {
      const freelancer = parts[5];
      const event = parts[4];
      const key = `${freelancer}-${event}`;
      if (!seenFreelancers.has(key)) {
        seenFreelancers.add(key);
        summaries.push(`New freelancer: ${freelancer} for ${event}`);
      }
    }
  }

  return summaries;
}

/**
 * Check what folders are missing in pCloud vs expected tree.
 */
export async function checkPCloudSyncStatus(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): Promise<PendingSyncStatus> {
  const expectedPaths = buildPCloudFolderTree(clients, assignments);
  
  let existingPaths: Set<string>;
  try {
    existingPaths = await listPCloudFolderRecursive("WEDDING TALES NEPAL", 5);
  } catch {
    // Root folder doesn't exist — everything is pending
    return {
      pending: expectedPaths.length,
      paths: expectedPaths,
      summaries: [`Root folder not found — full sync needed (${expectedPaths.length} folders)`],
    };
  }

  const missing = expectedPaths.filter(p => !existingPaths.has(p));
  
  return {
    pending: missing.length,
    paths: missing,
    summaries: generateSummaries(missing),
  };
}

/**
 * Sync only missing folders to pCloud.
 */
export async function syncPendingFolders(
  pendingPaths: string[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  return batchCreateFolders(pendingPaths, onProgress);
}

/**
 * Sync Photos + Videos folders to pCloud under /WEDDING TALES NEPAL.
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
