import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ChevronDown, ChevronUp, PenLine, ExternalLink, Clock, X, FolderOpen, HardDrive, Camera, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMonthName } from "@/lib/nepali-months";
import { supabase } from "@/integrations/supabase/client";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "@/components/files/FilePathBuilderDialog";
import { CloudUploadDialog } from "@/components/files/CloudUploadDialog";
import { FileRecord, updateFileRecord, getFileRecords } from "@/lib/files-api";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

const PHOTO_ROLES = ["PB", "PG", "EP"];
const VIDEO_ROLES = ["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"];

const getTimeAgo = (dateStr: string): string => {
  if (!dateStr) return "";
  const then = new Date(dateStr);
  const now = new Date();
  let diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 0) return "just now";
  const days = Math.floor(diff / 86400); diff %= 86400;
  const hrs = Math.floor(diff / 3600); diff %= 3600;
  const mins = Math.floor(diff / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hrs > 0) parts.push(`${hrs}h`);
  parts.push(`${mins}m`);
  return parts.join(" ") + " ago";
};

const BackupPill = ({ path, deviceName, file, backupNum, onDeviceClick }: { path: string; deviceName: string; file: FileRecord; backupNum?: number; onDeviceClick?: (name: string) => void }) => {
  if (!path) return <X className="w-5 h-5 text-red-400 mx-auto" />;
  const label = deviceName || path.split("\\")[0] || "✓";
  const backupTimestamp = backupNum === 1 ? file.backup_1_recorded_at
    : backupNum === 2 ? file.backup_2_recorded_at
    : backupNum === 3 ? file.backup_3_recorded_at
    : null;
  const displayDate = backupTimestamp || file.updated_at || file.created_at;
  const timeAgo = getTimeAgo(displayDate);

  return (
    <HoverCard openDelay={100} closeDelay={300}>
      <HoverCardTrigger asChild>
        <span
          className="inline-flex items-center text-xs px-3 py-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold truncate max-w-[100px] cursor-pointer rounded-md border border-transparent hover:ring-1 hover:ring-emerald-400"
          onClick={(e) => { if (onDeviceClick && deviceName) { e.stopPropagation(); onDeviceClick(deviceName); } }}
        >
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3 space-y-2 text-xs z-[200]" side="top" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{label}</div>
        <div className="bg-muted/50 rounded px-2 py-1.5 font-mono text-[11px] break-all leading-relaxed">{path}</div>
        {displayDate && (
          <div className="text-[11px] font-bold text-foreground">
            {new Date(displayDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            {" "}
            {new Date(displayDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-bold">{timeAgo}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

/** Build a compact summary string for collapsed event view */
const buildEventSummary = (eventFiles: FileRecord[]) => {
  const photoFiles = eventFiles.filter(f => PHOTO_ROLES.includes(f.freelancer_type));
  const videoFiles = eventFiles.filter(f => VIDEO_ROLES.includes(f.freelancer_type));
  const backedUp = eventFiles.filter(f => f.final_generated_path).length;
  const cloudCount = eventFiles.filter(f => f.drive_upload).length;
  const totalSize = eventFiles.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);

  const uniquePhotoNames = [...new Set(photoFiles.map(f => (f.freelancer_name || "").split(" ")[0]).filter(Boolean))];
  const uniqueVideoNames = [...new Set(videoFiles.map(f => (f.freelancer_name || "").split(" ")[0]).filter(Boolean))];

  return { uniquePhotoNames, uniqueVideoNames, backedUp, cloudCount, totalSize: Math.round(totalSize * 100) / 100, total: eventFiles.length };
};

interface EventGroup {
  eventName: string;
  eventDateAD: string;
  eventDay: string;
  eventMonth: string;
  eventYear: string;
  files: FileRecord[];
}

interface ClientFilesSectionProps {
  registeredDateTimeAD: string;
  clientName: string;
}

export default function ClientFilesSection({ registeredDateTimeAD, clientName }: ClientFilesSectionProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string> | null>(null);
  const { devices } = useStorageDevices();

  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [editBackupNumber, setEditBackupNumber] = useState<number | null>(null);
  const [cloudDialogOpen, setCloudDialogOpen] = useState(false);
  const [cloudFile, setCloudFile] = useState<FileRecord | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesFile, setNotesFile] = useState<FileRecord | null>(null);
  const [notesText, setNotesText] = useState("");

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFileRecords({ clientName: undefined });
      const clientFiles = data.filter(f => f.registered_date_time_ad === registeredDateTimeAD);
      setFiles(clientFiles);
    } catch {
      const { data, error } = await (supabase as any)
        .from("files_management")
        .select("*")
        .eq("registered_date_time_ad", registeredDateTimeAD)
        .eq("deleted_or_not", false)
        .order("event_name")
        .order("freelancer_type");
      if (!error && data) setFiles(data);
    } finally {
      setIsLoading(false);
    }
  }, [registeredDateTimeAD]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const eventGroups = useMemo((): EventGroup[] => {
    const map = new Map<string, EventGroup>();
    for (const f of files) {
      const key = `${f.event_name}-${f.event_date_ad}`;
      if (!map.has(key)) {
        map.set(key, {
          eventName: f.event_name || "",
          eventDateAD: f.event_date_ad || "",
          eventDay: f.event_day || "",
          eventMonth: f.event_month || "",
          eventYear: f.event_year || "",
          files: [],
        });
      }
      map.get(key)!.files.push(f);
    }
    const groups = Array.from(map.values()).sort((a, b) => (a.eventDateAD || "").localeCompare(b.eventDateAD || ""));
    return groups;
  }, [files]);

  // Auto-expand all events on load
  useEffect(() => {
    if (eventGroups.length > 0 && expandedEvents === null) {
      const allKeys = new Set(eventGroups.map(g => `${g.eventName}-${g.eventDateAD}`));
      setExpandedEvents(allKeys);
    }
  }, [eventGroups, expandedEvents]);

  const stats = useMemo(() => {
    const total = files.length;
    const remaining = files.filter(f => !f.final_generated_path).length;
    const totalSize = files.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    return { total, remaining, totalSize: Math.round(totalSize * 100) / 100 };
  }, [files]);

  const update = useCallback(async (id: string, updates: Partial<FileRecord>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    await updateFileRecord(id, { ...updates, synced_to_sheet: false });
    scheduleFilesPush();
  }, []);

  const toggleEvent = useCallback((key: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev || []);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const openPathBuilder = (file: FileRecord, backupNum?: number) => {
    setSelectedFile(file);
    setEditBackupNumber(backupNum ?? null);
    setPathDialogOpen(true);
  };

  const openNotesDialog = (file: FileRecord) => {
    setNotesFile(file);
    setNotesText(file.notes || "");
    setNotesDialogOpen(true);
  };

  const saveNotes = async () => {
    if (!notesFile) return;
    await update(notesFile.id, { notes: notesText, synced_to_sheet: false });
    setNotesDialogOpen(false);
    toast.success("Notes saved");
  };

  const handleConfirmedToggle = async (file: FileRecord) => {
    await update(file.id, { confirmed: !file.confirmed, synced_to_sheet: false });
  };

  const getFirstName = (name: string) => (name || "").split(" ")[0];
  const getRemainingCount = (eventFiles: FileRecord[]) => eventFiles.filter(f => !f.final_generated_path).length;

  const FileRowsTable = ({ fileRows }: { fileRows: FileRecord[] }) => {
    if (fileRows.length === 0) return <div className="px-4 py-3 text-xs text-muted-foreground">No file rows</div>;
    const photoFiles = fileRows.filter(f => PHOTO_ROLES.includes(f.freelancer_type));
    const videoFiles = fileRows.filter(f => VIDEO_ROLES.includes(f.freelancer_type));
    const otherFiles = fileRows.filter(f => !PHOTO_ROLES.includes(f.freelancer_type) && !VIDEO_ROLES.includes(f.freelancer_type));

    const renderSection = (label: string, sectionFiles: FileRecord[], headerBg: string) => {
      if (sectionFiles.length === 0) return null;
      return (
        <div className="mb-1">
          <div className={cn("px-3 py-1.5 font-bold text-xs uppercase tracking-wider", headerBg)}>
            {label} ({sectionFiles.length})
          </div>
          <div className="overflow-x-auto">
            <table className="table-fixed w-full text-sm">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead>
                <tr className="bg-white dark:bg-white/10">
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Role</th>
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Side</th>
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Card</th>
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Format</th>
                  <th className="px-2 py-2 text-right font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Size</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">1st</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">2nd</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">3rd</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Cloud</th>
                  <th className="px-2 py-2 text-left font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Who Copied</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Action</th>
                  <th className="px-2 py-2 text-center font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">📝</th>
                </tr>
              </thead>
              <tbody>
                {sectionFiles.map(file => (
                  <tr key={file.id} className="border-b border-border/50 hover:bg-muted/40">
                    <td className="px-2 py-3">
                      <Badge variant="outline" className={cn("text-sm px-3 py-1 font-black border", PHOTO_ROLES.includes(file.freelancer_type) ? "bg-emerald-800 text-emerald-200 border-emerald-600" : VIDEO_ROLES.includes(file.freelancer_type) ? "bg-indigo-800 text-indigo-200 border-indigo-600" : "")}>{file.freelancer_type}</Badge>
                    </td>
                    <td className="px-2 py-3">
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-black text-base text-white cursor-pointer hover:underline">{getFirstName(file.freelancer_name)}</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="font-bold">{file.freelancer_name}</p></TooltipContent>
                      </Tooltip></TooltipProvider>
                    </td>
                    <td className="px-2 py-3 text-sm text-amber-200 font-bold">
                      {file.side === "BRIDE SIDE" ? "BRIDE" : file.side === "GROOM SIDE" ? "GROOM" : file.side || "-"}
                    </td>
                    <td className="px-2 py-3 text-sm text-amber-200 font-bold">CARD {parseInt(file.card_label || "1") || 1}</td>
                    <td className="px-2 py-3 text-sm text-amber-200 font-bold">{file.format_type || "-"}</td>
                    <td className="px-2 py-3 text-right text-sm text-amber-200 font-bold">{file.size_gb ? `${file.size_gb}GB` : "-"}</td>
                    {/* 1st Backup */}
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.final_generated_path || ""} deviceName={file.backup_1_device_name || ""} file={file} backupNum={1} />
                        {file.final_generated_path && (
                          <button onClick={() => openPathBuilder(file, 1)} className="hover:text-primary text-muted-foreground"><PenLine className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                    {/* 2nd Backup */}
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_2_path || ""} deviceName={file.backup_2_device_name || ""} file={file} backupNum={2} />
                        {file.backup_2_path && (
                          <button onClick={() => openPathBuilder(file, 2)} className="hover:text-primary text-muted-foreground"><PenLine className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                    {/* 3rd Backup */}
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_3_path || ""} deviceName={file.backup_3_device_name || ""} file={file} backupNum={3} />
                        {file.backup_3_path && (
                          <button onClick={() => openPathBuilder(file, 3)} className="hover:text-primary text-muted-foreground"><PenLine className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                    {/* Cloud */}
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {file.drive_upload && file.drive_upload_path ? (
                          <span className="inline-flex items-center text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 font-bold truncate max-w-[90px] cursor-pointer rounded-md hover:ring-1 hover:ring-purple-400"
                            onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }}>
                            {file.drive_upload_path}
                          </span>
                        ) : (
                          <button onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }} className="hover:text-purple-500 text-muted-foreground">
                            <X className="w-5 h-5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Who Copied */}
                    <td className="px-2 py-3 text-sm font-bold text-amber-200">{file.who_copied || "-"}</td>
                    {/* Confirmed */}
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => handleConfirmedToggle(file)} className="hover:scale-110 transition-transform">
                        {file.confirmed ? (
                          <span className="text-sm font-black text-emerald-400 uppercase bg-emerald-900/60 px-3 py-1 rounded-full">CONFIRMED</span>
                        ) : (
                          <span className="text-[10px] font-black text-red-400 uppercase bg-red-900/60 px-2 py-0.5 rounded-full whitespace-nowrap">NOT CONFIRMED</span>
                        )}
                      </button>
                    </td>
                    {/* Action */}
                    <td className="px-2 py-3 text-center">
                      <Button size="sm" className="h-8 text-sm px-4 font-bold tracking-wide bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500" onClick={() => openPathBuilder(file)}>
                        SET PATH
                      </Button>
                    </td>
                    {/* Notes */}
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => openNotesDialog(file)} className="hover:scale-110 transition-transform">
                        <div className={cn("bg-white dark:bg-white/20 rounded-md shadow-md p-1 inline-flex items-center justify-center")}>
                          <PenLine className={cn("w-5 h-5", file.notes ? "text-primary" : "text-muted-foreground")} />
                        </div>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div>
        {renderSection("PHOTOS", photoFiles, "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300")}
        {photoFiles.length > 0 && videoFiles.length > 0 && <div className="h-px bg-border" />}
        {renderSection("VIDEOS", videoFiles, "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300")}
        {otherFiles.length > 0 && <div className="h-px bg-border" />}
        {renderSection("OTHER", otherFiles, "bg-muted text-muted-foreground")}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FolderOpen className="w-6 h-6 text-cyan-500" />
        <h2 className="text-xl font-bold text-foreground">Files</h2>
        <Badge variant="outline" className="font-bold">{stats.total} files</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/60 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Total Files</div>
          <div className="text-lg font-bold text-foreground">{stats.total}</div>
        </div>
        <div className="bg-muted/60 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Remaining</div>
          <div className={cn("text-lg font-bold", stats.remaining > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
            {stats.remaining}
          </div>
        </div>
        <div className="bg-muted/60 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Total Size</div>
          <div className="text-lg font-bold text-foreground">{stats.totalSize} GB</div>
        </div>
      </div>

      {/* Event Groups */}
      {eventGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-bold">No file records yet</p>
          <p className="text-sm mt-1">Files will appear here once events are processed</p>
        </div>
      ) : (
        <div className="space-y-2">
          {eventGroups.map(group => {
            const key = `${group.eventName}-${group.eventDateAD}`;
            const isExpanded = expandedEvents?.has(key) ?? false;
            const remaining = getRemainingCount(group.files);
            const copied = group.files.length - remaining;
            const summary = buildEventSummary(group.files);
            return (
              <div key={key} className={cn("border rounded-lg overflow-hidden", isExpanded ? "border-cyan-500/50" : "border-border")}>
                <button
                  className="w-full flex flex-col px-4 py-3 text-left bg-red-900/70 hover:bg-red-900/60 transition-colors"
                  onClick={() => toggleEvent(key)}
                >
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span className="text-base font-black text-white uppercase tracking-wide">
                      {getMonthName(group.eventMonth)} {group.eventDay || "?"} - {group.eventName} - {copied} FILES COPIED - {remaining} REMAINING
                    </span>
                    <span className="ml-6 text-base font-black text-amber-200 uppercase tracking-wide shrink-0">
                      TOTAL: {group.files.length} FILES
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-white ml-2" /> : <ChevronDown className="w-5 h-5 text-white ml-2" />}
                  </div>
                  {/* Pre-expand summary */}
                  {!isExpanded && (
                    <div className="flex items-center gap-3 mt-2 ml-11 flex-wrap text-xs text-amber-200/80 font-bold">
                      {summary.uniquePhotoNames.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span className="text-white font-bold">{summary.uniquePhotoNames.join(", ")}</span>
                        </span>
                      )}
                      {summary.uniqueVideoNames.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-indigo-400" />
                          <span className="text-white font-bold">{summary.uniqueVideoNames.join(", ")}</span>
                        </span>
                      )}
                      <span>💾 {summary.backedUp}/{summary.total}</span>
                      {summary.cloudCount > 0 && <span>☁ {summary.cloudCount}/{summary.total}</span>}
                      {summary.totalSize > 0 && <span>{summary.totalSize} GB</span>}
                    </div>
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-border">
                    <FileRowsTable fileRows={group.files} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        onSave={async (updates) => {
          if (selectedFile) await update(selectedFile.id, updates);
        }}
        allFiles={files}
        onRefresh={loadFiles}
        initialBackupNumber={editBackupNumber ?? undefined}
      />

      <CloudUploadDialog
        open={cloudDialogOpen}
        onOpenChange={setCloudDialogOpen}
        fileRecord={cloudFile}
        devices={devices}
        onSave={async (id, updates) => { await update(id, updates); }}
      />

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File Notes</DialogTitle>
          </DialogHeader>
          <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={4} placeholder="Add notes..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
