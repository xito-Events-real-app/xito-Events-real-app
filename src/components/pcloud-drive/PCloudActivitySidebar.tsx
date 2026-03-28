import { useEffect, useState } from "react";
import { Cloud, HardDrive, RefreshCw, FileVideo, FileImage, Newspaper, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getPCloudQuota, formatPCloudSize, PCloudQuota } from "@/lib/pcloud-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface RecentUpload {
  fileName: string;
  fullPath: string;
  size: number;
  modified: string;
  created: string;
  contenttype: string;
  monthYear: string;
  clientName: string;
  category: string;
  eventName: string;
}

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'wmv', 'flv'];

function isVideo(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTS.includes(ext);
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

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function PCloudActivitySidebar() {
  const [quota, setQuota] = useState<PCloudQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);

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

  const fetchRecentUploads = async () => {
    setUploadsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pcloud-api', {
        body: { action: 'getrecentuploads', params: { path: '/WEDDING TALES NEPAL', limit: 30 } },
      });
      if (error) throw error;
      setUploads(data?.files || []);
    } catch (err) {
      console.warn("Failed to fetch recent uploads:", err);
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    fetchRecentUploads();
  }, []);

  const usedPercent = quota ? Math.round((quota.used / quota.total) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-red-500" />
        <h2 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400">Breaking News</h2>
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : quota ? (
              <div className="space-y-2">
                <Progress value={usedPercent} className="h-3" />
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{formatPCloudSize(quota.used)} used</span>
                  <span className="font-medium text-foreground">{formatPCloudSize(quota.total)}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatPCloudSize(quota.free)}</p>
                  <p className="text-[10px] text-muted-foreground">Free Space</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Could not load quota</p>
            )}
          </div>

          {/* Recent Uploads — News Feed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest from WTN</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={fetchRecentUploads} disabled={uploadsLoading}>
                <RefreshCw className={`h-3 w-3 ${uploadsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {uploadsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : uploads.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent uploads in WEDDING TALES NEPAL</p>
            ) : (
              <div className="space-y-2">
                {uploads.map((entry, idx) => {
                  const isVid = isVideo(entry.fileName);
                  const timeStr = entry.modified ? getTimeAgo(entry.modified) : '';
                  const headline = entry.clientName
                    ? `New ${isVid ? 'video' : 'photo'} in ${entry.clientName}${entry.eventName ? ` › ${entry.eventName}` : ''}`
                    : `New file uploaded`;
                  
                  return (
                    <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors overflow-hidden">
                      {/* News headline */}
                      <div className="px-3 pt-2.5 pb-1">
                        <div className="flex items-start gap-2">
                          {isVid ? (
                            <FileVideo className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                          ) : (
                            <FileImage className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          )}
                          <p className="text-[11px] font-semibold text-foreground leading-tight">{headline}</p>
                        </div>
                      </div>
                      
                      {/* Details */}
                      <div className="px-3 pb-2.5 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground truncate flex-1">{entry.fileName}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {entry.size > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                              {formatSize(entry.size)}
                            </Badge>
                          )}
                          {timeStr && (
                            <span className="text-[9px] text-muted-foreground">{timeStr}</span>
                          )}
                        </div>
                      </div>

                      {/* Category tag */}
                      {entry.monthYear && (
                        <div className="px-3 pb-2 flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                            {entry.monthYear}
                          </Badge>
                          {entry.category && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                              {entry.category}
                            </Badge>
                          )}
                        </div>
                      )}
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
