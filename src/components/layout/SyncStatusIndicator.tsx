import { Cloud, CloudOff, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCacheAge } from "@/lib/cache-manager";

interface SyncStatusIndicatorProps {
  pendingSyncs: number;
  isSyncing: boolean;
  isFromCache: boolean;
  lastSyncedAt: Date | null;
  isOnline?: boolean;
}

export function SyncStatusIndicator({
  pendingSyncs,
  isSyncing,
  isFromCache,
  lastSyncedAt,
  isOnline = true
}: SyncStatusIndicatorProps) {
  // Don't show anything if everything is synced and online
  if (!isSyncing && pendingSyncs === 0 && isOnline && !isFromCache) {
    return null;
  }

  // Offline mode
  if (!isOnline) {
    return (
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm animate-fade-in">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Offline</span>
        {pendingSyncs > 0 && (
          <span className="ml-1 bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded-full">
            {pendingSyncs}
          </span>
        )}
      </div>
    );
  }

  // Syncing
  if (isSyncing) {
    return (
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm animate-fade-in">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  // Pending syncs
  if (pendingSyncs > 0) {
    return (
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm animate-fade-in">
        <Cloud className="w-3.5 h-3.5" />
        <span>{pendingSyncs} pending</span>
      </div>
    );
  }

  // Showing cached data (but online)
  if (isFromCache && lastSyncedAt) {
    return (
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-medium shadow-sm animate-fade-in">
        <Check className="w-3.5 h-3.5" />
        <span>Cached {getCacheAge(lastSyncedAt.getTime())}</span>
      </div>
    );
  }

  return null;
}
