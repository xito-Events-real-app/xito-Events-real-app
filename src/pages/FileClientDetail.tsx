import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileRecord } from "@/lib/files-api";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, CheckCircle, Clock, AlertTriangle, HardDrive,
  FileText, ShieldCheck, ExternalLink,
} from "lucide-react";

function formatNepaliDate(year?: string, month?: string, day?: string): string {
  if (!year || !month) return "-";
  const mIdx = parseInt(String(month));
  const mName = mIdx >= 1 && mIdx <= 12 ? nepaliMonthsEnglish[mIdx - 1] : month;
  return `${mName} ${day || "?"}, ${year}`;
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

export default function FileClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const registeredDateTimeAD = decodeURIComponent(clientId || "");

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!registeredDateTimeAD) return;
    setIsLoading(true);
    try {
      const { data: fileRows } = await supabase
        .from("files_management")
        .select("*")
        .eq("registered_date_time_ad", registeredDateTimeAD)
        .eq("deleted_or_not", false)
        .order("event_name");

      const rows = (fileRows as FileRecord[]) || [];
      setFiles(rows);

      if (rows.length > 0) {
        setClientName(rows[0].client_name || "");
      } else {
        const { data: clientData } = await supabase
          .from("clients_cache")
          .select("client_name")
          .eq("registered_date_time_ad", registeredDateTimeAD)
          .maybeSingle();
        setClientName(clientData?.client_name || "Client");
      }
    } catch (e) {
      console.error("Failed to load client file data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [registeredDateTimeAD]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const totalSize = files.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    const copiedSize = files.filter(f => !!f.final_generated_path).reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    const remaining = files.filter(f => !f.final_generated_path).length;
    const doubleBackupDone = files.filter(f => !!f.backup_2_path).length;
    const doubleBackupPending = files.filter(f => f.final_generated_path && !f.backup_2_path).length;
    const photoSize = files.filter(f => (f.category || "").toLowerCase().includes("photo")).reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    const videoSize = files.filter(f => (f.category || "").toLowerCase().includes("video")).reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    return { totalSize, copiedSize, remaining, doubleBackupDone, doubleBackupPending, photoSize, videoSize };
  }, [files]);

  const eventGroups = useMemo(() => {
    const map = new Map<string, { eventName: string; year: string; month: string; day: string; files: FileRecord[] }>();
    for (const f of files) {
      const key = `${f.event_name}__${f.event_date_ad}`;
      if (!map.has(key)) {
        map.set(key, { eventName: f.event_name, year: f.event_year, month: f.event_month, day: f.event_day, files: [] });
      }
      map.get(key)!.files.push(f);
    }
    return Array.from(map.values());
  }, [files]);

  const summaryCards = [
    { label: "Total Size", value: `${stats.totalSize.toFixed(1)} GB`, sub: `Photo: ${stats.photoSize.toFixed(1)} | Video: ${stats.videoSize.toFixed(1)}`, icon: HardDrive, colorClass: "text-blue-400", bgClass: "bg-blue-500/15" },
    { label: "Copied", value: `${stats.copiedSize.toFixed(1)} GB`, sub: `${files.filter(f => !!f.final_generated_path).length} files done`, icon: CheckCircle, colorClass: "text-emerald-400", bgClass: "bg-emerald-500/15" },
    { label: "Remaining", value: String(stats.remaining), sub: "files to copy", icon: Clock, colorClass: "text-red-400", bgClass: "bg-red-500/15" },
    { label: "Double Backup", value: `${stats.doubleBackupDone} / ${files.length}`, sub: stats.doubleBackupPending > 0 ? `${stats.doubleBackupPending} pending` : "All done", icon: stats.doubleBackupPending > 0 ? AlertTriangle : ShieldCheck, colorClass: stats.doubleBackupPending > 0 ? "text-yellow-400" : "text-emerald-400", bgClass: stats.doubleBackupPending > 0 ? "bg-yellow-500/15" : "bg-emerald-500/15" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 max-w-[1400px] mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/files")} className="text-slate-400 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white truncate">{clientName}</h1>
            <p className="text-sm text-slate-500">File Management Detail</p>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">Loading...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryCards.map((c, i) => (
                <Card key={i} className="border-slate-800 bg-slate-900">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl shrink-0", c.bgClass)}>
                      <c.icon className={cn("w-6 h-6", c.colorClass)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs uppercase tracking-wider font-semibold mb-1", c.colorClass)}>{c.label}</p>
                      <p className="text-2xl font-black tabular-nums leading-tight text-white">{c.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Event Sections — Table Layout */}
            {eventGroups.map((group, gi) => (
              <div key={gi} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">{group.eventName || "Event"}</h3>
                  <Badge className="text-xs bg-slate-800 text-slate-300 border-slate-700 px-3 py-1">
                    {formatNepaliDate(group.year, group.month, group.day)}
                  </Badge>
                  <span className="text-xs text-slate-500 ml-auto">{group.files.length} files</span>
                </div>

                <Card className="border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="w-[16%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Name</TableHead>
                          <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Type</TableHead>
                          <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Side</TableHead>
                          <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Format</TableHead>
                          <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-right">Size</TableHead>
                          <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-right">Items</TableHead>
                          <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-center">Copy</TableHead>
                          <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-center">Backup</TableHead>
                          <TableHead className="w-[10%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Copied By</TableHead>
                          <TableHead className="w-[24%] text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Path</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.files.map(f => {
                          const copied = !!f.final_generated_path;
                          const hasB2 = !!f.backup_2_path;
                          return (
                            <TableRow key={f.id} className="border-slate-800/50 hover:bg-slate-800/30">
                              <TableCell className="py-3">
                                <span className="text-sm font-semibold text-white truncate block">{f.freelancer_name || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-slate-300">{f.freelancer_type || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-slate-300">{f.side || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-slate-300">{f.format_type || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <span className="text-sm font-medium text-white tabular-nums">{f.size_gb || "0"}</span>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <span className="text-sm font-medium text-white tabular-nums">{f.number_of_items || "0"}</span>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full inline-block",
                                  copied ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                                )}>
                                  {copied ? "DONE" : "PENDING"}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full inline-block",
                                  hasB2 ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"
                                )}>
                                  {hasB2 ? "DOUBLE" : "SINGLE"}
                                </span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-slate-200 block">{f.who_copied || "-"}</span>
                                {f.backup_1_recorded_at && (
                                  <span className="text-[11px] text-slate-500">{timeAgo(f.backup_1_recorded_at)}</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                {copied && f.final_generated_path ? (
                                  <span className="text-xs text-slate-300 break-all leading-relaxed block">{f.final_generated_path}</span>
                                ) : !copied ? (
                                  <button
                                    onClick={() => navigate("/files?section=files")}
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Set Path →
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            ))}

            {files.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-semibold text-slate-400 mb-1">No file records found</p>
                <p className="text-sm">This client has no file management entries yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
