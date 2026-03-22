import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFilesDashboardData, type DashboardStats, type FilterMode } from "@/hooks/useFilesDashboardData";
import { FileDashboardClientSheet } from "./FileDashboardClientSheet";
import { FileRecord } from "@/lib/files-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, RefreshCw, CheckCircle, Clock, AlertTriangle, HardDrive,
  TrendingUp, Activity, Info, ShieldAlert, ShieldCheck, CalendarDays, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import NepaliDateFilter from "@/components/booked/NepaliDateFilter";

interface CardDef {
  key: string;
  filterMode: FilterMode;
  label: string;
  icon: React.ElementType;
  color: string;
  glowColor: string;
}

const STATUS_CARDS: CardDef[] = [
  { key: "today", filterMode: "today", label: "Today's Transfers", icon: CheckCircle, color: "hsl(145,65%,42%)", glowColor: "hsl(145,65%,42%/0.15)" },
  { key: "copied", filterMode: "copied", label: "Total Copied", icon: HardDrive, color: "hsl(210,90%,55%)", glowColor: "hsl(210,90%,55%/0.15)" },
  { key: "pending", filterMode: "pending", label: "Files Pending", icon: Clock, color: "hsl(0,84%,60%)", glowColor: "hsl(0,84%,60%/0.15)" },
  { key: "backup", filterMode: "backup_done", label: "Double Backup", icon: AlertTriangle, color: "hsl(40,95%,50%)", glowColor: "hsl(40,95%,50%/0.15)" },
];

