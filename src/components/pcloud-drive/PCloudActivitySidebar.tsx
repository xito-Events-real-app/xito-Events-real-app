import { useEffect, useState, useMemo } from "react";
import { HardDrive, RefreshCw, FileVideo, FileImage, Newspaper, TrendingUp, ExternalLink } from "lucide-react";
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

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTimeOnly(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function buildPCloudWebUrl(fullPath: string): string {
  // Remove filename to get folder path, encode for pCloud web
  const parts = fullPath.split('/');
  parts.pop(); // remove file name
  const folderPath = parts.join('/');
  return `https://my.pcloud.com/#page=filemanager&folder=0&path=${encodeURIComponent(folderPath)}`;
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
        body: { action: 'getrecentuploads', params: { path: '/WEDDING TALES NEPAL', limit: 50 } },
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

  // Group uploads by day, sorted newest first
  const groupedByDay = useMemo(() => {
    const sorted = [...uploads].sort((a, b) => 
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );
    const groups = new Map<string, RecentUpload[]>();
    for (const entry of sorted) {
      const label = getDayLabel(entry.modified);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(entry);
    }
    return Array.from(groups.entries());
  }, [uploads]);

  const usedPercent = quota ? Math.round((quota.used / quota.total) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Newspaper className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-black uppercase tracking-wider text-destructive">Breaking News</h2>
        <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0" onClick={fetchRecentUploads} disabled={uploadsLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${uploadsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Storage Stats — compact */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>
              <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={fetchQuota} disabled={quotaLoading}>
                <RefreshCw className={`h-3 w-3 ${quotaLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {quotaLoading && !quota ? (
              <div className="h-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              </div>
            ) : quota ? (
              <div className="space-y-1.5">
                <Progress value={usedPercent} className="h-2" />
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{formatPCloudSize(quota.used)} used</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPCloudSize(quota.free)} free</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Could not load</p>
            )}
          </div>

          {/* News Feed grouped by day */}
          {uploadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No recent uploads</p>
          ) : (
            groupedByDay.map(([dayLabel, entries]) => (
              <div key={dayLabel} className="space-y-1.5">
                {/* Day header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 py-1 bg-card">
                  <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">{dayLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{entries.length}</Badge>
                </div>

                {/* News cards */}
                <div className="space-y-1.5">
                  {entries.map((entry, idx) => {
                    const isVid = isVideo(entry.fileName);
                    const timeStr = getTimeOnly(entry.modified);
                    const headline = entry.clientName
                      ? `${entry.clientName}${entry.eventName ? ` › ${entry.eventName}` : ''}`
                      : 'New file';
                    const pcloudUrl = buildPCloudWebUrl(entry.fullPath);

                    return (
                      <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="p-2.5 space-y-1">
                          {/* Top row: icon + headline + open link */}
                          <div className="flex items-start gap-2">
                            {isVid ? (
                              <FileVideo className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                            ) : (
                              <FileImage className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
                                {headline}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">{entry.fileName}</p>
                            </div>
                            <a
                              href={pcloudUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
                              title="Open folder in pCloud"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                          </div>

                          {/* Bottom row: badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={isVid ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                              {isVid ? '🎬 Video' : '📷 Photo'}
                            </Badge>
                            {entry.size > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                {formatSize(entry.size)}
                              </Badge>
                            )}
                            {entry.category && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                {entry.category}
                              </Badge>
                            )}
                            {timeStr && (
                              <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
