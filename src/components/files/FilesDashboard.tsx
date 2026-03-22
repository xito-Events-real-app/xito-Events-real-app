import { useState, useMemo } from "react";
import { useFilesDashboardData, type DashboardStats } from "@/hooks/useFilesDashboardData";
import { FileDashboardClientSheet } from "./FileDashboardClientSheet";
import { FileRecord } from "@/lib/files-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, RefreshCw, Clock, CheckCircle, AlertTriangle, HardDrive,
  TrendingUp, Activity, Info, ShieldAlert, ShieldCheck, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CardKey = "recent" | "pending" | "backup" | "today";

const STATUS_CARDS: { key: CardKey; label: string; icon: React.ElementType; color: string; glowColor: string }[] = [
  { key: "recent", label: "Recently Copied", icon: CheckCircle, color: "hsl(145,65%,42%)", glowColor: "hsl(145,65%,42%/0.15)" },
  { key: "pending", label: "Files Pending", icon: Clock, color: "hsl(0,84%,60%)", glowColor: "hsl(0,84%,60%/0.15)" },
  { key: "backup", label: "Double Backup Pending", icon: AlertTriangle, color: "hsl(40,95%,50%)", glowColor: "hsl(40,95%,50%/0.15)" },
  { key: "today", label: "Storage Today", icon: HardDrive, color: "hsl(210,90%,55%)", glowColor: "hsl(210,90%,55%/0.15)" },
];