function getCardDisplay(stats: DashboardStats, key: string): { primary: string; secondary?: string } {
  switch (key) {
    case "today":
      return { primary: String(stats.todayCopied), secondary: `${stats.todayCopiedGB.toFixed(1)} GB` };
    case "copied":
      return { primary: String(stats.totalCopied), secondary: `${stats.totalCopiedGB.toFixed(1)} GB` };
    case "pending":
      return { primary: String(stats.filesPending) };
    case "backup":
      return { primary: `${stats.doubleBackupDone} Done`, secondary: `${stats.doubleBackupRemaining} Left` };
    default:
      return { primary: "0" };
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
  const navigate = useNavigate();
  const {
    files, allFiles, stats, activityFeed, insights, isLoading,
    search, setSearch, filterMode, setFilterMode, lastUpdated, refresh,
  } = useFilesDashboardData();

  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sub-filter state
  const [subMonth, setSubMonth] = useState<string | null>(null);
  const [subDevice, setSubDevice] = useState<string | null>(null);

  // Nepali date filter for table
  const [tableFilterYear, setTableFilterYear] = useState<number | null>(null);
  const [tableFilterMonth, setTableFilterMonth] = useState<number | null>(null);

  // Click-filter state for table columns
  const [clickFilterEvent, setClickFilterEvent] = useState<string | null>(null);
  const [clickFilterFreelancer, setClickFilterFreelancer] = useState<string | null>(null);
  const [clickFilterRole, setClickFilterRole] = useState<string | null>(null);
  const [clickFilterDevice, setClickFilterDevice] = useState<string | null>(null);

  // Reset sub-filters when main filter changes
  useEffect(() => {
    setSubMonth(null);
    setSubDevice(null);
  }, [filterMode]);

  // Restore scroll on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("files_dashboard_scroll");
    if (saved) {
      setTimeout(() => window.scrollTo(0, Number(saved)), 100);
      sessionStorage.removeItem("files_dashboard_scroll");
    }
  }, []);

  const navigateToClient = (f: FileRecord) => {
    sessionStorage.setItem("files_dashboard_scroll", String(window.scrollY));
    sessionStorage.setItem("files_dashboard_search", search);
    sessionStorage.setItem("files_dashboard_filter", filterMode);
    navigate(`/files/client/${encodeURIComponent(f.registered_date_time_ad)}`);
  };

  // Compute available sub-filter options from currently filtered files
  const subFilterOptions = useMemo(() => {
    const months = new Set<string>();
    const devices = new Set<string>();
    const events = new Set<string>();
    for (const f of files) {
      if (f.event_month && f.event_year) months.add(`${f.event_year}-${f.event_month}`);
      if (f.backup_1_device_name) devices.add(f.backup_1_device_name);
      if (f.event_name) events.add(f.event_name);
    }
    return {
      months: Array.from(months).sort().reverse(),
      devices: Array.from(devices).sort(),
      events: Array.from(events).sort(),
    };
  }, [files]);

  // Apply sub-filters on top of main filter
  const displayFiles = useMemo(() => {
    let result = files;
    if (subMonth) {
      const [y, m] = subMonth.split("-");
      result = result.filter(f => f.event_year === y && f.event_month === m);
    }
    if (subDevice) {
      result = result.filter(f => f.backup_1_device_name === subDevice);
    }
    // Apply Nepali date table filter
    if (tableFilterYear !== null) {
      result = result.filter(f => f.event_year === String(tableFilterYear));
    }
    if (tableFilterMonth !== null) {
      result = result.filter(f => f.event_month === String(tableFilterMonth));
    }
    // Apply click-filters
    if (clickFilterEvent) {
      result = result.filter(f => f.event_name === clickFilterEvent);
    }
    if (clickFilterFreelancer) {
      result = result.filter(f => f.freelancer_name === clickFilterFreelancer);
    }
    if (clickFilterRole) {
      result = result.filter(f => f.freelancer_type === clickFilterRole);
    }
    if (clickFilterDevice) {
      result = result.filter(f => f.backup_1_device_name === clickFilterDevice);
    }
    return result;
  }, [files, subMonth, subDevice, tableFilterYear, tableFilterMonth, clickFilterEvent, clickFilterFreelancer, clickFilterRole, clickFilterDevice]);

  const handleCardClick = (card: CardDef) => {
    if (card.key === "backup") {
      if (filterMode === "backup_done") {
        setFilterMode("backup_remaining");
      } else if (filterMode === "backup_remaining") {
        setFilterMode("all");
      } else {
        setFilterMode("backup_done");
      }
    } else {
      setFilterMode(filterMode === card.filterMode ? "all" : card.filterMode);
    }
  };

  const isCardActive = (card: CardDef) => {
    if (card.key === "backup") return filterMode === "backup_done" || filterMode === "backup_remaining";
    return filterMode === card.filterMode;
  };

  const showSubFilters = filterMode !== "all";
  const showDeviceFilter = filterMode === "copied" || filterMode === "backup_done" || filterMode === "backup_remaining";
  const showMonthFilter = filterMode !== "all";

  const hasClickFilters = !!(clickFilterEvent || clickFilterFreelancer || clickFilterRole || clickFilterDevice);

  const toggleClickFilter = (setter: React.Dispatch<React.SetStateAction<string | null>>, current: string | null, value: string) => {
    setter(current === value ? null : value);
  };

  const isPhotoType = (type: string | null) => {
    if (!type) return false;
    const t = type.toUpperCase();
    return t === "PB" || t === "PG" || t.includes("PHOTO");
  };

  const isVideoType = (type: string | null) => {
    if (!type) return false;
    const t = type.toUpperCase();
    return t === "VB" || t === "VG" || t.includes("VIDEO");
  };

  return (
    <div className="files-dashboard space-y-5 animate-fade-in">
      {/* ─── TOP BAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search client, event, freelancer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-[hsl(220,25%,15%)] transition-colors">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ─── STATUS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_CARDS.map((card) => {
          const active = isCardActive(card);
          const display = getCardDisplay(stats, card.key);
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              onClick={() => handleCardClick(card)}
              className={cn(
                "cursor-pointer border-0 transition-all duration-300 hover:scale-[1.02]",
                "bg-[hsl(220,25%,11%)]",
                active && "ring-2",
              )}
              style={{
                boxShadow: active ? `0 0 20px ${card.glowColor}` : `0 0 0 transparent`,
                borderColor: active ? card.color : "transparent",
                ...(active ? { ringColor: card.color } : {}),
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: card.glowColor }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: card.color }}>
                    {card.label}
                    {card.key === "backup" && filterMode === "backup_remaining" && (
                      <span className="ml-1 text-destructive">• Remaining</span>
                    )}
                    {card.key === "backup" && filterMode === "backup_done" && (
                      <span className="ml-1 text-[hsl(145,65%,55%)]">• Done</span>
                    )}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-black text-foreground tabular-nums leading-tight">
                      {display.primary}
                    </p>
                    {display.secondary && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {display.secondary}
                      </p>
                    )}
                  </div>
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: card.color, opacity: 0.4 }} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── SUB-FILTERS BAR ─── */}
      {(showSubFilters || hasClickFilters) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Filters:</span>

          {/* Backup sub-mode toggle */}
          {(filterMode === "backup_done" || filterMode === "backup_remaining") && (
            <div className="flex gap-1">
              <button
                onClick={() => setFilterMode("backup_done")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-full transition-all",
                  filterMode === "backup_done"
                    ? "bg-[hsl(145,65%,42%/0.2)] text-[hsl(145,65%,55%)] ring-1 ring-[hsl(145,65%,42%)]"
                    : "bg-[hsl(220,25%,15%)] text-muted-foreground hover:bg-[hsl(220,25%,18%)]"
                )}
              >
                Done ({stats.doubleBackupDone})
              </button>
              <button
                onClick={() => setFilterMode("backup_remaining")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-full transition-all",
                  filterMode === "backup_remaining"
                    ? "bg-destructive/20 text-destructive ring-1 ring-destructive"
                    : "bg-[hsl(220,25%,15%)] text-muted-foreground hover:bg-[hsl(220,25%,18%)]"
                )}
              >
                Remaining ({stats.doubleBackupRemaining})
              </button>
            </div>
          )}

          {/* Month pills */}
          {showMonthFilter && subFilterOptions.months.length > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="max-w-[400px] overflow-x-auto">
                <div className="flex gap-1">
                  {subFilterOptions.months.map(m => (
                    <button
                      key={m}
                      onClick={() => setSubMonth(subMonth === m ? null : m)}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all",
                        subMonth === m
                          ? "bg-primary/20 text-primary ring-1 ring-primary"
                          : "bg-[hsl(220,25%,15%)] text-muted-foreground hover:bg-[hsl(220,25%,18%)]"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Device pills */}
          {showDeviceFilter && subFilterOptions.devices.length > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="max-w-[300px] overflow-x-auto">
                <div className="flex gap-1">
                  {subFilterOptions.devices.map(d => (
                    <button
                      key={d}
                      onClick={() => setSubDevice(subDevice === d ? null : d)}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all",
                        subDevice === d
                          ? "bg-accent/20 text-accent-foreground ring-1 ring-accent"
                          : "bg-[hsl(220,25%,15%)] text-muted-foreground hover:bg-[hsl(220,25%,18%)]"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Click-filter badges */}
          {clickFilterEvent && (
            <button
              onClick={() => setClickFilterEvent(null)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[hsl(175,60%,45%/0.2)] text-[hsl(175,60%,55%)] ring-1 ring-[hsl(175,60%,45%)] flex items-center gap-1"
            >
              Event: {clickFilterEvent} <X className="w-3 h-3" />
            </button>
          )}
          {clickFilterFreelancer && (
            <button
              onClick={() => setClickFilterFreelancer(null)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[hsl(30,90%,50%/0.2)] text-[hsl(30,90%,60%)] ring-1 ring-[hsl(30,90%,50%)] flex items-center gap-1"
            >
              Freelancer: {clickFilterFreelancer} <X className="w-3 h-3" />
            </button>
          )}
          {clickFilterRole && (
            <button
              onClick={() => setClickFilterRole(null)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[hsl(270,60%,60%/0.2)] text-[hsl(270,60%,70%)] ring-1 ring-[hsl(270,60%,60%)] flex items-center gap-1"
            >
              Role: {clickFilterRole} <X className="w-3 h-3" />
            </button>
          )}
          {clickFilterDevice && (
            <button
              onClick={() => setClickFilterDevice(null)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[hsl(210,90%,55%/0.2)] text-[hsl(210,90%,65%)] ring-1 ring-[hsl(210,90%,55%)] flex items-center gap-1"
            >
              Device: {clickFilterDevice} <X className="w-3 h-3" />
            </button>
          )}

          {/* Clear all */}
          {(subMonth || subDevice || hasClickFilters) && (
            <button
              onClick={() => { setSubMonth(null); setSubDevice(null); setClickFilterEvent(null); setClickFilterFreelancer(null); setClickFilterRole(null); setClickFilterDevice(null); }}
              className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[hsl(220,25%,15%)] text-destructive hover:bg-destructive/15 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
      )}

      {/* ─── FILE TRACKING TABLE ─── */}
      <Card className="border-0 bg-[hsl(220,25%,10%)] overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              File Tracking
              {filterMode !== "all" && (
                <Badge variant="secondary" className="ml-2 text-[10px] bg-[hsl(220,25%,18%)] text-muted-foreground">
                  {filterMode.replace("_", " ")}
                </Badge>
              )}
            </h3>
            <span className="text-[10px] text-muted-foreground">{displayFiles.length} records</span>
          </div>
          <NepaliDateFilter
            selectedYear={tableFilterYear}
            selectedMonth={tableFilterMonth}
            onYearChange={setTableFilterYear}
            onMonthChange={setTableFilterMonth}
            onReset={() => { setTableFilterYear(null); setTableFilterMonth(null); }}
          />
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[hsl(220,25%,10%)]">
                <TableRow className="border-[hsl(220,20%,16%)] hover:bg-transparent">
                  {["Client", "Event", "Date", "Freelancer", "Role", "Card", "Copy", "Backup", "Size", "Storage", "Updated"].map(h => (
                    <TableHead key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-2 whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayFiles.map(f => {
                  const copied = !!f.final_generated_path;
                  const hasB2 = !!f.backup_2_path;
                  const nepaliDate = f.event_month && f.event_year
                    ? `${nepaliMonthsEnglish[parseInt(f.event_month) - 1] || f.event_month} ${f.event_day || ""}`
                    : "-";
                  const photo = isPhotoType(f.freelancer_type);
                  const video = isVideoType(f.freelancer_type);
                  return (
                    <TableRow
                      key={f.id}
                      onClick={() => { setSelectedFile(f); setSheetOpen(true); }}
                      className={cn(
                        "cursor-pointer border-[hsl(220,20%,14%)] hover:bg-[hsl(220,25%,13%)] transition-colors border-l-2",
                        photo && "border-l-blue-500/50",
                        video && "border-l-purple-500/50",
                        !photo && !video && "border-l-transparent",
                      )}
                    >
                      <TableCell
                        className="text-xs font-medium text-primary whitespace-nowrap cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigateToClient(f); }}
                      >{f.client_name || "-"}</TableCell>
                      <TableCell
                        className="text-xs text-foreground whitespace-nowrap cursor-pointer hover:underline hover:text-[hsl(175,60%,55%)]"
                        onClick={(e) => { e.stopPropagation(); toggleClickFilter(setClickFilterEvent, clickFilterEvent, f.event_name || ""); }}
                      >{f.event_name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{nepaliDate}</TableCell>
                      <TableCell
                        className="text-xs text-foreground whitespace-nowrap cursor-pointer hover:underline hover:text-[hsl(30,90%,60%)]"
                        onClick={(e) => { e.stopPropagation(); toggleClickFilter(setClickFilterFreelancer, clickFilterFreelancer, f.freelancer_name || ""); }}
                      >{f.freelancer_name || "-"}</TableCell>
                      <TableCell
                        className={cn(
                          "text-[10px] uppercase whitespace-nowrap cursor-pointer hover:underline",
                          photo ? "text-blue-400" : video ? "text-purple-400" : "text-muted-foreground"
                        )}
                        onClick={(e) => { e.stopPropagation(); toggleClickFilter(setClickFilterRole, clickFilterRole, f.freelancer_type || ""); }}
                      >{f.freelancer_type || "-"}</TableCell>
                      <TableCell className="text-xs text-foreground">{f.card_label || "-"}</TableCell>
                      <TableCell>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", copied ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,55%)]" : "bg-destructive/15 text-destructive")}>
                          {copied ? "DONE" : "PENDING"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", hasB2 ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,55%)]" : "bg-[hsl(40,95%,50%/0.15)] text-[hsl(40,95%,60%)]")}>
                          {hasB2 ? "DOUBLE" : "SINGLE"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground tabular-nums">{Number(f.size_gb) || 0} GB</TableCell>
                      <TableCell
                        className="text-xs text-foreground whitespace-nowrap cursor-pointer hover:underline hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); toggleClickFilter(setClickFilterDevice, clickFilterDevice, f.backup_1_device_name || ""); }}
                      >{f.backup_1_device_name || "-"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(f.updated_at)}</TableCell>
                    </TableRow>
                  );
                })}
                {displayFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No files found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* ─── BOTTOM PANELS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <Card className="border-0 bg-[hsl(220,25%,10%)]">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[hsl(175,60%,45%)]" />
              Recent Activity
            </h3>
          </div>
          <ScrollArea className="max-h-[220px] px-4 pb-4">
            <div className="space-y-1.5">
              {activityFeed.map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(145,65%,42%)] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">{a.clientName}</span>{" "}
                      <span className="text-muted-foreground">— {a.action}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(a.timestamp)}</p>
                  </div>
                </div>
              ))}
              {activityFeed.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No recent activity</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Insights */}
        <Card className="border-0 bg-[hsl(220,25%,10%)]">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
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

      <FileDashboardClientSheet
        file={selectedFile}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={refresh}
      />
    </div>
  );
}
