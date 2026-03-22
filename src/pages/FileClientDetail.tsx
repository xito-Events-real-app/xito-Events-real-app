import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileRecord, StorageDevice, getStorageDevices, updateFileRecord } from "@/lib/files-api";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilePathBuilderDialog } from "@/components/files/FilePathBuilderDialog";
import { ReconfirmationDialog } from "@/components/files/ReconfirmationDialog";
import {
  ArrowLeft, CheckCircle, Clock, AlertTriangle, HardDrive,
  FolderOpen, ShieldCheck, FileText,
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

interface FreelancerAssignmentRow {
  event: string;
  event_date_ad: string;
  photographer_bride: string;
  photographer_groom: string;
  videographer_bride: string;
  videographer_groom: string;
  extra_photographer: string;
  extra_videographer: string;
  assistant: string;
  iphone_shooter: string;
  drone_operator: string;
  fpv_operator: string;
}

export default function FileClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const registeredDateTimeAD = decodeURIComponent(clientId || "");

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [assignments, setAssignments] = useState<FreelancerAssignmentRow[]>([]);
  const [devices, setDevices] = useState<StorageDevice[]>([]);
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [pathDialogFile, setPathDialogFile] = useState<FileRecord | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogFile, setConfirmDialogFile] = useState<FileRecord | null>(null);

  const fetchData = useCallback(async () => {
    if (!registeredDateTimeAD) return;
    setIsLoading(true);
    try {
      const [filesRes, assignRes, devicesData] = await Promise.all([
        supabase
          .from("files_management")
          .select("*")
          .eq("registered_date_time_ad", registeredDateTimeAD)
          .eq("deleted_or_not", false)
          .order("event_name"),
        supabase
          .from("freelancer_assignments")
          .select("*")
          .eq("registered_date_time_ad", registeredDateTimeAD),
        getStorageDevices(),
      ]);
      const fileRows = (filesRes.data as FileRecord[]) || [];
      setFiles(fileRows);
      setAssignments((assignRes.data as FreelancerAssignmentRow[]) || []);
      setDevices(devicesData);
      if (fileRows.length > 0) setClientName(fileRows[0].client_name || "");
      else {
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

  // Computed stats
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

  // Group files by event
  const eventGroups = useMemo(() => {
    const map = new Map<string, { eventName: string; eventDate: string; year: string; month: string; day: string; files: FileRecord[] }>();
    for (const f of files) {
      const key = `${f.event_name}__${f.event_date_ad}`;
      if (!map.has(key)) {
        map.set(key, { eventName: f.event_name, eventDate: f.event_date_ad, year: f.event_year, month: f.event_month, day: f.event_day, files: [] });
      }
      map.get(key)!.files.push(f);
    }
    return Array.from(map.values());
  }, [files]);

  const handleUpdate = async (id: string, updates: Partial<FileRecord>) => {
    await updateFileRecord(id, { ...updates, synced_to_sheet: false } as any);
    scheduleFilesPush();
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleConfirm = async (fileId: string) => {
    await handleUpdate(fileId, { confirmed: true, reconfirmation: true } as any);
  };

  const openPathDialog = (file: FileRecord) => {
    setPathDialogFile(file);
    setPathDialogOpen(true);
  };

  const openConfirmDialog = (file: FileRecord) => {
    setConfirmDialogFile(file);
    setConfirmDialogOpen(true);
  };

  return (
    <div className="files-dashboard min-h-screen bg-[hsl(220,25%,8%)] text-[hsl(220,15%,90%)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[hsl(220,25%,10%)]/95 backdrop-blur border-b border-[hsl(220,20%,16%)]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/files")} className="text-[hsl(220,15%,70%)] hover:text-[hsl(220,15%,95%)]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{clientName}</h1>
            <p className="text-xs text-[hsl(220,15%,50%)]">File Management Detail</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5 animate-fade-in">
        {isLoading ? (
          <div className="text-center py-20 text-[hsl(220,15%,45%)]">Loading...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Size", value: `${stats.totalSize.toFixed(1)} GB`, sub: `Photo: ${stats.photoSize.toFixed(1)} | Video: ${stats.videoSize.toFixed(1)}`, icon: HardDrive, color: "hsl(210,90%,55%)", glow: "hsl(210,90%,55%/0.15)" },
                { label: "Copied", value: `${stats.copiedSize.toFixed(1)} GB`, sub: `${files.filter(f => !!f.final_generated_path).length} files done`, icon: CheckCircle, color: "hsl(145,65%,42%)", glow: "hsl(145,65%,42%/0.15)" },
                { label: "Remaining", value: String(stats.remaining), sub: "files to copy", icon: Clock, color: "hsl(0,84%,60%)", glow: "hsl(0,84%,60%/0.15)" },
                { label: "Double Backup", value: `${stats.doubleBackupDone} / ${files.length}`, sub: stats.doubleBackupPending > 0 ? `${stats.doubleBackupPending} pending` : "All done", icon: stats.doubleBackupPending > 0 ? AlertTriangle : ShieldCheck, color: stats.doubleBackupPending > 0 ? "hsl(40,95%,50%)" : "hsl(145,65%,42%)", glow: stats.doubleBackupPending > 0 ? "hsl(40,95%,50%/0.15)" : "hsl(145,65%,42%/0.15)" },
              ].map((c, i) => (
                <Card key={i} className="border-0 bg-[hsl(220,25%,11%)]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: c.glow }}>
                      <c.icon className="w-5 h-5" style={{ color: c.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: c.color }}>{c.label}</p>
                      <p className="text-xl font-black tabular-nums">{c.value}</p>
                      <p className="text-[10px] text-[hsl(220,15%,45%)]">{c.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Event Sections */}
            {eventGroups.map((group, gi) => (
              <Card key={gi} className="border-0 bg-[hsl(220,25%,10%)] overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[hsl(210,90%,55%)]" />
                    {group.eventName || "Event"}
                    <Badge variant="secondary" className="ml-1 text-[10px] bg-[hsl(220,25%,18%)] text-[hsl(220,15%,70%)]">
                      {formatNepaliDate(group.year, group.month, group.day)}
                    </Badge>
                  </h3>
                  <span className="text-[10px] text-[hsl(220,15%,45%)]">{group.files.length} files</span>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[hsl(220,20%,16%)] hover:bg-transparent">
                        {["Freelancer", "Type", "Side", "Format", "Size", "Items", "Copy", "Backup", "Who Copied", "Path", "Actions"].map(h => (
                          <TableHead key={h} className="text-[10px] uppercase tracking-wider text-[hsl(220,15%,45%)] font-semibold py-2">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.files.map(f => {
                        const copied = !!f.final_generated_path;
                        const hasB2 = !!f.backup_2_path;
                        return (
                          <TableRow key={f.id} className="border-[hsl(220,20%,14%)] hover:bg-[hsl(220,25%,13%)]">
                            <TableCell className="text-xs font-medium max-w-[100px] truncate">{f.freelancer_name || "-"}</TableCell>
                            <TableCell className="text-xs text-[hsl(220,15%,65%)]">{f.freelancer_type || "-"}</TableCell>
                            <TableCell className="text-xs text-[hsl(220,15%,65%)]">{f.side || "-"}</TableCell>
                            <TableCell className="text-xs text-[hsl(220,15%,65%)]">{f.format_type || "-"}</TableCell>
                            <TableCell>
                              <Input
                                value={f.size_gb || ""}
                                onChange={e => handleUpdate(f.id, { size_gb: Number(e.target.value) || 0 } as any)}
                                className="h-7 w-16 text-xs bg-[hsl(220,25%,14%)] border-[hsl(220,20%,20%)] text-[hsl(220,15%,90%)]"
                                type="number"
                                step="0.1"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={f.number_of_items || ""}
                                onChange={e => handleUpdate(f.id, { number_of_items: Number(e.target.value) || 0 } as any)}
                                className="h-7 w-14 text-xs bg-[hsl(220,25%,14%)] border-[hsl(220,20%,20%)] text-[hsl(220,15%,90%)]"
                                type="number"
                              />
                            </TableCell>
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
                            <TableCell className="text-[10px] text-[hsl(220,15%,55%)]">
                              {f.who_copied || "-"}
                              {f.backup_1_recorded_at && <div className="text-[hsl(220,15%,40%)]">{timeAgo(f.backup_1_recorded_at)}</div>}
                            </TableCell>
                            <TableCell className="text-[10px] text-[hsl(220,15%,55%)] max-w-[120px] truncate" title={f.final_generated_path || ""}>
                              {f.final_generated_path || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openPathDialog(f)} className="h-6 px-2 text-[10px] text-[hsl(210,90%,55%)] hover:text-[hsl(210,90%,70%)]">
                                  <FolderOpen className="w-3 h-3 mr-1" />
                                  Path
                                </Button>
                                {copied && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openConfirmDialog(f)}
                                    className={cn("h-6 px-2 text-[10px]", f.confirmed ? "text-[hsl(145,65%,55%)]" : "text-[hsl(40,95%,55%)]")}
                                  >
                                    {f.confirmed ? "CONFIRMED" : "CONFIRM"}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            ))}

            {files.length === 0 && (
              <div className="text-center py-16 text-[hsl(220,15%,40%)]">
                <p className="text-lg font-semibold mb-1">No file records found</p>
                <p className="text-sm">This client has no file management entries yet.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={pathDialogFile}
        devices={devices}
        onSave={async (updates) => {
          if (pathDialogFile) {
            await handleUpdate(pathDialogFile.id, updates);
          }
        }}
        allFiles={files}
        onRefresh={fetchData}
      />
      <ReconfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        file={confirmDialogFile}
        onConfirm={handleConfirm}
        alreadyConfirmed={confirmDialogFile?.confirmed}
      />
    </div>
  );
}