function getStatValue(stats: DashboardStats, key: CardKey): string {
  switch (key) {
    case "recent": return String(stats.recentlyCopied);
    case "pending": return String(stats.filesPending);
    case "backup": return String(stats.doubleBackupPending);
    case "today": return `${stats.storageTodayGB.toFixed(1)} GB`;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function FilesDashboard() {
  const {
    files, stats, activityFeed, insights, isLoading,
    search, setSearch, filterMode, setFilterMode, lastUpdated, refresh,
  } = useFilesDashboardData();

  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCard = filterMode === "all" ? null : filterMode;

  const handleCardClick = (key: CardKey) => {
    setFilterMode(filterMode === key ? "all" : key);
  };

  return (
    <div className="files-dashboard space-y-5 animate-fade-in">
      {/* ─── TOP BAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,15%,45%)]" />
          <Input
            placeholder="Search client, event, freelancer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] text-[hsl(220,15%,90%)] placeholder:text-[hsl(220,15%,40%)] focus-visible:ring-[hsl(210,90%,55%)]"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-[hsl(220,15%,50%)] shrink-0">
          <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-[hsl(220,25%,15%)] transition-colors">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ─── STATUS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_CARDS.map(({ key, label, icon: Icon, color, glowColor }) => {
          const isActive = activeCard === key;
          return (
            <Card
              key={key}
              onClick={() => handleCardClick(key)}
              className={cn(
                "cursor-pointer border-0 transition-all duration-300 hover:scale-[1.02]",
                "bg-[hsl(220,25%,11%)]",
                isActive && "ring-2",
              )}
              style={{
                boxShadow: isActive ? `0 0 20px ${glowColor}` : `0 0 0 transparent`,
                borderColor: isActive ? color : "transparent",
                ...(isActive ? { ringColor: color } : {}),
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: glowColor }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${color}` }}>
                    {label}
                  </p>
                  <p className="text-2xl font-black text-[hsl(220,15%,95%)] tabular-nums">
                    {getStatValue(stats, key)}
                  </p>
                </div>
                <TrendingUp className="w-4 h-4" style={{ color, opacity: 0.4 }} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── FILE TRACKING TABLE ─── */}
      <Card className="border-0 bg-[hsl(220,25%,10%)] overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[hsl(220,15%,85%)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[hsl(210,90%,55%)]" />
            File Tracking
            {filterMode !== "all" && (
              <Badge variant="secondary" className="ml-2 text-[10px] bg-[hsl(220,25%,18%)] text-[hsl(220,15%,70%)]">
                {filterMode}
              </Badge>
            )}
          </h3>
          <span className="text-[10px] text-[hsl(220,15%,45%)]">{files.length} records</span>
        </div>
        <ScrollArea className="max-h-[360px]">
          <Table>
            <TableHeader>
              <TableRow className="border-[hsl(220,20%,16%)] hover:bg-transparent">
                {["Client", "Event", "Date", "Copy", "Backup", "Size", "Updated"].map(h => (
                  <TableHead key={h} className="text-[10px] uppercase tracking-wider text-[hsl(220,15%,45%)] font-semibold py-2">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.slice(0, 50).map(f => {
                const copied = !!f.final_generated_path;
                const hasB2 = !!f.backup_2_path;
                return (
                  <TableRow
                    key={f.id}
                    onClick={() => { setSelectedFile(f); setSheetOpen(true); }}
                    className="cursor-pointer border-[hsl(220,20%,14%)] hover:bg-[hsl(220,25%,13%)] transition-colors"
                  >
                    <TableCell className="text-xs font-medium text-[hsl(220,15%,90%)] max-w-[120px] truncate">{f.client_name || "-"}</TableCell>
                    <TableCell className="text-xs text-[hsl(220,15%,65%)] max-w-[100px] truncate">{f.event_name || "-"}</TableCell>
                    <TableCell className="text-xs text-[hsl(220,15%,55%)] whitespace-nowrap">{f.event_date_ad || "-"}</TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", copied ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,55%)]" : "bg-[hsl(0,84%,60%/0.15)] text-[hsl(0,84%,65%)]")}>
                        {copied ? "DONE" : "PENDING"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", hasB2 ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,55%)]" : "bg-[hsl(40,95%,50%/0.15)] text-[hsl(40,95%,60%)]")}>
                        {hasB2 ? "DOUBLE" : "SINGLE"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[hsl(220,15%,65%)] tabular-nums">{Number(f.size_gb) || 0} GB</TableCell>
                    <TableCell className="text-[10px] text-[hsl(220,15%,45%)] whitespace-nowrap">{timeAgo(f.updated_at)}</TableCell>
                  </TableRow>
                );
              })}
              {files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-[hsl(220,15%,40%)] py-8">
                    {isLoading ? "Loading..." : "No files found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* ─── BOTTOM PANELS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <Card className="border-0 bg-[hsl(220,25%,10%)]">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-[hsl(220,15%,85%)] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[hsl(175,60%,45%)]" />
              Recent Activity
            </h3>
          </div>
          <ScrollArea className="max-h-[220px] px-4 pb-4">
            <div className="space-y-1.5">
              {activityFeed.map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-[hsl(220,20%,14%)] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(145,65%,42%)] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[hsl(220,15%,85%)]">
                      <span className="font-semibold">{a.clientName}</span>{" "}
                      <span className="text-[hsl(220,15%,55%)]">— {a.action}</span>
                    </p>
                    <p className="text-[10px] text-[hsl(220,15%,40%)]">{timeAgo(a.timestamp)}</p>
                  </div>
                </div>
              ))}
              {activityFeed.length === 0 && (
                <p className="text-xs text-[hsl(220,15%,40%)] py-4 text-center">No recent activity</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Insights */}
        <Card className="border-0 bg-[hsl(220,25%,10%)]">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-[hsl(220,15%,85%)] flex items-center gap-2">
              <Info className="w-4 h-4 text-[hsl(270,60%,60%)]" />
              Insights & Warnings
            </h3>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {insights.map((item, i) => {
              const Icon = item.type === "warning" ? ShieldAlert : item.type === "success" ? ShieldCheck : Info;
              const colors = {
                warning: { bg: "hsl(40,95%,50%/0.1)", text: "hsl(40,95%,60%)", icon: "hsl(40,95%,50%)" },
                success: { bg: "hsl(145,65%,42%/0.1)", text: "hsl(145,65%,55%)", icon: "hsl(145,65%,42%)" },
                info: { bg: "hsl(210,90%,55%/0.1)", text: "hsl(210,90%,65%)", icon: "hsl(210,90%,55%)" },
              }[item.type];
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: colors.bg }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: colors.icon }} />
                  <p className="text-xs font-medium" style={{ color: colors.text }}>{item.message}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Client detail sheet */}
      <FileDashboardClientSheet
        file={selectedFile}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={refresh}
      />
    </div>
  );
}
