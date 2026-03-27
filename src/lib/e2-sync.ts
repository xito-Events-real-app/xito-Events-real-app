import { listE2FolderRecursive, createE2Folder } from "@/lib/idrive-e2-api";
import { buildXitoFolderTree, FreelancerAssignment } from "@/lib/xito-drive-utils";
import { BookedClientData } from "@/lib/sheets-api";
import { SyncProgress, PendingSyncStatus } from "@/lib/pcloud-sync";

const BATCH_SIZE = 5;

/**
 * Generate human-readable summaries from pending E2 paths.
 */
function generateSummaries(pendingPaths: string[]): string[] {
  const summaries: string[] = [];
  const seenClients = new Set<string>();
  const seenFreelancers = new Set<string>();

  for (const p of pendingPaths) {
    const parts = p.split("/");
    // MAGH EVENTS 2082 / ClientName / Photos / Event / Freelancer
    if (parts.length >= 2) {
      const clientName = parts[1];
      const monthKey = parts[0];
      if (!seenClients.has(clientName)) {
        seenClients.add(clientName);
        summaries.push(`New client: ${clientName} (${monthKey})`);
      }
    }
    if (parts.length >= 5 && parts[2] === "Photos") {
      const freelancer = parts[4];
      const event = parts[3];
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
 * Check what folders are missing in iDrive E2 vs expected XITO DRIVE tree.
 */
export async function checkE2SyncStatus(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): Promise<PendingSyncStatus> {
  const expectedPaths = buildXitoFolderTree(clients, assignments);

  let existingPaths: Set<string>;
  try {
    existingPaths = await listE2FolderRecursive("");
  } catch {
    return {
      pending: expectedPaths.length,
      paths: expectedPaths,
      summaries: [`No folders found — full sync needed (${expectedPaths.length} folders)`],
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
 * Sync missing folders to iDrive E2 — batch-create with progress.
 */
export async function syncE2PendingFolders(
  pendingPaths: string[],
  onProgress?: (progress: SyncProgress) => void
): Promise<{ created: number; errors: string[] }> {
  // Sort by depth so parents are created first
  const sorted = [...pendingPaths].sort((a, b) => {
    return a.split("/").length - b.split("/").length;
  });

  const total = sorted.length;
  let created = 0;
  const errors: string[] = [];

  // Group by depth
  const depthGroups = new Map<number, string[]>();
  for (const p of sorted) {
    const depth = p.split("/").length;
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth)!.push(p);
  }

  const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
  let processed = 0;

  for (const depth of depths) {
    const levelPaths = depthGroups.get(depth)!;

    for (let i = 0; i < levelPaths.length; i += BATCH_SIZE) {
      const batch = levelPaths.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(path => createE2Folder(path))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") created++;
        else errors.push(batch[j]);
        processed++;
        onProgress?.({ current: processed, total, currentPath: batch[j] });
      }

      if (i + BATCH_SIZE < levelPaths.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  return { created, errors };
}
