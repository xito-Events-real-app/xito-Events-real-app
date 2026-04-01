import { useEffect, useState, useMemo, useCallback } from "react";
import { Newspaper, RefreshCw, FileVideo, ImageIcon, TrendingUp, FolderOpen, Camera, User, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ActivityEntry {
  id: string;
  created_at: string;
  action_type: string;
  folder_path: string;
  client_name: string;
  event_name: string;
  photographer: string;
  file_count: number;
  total_size_bytes: number;
  file_name: string;
  is_video: boolean;
}

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'wmv', 'flv'];

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

/** Grouped display entry — photos are merged by folder, videos stay individual */
interface DisplayEntry {
  key: string;
  isVideo: boolean;
  clientName: string;
  eventName: string;
  photographer: string;
  folderPath: string;
  fileName: string; // only for videos
  fileCount: number;
  totalSize: number;
  latestTime: string;
  actionType: string;
}

function groupEntries(entries: ActivityEntry[]): DisplayEntry[] {
  const videoEntries: DisplayEntry[] = [];
  const photoGroups = new Map<string, DisplayEntry>();

  for (const e of entries) {
    if (e.is_video) {
      videoEntries.push({
        key: e.id,
        isVideo: true,
        clientName: e.client_name,
        eventName: e.event_name,
        photographer: e.photographer,
        folderPath: e.folder_path,
        fileName: e.file_name,
        fileCount: 1,
        totalSize: e.total_size_bytes,
        latestTime: e.created_at,
        actionType: e.action_type,
      });
    } else {
      // Group photos by folder_path
      const groupKey = `${e.folder_path}`;
      const existing = photoGroups.get(groupKey);
      if (existing) {
        existing.fileCount += e.file_count || 1;
        existing.totalSize += e.total_size_bytes;
        if (e.created_at > existing.latestTime) existing.latestTime = e.created_at;
      } else {
        photoGroups.set(groupKey, {
          key: groupKey,
          isVideo: false,
          clientName: e.client_name,
          eventName: e.event_name,
          photographer: e.photographer,
          folderPath: e.folder_path,
          fileName: '',
          fileCount: e.file_count || 1,
          totalSize: e.total_size_bytes,
          latestTime: e.created_at,
          actionType: e.action_type,
        });
      }
    }
  }

  const all = [...videoEntries, ...Array.from(photoGroups.values())];
  all.sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
  return all;
}

export function XitoActivitySidebar() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("xito_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setEntries((data as ActivityEntry[]) || []);
    } catch (err) {
      console.warn("Failed to fetch xito activity:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const displayEntries = useMemo(() => groupEntries(entries), [entries]);

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, DisplayEntry[]>();
    for (const entry of displayEntries) {
      const label = getDayLabel(entry.latestTime);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(entry);
    }
    return Array.from(groups.entries());
  }, [displayEntries]);

  return (
    <div className="w-full h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Newspaper className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-black uppercase tracking-wider text-destructive">Breaking News</h2>
        <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0" onClick={fetchActivity} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">No activity yet</p>
              <p className="text-[10px] text-muted-foreground/60">Upload files to see news here</p>
            </div>
          ) : (
            groupedByDay.map(([dayLabel, items]) => (
              <div key={dayLabel} className="space-y-1.5">
                {/* Day header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 py-1 bg-card">
                  <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">{dayLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{items.length}</Badge>
                </div>

                {/* News cards */}
                <div className="space-y-1.5">
                  {items.map((entry) => {
                    const timeStr = getTimeOnly(entry.latestTime);
                    const headline = entry.clientName
                      ? `${entry.clientName}${entry.eventName ? ` › ${entry.eventName}` : ''}`
                      : entry.folderPath.split('/').filter(Boolean).slice(0, 2).join(' › ') || 'Upload';

                    return (
                      <div key={entry.key} className="rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="p-2.5 space-y-1.5">
                          {/* Top row: icon + headline */}
                          <div className="flex items-start gap-2">
                            {entry.isVideo ? (
                              <div className="p-1 rounded-md bg-violet-500/10 shrink-0 mt-0.5">
                                <FileVideo className="h-3.5 w-3.5 text-violet-500" />
                              </div>
                            ) : (
                              <div className="p-1 rounded-md bg-emerald-500/10 shrink-0 mt-0.5">
                                <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
                                {headline}
                              </p>
                              {entry.isVideo ? (
                                <p className="text-[10px] text-muted-foreground truncate">{entry.fileName}</p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {entry.fileCount} photo{entry.fileCount !== 1 ? 's' : ''} uploaded
                                  {entry.photographer && ` by ${entry.photographer}`}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={entry.isVideo ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                              {entry.isVideo ? '🎬 Video' : `📷 ${entry.fileCount}`}
                            </Badge>
                            {entry.totalSize > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                {formatSize(entry.totalSize)}
                              </Badge>
                            )}
                            {entry.photographer && !entry.isVideo && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                <Camera className="h-2.5 w-2.5 mr-0.5" />{entry.photographer}
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
