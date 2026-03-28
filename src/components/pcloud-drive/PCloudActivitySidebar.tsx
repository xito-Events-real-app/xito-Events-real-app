import { useEffect, useState } from "react";
import { Cloud, HardDrive, Activity, RefreshCw, FileVideo, FileImage, FolderPlus, Trash2, Edit3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getPCloudQuota, formatPCloudSize, PCloudQuota } from "@/lib/pcloud-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiffEntry {
  event: string;
  name: string;
  fileid?: number;
  metadata?: {
    name?: string;
    size?: number;
    isfolder?: boolean;
    contenttype?: string;
    modified?: string;
    created?: string;
    parentfolderid?: number;
  };
  time?: string;
}

export function PCloudActivitySidebar() {
  const [quota, setQuota] = useState<PCloudQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [changes, setChanges] = useState<DiffEntry[]>([]);
  const [changesLoading, setChangesLoading] = useState(true);

  const fetchQuota = async () => {
    setQuotaLoading(true);
    try {
      const q = await getPCloudQuota();
      setQuota(q);
    } catch (err) {
      console.warn("Failed to fetch pCloud quota:", err);
    } finally {
      setQuotaLoading(false);
    }
  };

  const fetchRecentChanges = async () => {
    setChangesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pcloud-api', {
        body: { action: 'getdiff', params: { limit: 500 } },
      });
      if (error) throw error;
      
      // Filter to only file-related events under WEDDING TALES NEPAL
      const entries: DiffEntry[] = (data?.entries || [])
        .filter((e: any) => {
          // Only show create/modify/delete file events
          const validEvents = ['createfile', 'modifyfile', 'deletefile', 'createfolder'];
          return validEvents.includes(e.event);
        })
        .slice(0, 30);
      
      setChanges(entries);
    } catch (err) {
      console.warn("Failed to fetch pCloud changes:", err);
    } finally {
      setChangesLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    fetchRecentChanges();
  }, []);

  const usedPercent = quota ? Math.round((quota.used / quota.total) * 100) : 0;

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'createfile': return <FileImage className="h-3 w-3 text-emerald-500" />;
      case 'modifyfile': return <Edit3 className="h-3 w-3 text-blue-500" />;
      case 'deletefile': return <Trash2 className="h-3 w-3 text-red-500" />;
      case 'createfolder': return <FolderPlus className="h-3 w-3 text-amber-500" />;
      default: return <Cloud className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getEventLabel = (event: string) => {
    switch (event) {
      case 'createfile': return 'Uploaded';
      case 'modifyfile': return 'Modified';
      case 'deletefile': return 'Deleted';
      case 'createfolder': return 'Folder created';
      default: return event;
    }
  };

  const isVideoFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'wmv', 'flv'].includes(ext);
  };

  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Activity className="h-4 w-4 text-sky-500" />
        <h2 className="text-sm font-bold">pCloud Activity</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Storage Stats */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={fetchQuota} disabled={quotaLoading}>
                <RefreshCw className={`h-3 w-3 ${quotaLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {quotaLoading && !quota ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500" />
              </div>
            ) : quota ? (
              <div className="space-y-2">
                <Progress value={usedPercent} className="h-3" />
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {formatPCloudSize(quota.used)} used
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPCloudSize(quota.total)}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPCloudSize(quota.free)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Free Space</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Could not load quota</p>
            )}
          </div>

          {/* Recent Changes from pCloud */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Changes</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={fetchRecentChanges} disabled={changesLoading}>
                <RefreshCw className={`h-3 w-3 ${changesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {changesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : changes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent pCloud changes</p>
            ) : (
              <div className="space-y-1.5">
                {changes.map((entry, idx) => {
                  const fileName = entry.metadata?.name || entry.name || 'Unknown';
                  const fileSize = entry.metadata?.size;
                  const timeStr = entry.time ? getTimeAgo(entry.time) : '';
                  const isVideo = isVideoFile(fileName);
                  
                  return (
                    <div key={idx} className="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {fileName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getEventIcon(entry.event)}
                            <span className="text-[10px] text-muted-foreground">
                              {getEventLabel(entry.event)}
                              {fileSize ? ` · ${formatPCloudSize(fileSize)}` : ''}
                            </span>
                            {isVideo ? (
                              <FileVideo className="h-3 w-3 text-violet-500 ml-1" />
                            ) : entry.event === 'createfile' ? (
                              <FileImage className="h-3 w-3 text-emerald-500 ml-1" />
                            ) : null}
                          </div>
                        </div>
                        {timeStr && (
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{timeStr}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
