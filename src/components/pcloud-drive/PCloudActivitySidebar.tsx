import { useEffect, useState } from "react";
import { Cloud, HardDrive, Activity, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getPCloudQuota, formatPCloudSize, PCloudQuota } from "@/lib/pcloud-api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecentActivity {
  id: string;
  client_name: string;
  event_name: string;
  photographer_name: string;
  file_size_bytes: number;
  created_at: string;
  file_type: string;
}

export function PCloudActivitySidebar() {
  const [quota, setQuota] = useState<PCloudQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

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

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const { data } = await supabase
        .from("edited_files")
        .select("id, client_name, event_name, photographer_name, file_size_bytes, created_at, file_type")
        .or("storage_type.eq.pcloud,pcloud_file_id.not.is.null")
        .order("created_at", { ascending: false })
        .limit(20);
      setActivities((data as RecentActivity[]) || []);
    } catch {
      // ignore
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    fetchActivities();
  }, []);

  const usedPercent = quota ? Math.round((quota.used / quota.total) * 100) : 0;

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

          {/* Recent Changes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Changes</span>
            </div>

            {activitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent pCloud uploads</p>
            ) : (
              <div className="space-y-1.5">
                {activities.map(a => {
                  const timeAgo = getTimeAgo(a.created_at);
                  return (
                    <div key={a.id} className="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {a.client_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {a.event_name} : {a.photographer_name} : {formatPCloudSize(a.file_size_bytes)}
                          </p>
                        </div>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${a.file_type === 'photo' ? 'bg-emerald-500' : 'bg-violet-500'}`} />
                        <span className="text-[9px] text-muted-foreground capitalize">{a.file_type} upload</span>
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
