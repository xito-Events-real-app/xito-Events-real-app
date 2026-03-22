import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, X, ChevronLeft, FolderOpen, ChevronDown, ChevronUp, Filter, Check, PenLine, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";
import { supabase } from "@/integrations/supabase/client";
import { useFilesManagement } from "@/hooks/useFilesManagement";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "./FilePathBuilderDialog";
import { CloudUploadDialog } from "./CloudUploadDialog";
import { FileRecord, duplicateFileRowForCard } from "@/lib/files-api";
import { ReconfirmationDialog } from "./ReconfirmationDialog";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

const DAY_COLORS = [
  "bg-white",
  "bg-blue-200/80",
  "bg-amber-200/70",
  "bg-emerald-200/70",
  "bg-purple-200/70",
  "bg-rose-200/70",
  "bg-cyan-200/70",
  "bg-orange-200/70",
];

const PHOTO_ROLES = ["PB", "PG", "EP"];
const VIDEO_ROLES = ["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"];

const NEPALI_MONTH_NAMES: Record<number, string> = {1:"BAISAKH",2:"JESTHA",3:"ASHADH",4:"SHRAWAN",5:"BHADRA",6:"ASHWIN",7:"KARTIK",8:"MANGSIR",9:"POUSH",10:"MAGH",11:"FALGUN",12:"CHAITRA"};

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
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? "s" : ""}`);
  parts.push(`${mins} min${mins > 1 ? "s" : ""}`);
  return parts.join(" ") + " ago";
};

const getBackupTime = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const BackupPill = ({ path, deviceName, file, backupNum, onDeviceClick }: { path: string; deviceName: string; file: FileRecord; backupNum?: number; onDeviceClick?: (name: string) => void }) => {
  if (!path) return <X className="w-4 h-4 text-red-500 mx-auto" />;
  const label = deviceName || path.split("\\")[0] || "✓";

  // Pick per-backup timestamp, fallback to updated_at
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
          className="inline-flex items-center text-[11px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold truncate max-w-[90px] cursor-pointer rounded-md border border-transparent hover:ring-1 hover:ring-emerald-400"
          onClick={(e) => { if (onDeviceClick && deviceName) { e.stopPropagation(); onDeviceClick(deviceName); } }}
        >
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-3 space-y-2 text-xs z-[200]"
        side="top"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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

interface AssignmentRow {
  id: string;
  registeredDateTimeAD: string;
  clientName: string;
  event: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
}

interface FullScreenFilesTableProps {
  onClose: () => void;
}

export function FullScreenFilesTable({ onClose }: FullScreenFilesTableProps) {
  const isMobile = useIsMobile();
  const currentBS = getCurrentBSDate();
  const [selectedYear, setSelectedYear] = useState(String(currentBS.year));
  const [selectedMonth, setSelectedMonth] = useState(String(currentBS.month));
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterDevice, setFilterDevice] = useState<string | null>(null);
  const [filterFreelancer, setFilterFreelancer] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Files management hook
  const monthObj = useMemo(() => ({ year: selectedYear, month: selectedMonth }), [selectedYear, selectedMonth]);
  const { files, isLoading: filesLoading, isEnsuring, update, refresh } = useFilesManagement(monthObj);
  const { devices } = useStorageDevices();

  // Path builder dialog
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [editBackupNumber, setEditBackupNumber] = useState<number | null>(null);

  // Cloud upload dialog
  const [cloudDialogOpen, setCloudDialogOpen] = useState(false);
  const [cloudFile, setCloudFile] = useState<FileRecord | null>(null);

  // Notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesFile, setNotesFile] = useState<FileRecord | null>(null);
  const [notesText, setNotesText] = useState("");

  // Load assignments for selected year/month
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("freelancer_assignments")
        .select("id, registered_date_time_ad, client_name, event, event_year, event_month, event_day, event_date_ad")
        .eq("event_year", selectedYear)
        .eq("event_month", selectedMonth)
        .neq("event_date_ad", "");

      if (error) throw error;

      const pastRows = (data || [])
        .filter((r: any) => {
          const d = r.event_date_ad || "";
          if (d.includes("**")) return false;
          return d <= today;
        })
        .map((r: any): AssignmentRow => ({
          id: r.id,
          registeredDateTimeAD: r.registered_date_time_ad,
          clientName: r.client_name || "",
          event: r.event || "",
          eventYear: r.event_year || "",
          eventMonth: r.event_month || "",
          eventDay: r.event_day || "",
          eventDateAD: r.event_date_ad || "",
        }));

      setAssignments(pastRows);
    } catch (err: any) {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Sort by day DESCENDING
  const filteredRows = useMemo(() => {
    let rows = [...assignments].sort((a, b) => (parseInt(b.eventDay) || 0) - (parseInt(a.eventDay) || 0));
    if (filterDay) rows = rows.filter(a => a.eventDay === filterDay);
    if (filterClient) rows = rows.filter(a => a.clientName === filterClient);
    if (filterDevice) rows = rows.filter(a => {
      const rowFiles = files.filter(f => f.registered_date_time_ad === a.registeredDateTimeAD && f.event_name === a.event);
      return rowFiles.some(f =>
        f.backup_1_device_name === filterDevice ||
        f.backup_2_device_name === filterDevice ||
        f.backup_3_device_name === filterDevice ||
        f.drive_upload_path === filterDevice
      );
    });
    if (filterFreelancer) rows = rows.filter(a => {
      const rowFiles = files.filter(f => f.registered_date_time_ad === a.registeredDateTimeAD && f.event_name === a.event);
      return rowFiles.some(f => f.freelancer_name === filterFreelancer);
    });
    return rows;
  }, [assignments, filterDay, filterClient, filterDevice, filterFreelancer, files]);

  // Day color mapping
  const dayColorMap = useMemo(() => {
    const days = [...new Set(filteredRows.map(r => r.eventDay))];
    const map = new Map<string, string>();
    days.forEach((d, i) => map.set(d, DAY_COLORS[i % DAY_COLORS.length]));
    return map;
  }, [filteredRows]);

  // Get files for a specific assignment row
  const getFilesForRow = useCallback((row: AssignmentRow): FileRecord[] => {
    let rowFiles = files.filter(f =>
      f.registered_date_time_ad === row.registeredDateTimeAD &&
      f.event_name === row.event
    );
    if (filterDevice) {
      rowFiles = rowFiles.filter(f =>
        f.backup_1_device_name === filterDevice ||
        f.backup_2_device_name === filterDevice ||
        f.backup_3_device_name === filterDevice ||
        f.drive_upload_path === filterDevice
      );
    }
    if (filterFreelancer) {
      rowFiles = rowFiles.filter(f => f.freelancer_name === filterFreelancer);
    }
    return rowFiles;
  }, [files, filterDevice, filterFreelancer]);

  // Stats
  const stats = useMemo(() => {
    const totalEvents = filteredRows.length;
    const totalFiles = files.length;
    const totalSizeGB = files.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
    return { totalEvents, totalFiles, totalSizeGB: Math.round(totalSizeGB * 100) / 100 };
  }, [filteredRows, files]);

  // Expand/collapse
  const toggleExpand = useCallback((rowKey: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return next;
    });
  }, []);

  const allExpanded = useMemo(() =>
    filteredRows.length > 0 && filteredRows.every(row => {
      const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
      return expandedRows.has(rowKey);
    }),
    [filteredRows, expandedRows]
  );

  const handleToggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      const keys = new Set(filteredRows.map(row => `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`));
      setExpandedRows(keys);
    }
  }, [allExpanded, filteredRows]);

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

  // Reconfirmation dialog state
  const [reconfirmFile, setReconfirmFile] = useState<FileRecord | null>(null);
  const [reconfirmOpen, setReconfirmOpen] = useState(false);

  const handleReconfirmClick = (file: FileRecord) => {
    setReconfirmFile(file);
    setReconfirmOpen(true);
  };

  const handleConfirmFile = async (fileId: string) => {
    await update(fileId, { confirmed: true, reconfirmation: true, synced_to_sheet: false });
  };

  // Years/months
  const years = getBSYearsRange();
  const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || "";

  const isDataLoading = loading || filesLoading || isEnsuring;

  // ─── Helper: first name only ───
  const getFirstName = (name: string) => (name || "").split(" ")[0];

  // ─── Helper: backup device summary for collapsed row ───
  const getBackupDeviceSummary = (rowFiles: FileRecord[]): string => {
    const photoDevices = [...new Set(
      rowFiles.filter(f => PHOTO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name)
        .map(f => f.backup_1_device_name)
    )];
    const videoDevices = [...new Set(
      rowFiles.filter(f => VIDEO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name)
        .map(f => f.backup_1_device_name)
    )];
    const parts: string[] = [];
    if (photoDevices.length) parts.push(`PHOTO ${photoDevices.join(", ")}`);
    if (videoDevices.length) parts.push(`VIDEO ${videoDevices.join(", ")}`);
    return parts.join("  ·  ") || "—";
  };

  const getRemainingCount = (rowFiles: FileRecord[]): number => {
    return rowFiles.filter(f => !f.final_generated_path).length;
  };


  // ─── File Rows Table (grouped by PHOTOS/VIDEOS) ───
  const FileRowsTable = ({ fileRows }: { fileRows: FileRecord[] }) => {
    if (fileRows.length === 0) {
      return <div className="px-4 py-3 text-xs text-muted-foreground">No file rows for this event</div>;
    }

    const photoFiles = fileRows.filter(f => PHOTO_ROLES.includes(f.freelancer_type));
    const videoFiles = fileRows.filter(f => VIDEO_ROLES.includes(f.freelancer_type));
    const otherFiles = fileRows.filter(f => !PHOTO_ROLES.includes(f.freelancer_type) && !VIDEO_ROLES.includes(f.freelancer_type));

    const renderSection = (label: string, sectionFiles: FileRecord[], bgClass: string, headerBg: string) => {
      if (sectionFiles.length === 0) return null;
      return (
        <div className="mb-1">
          <div className={cn("px-3 py-1.5 font-bold text-sm uppercase tracking-wider", headerBg)}>
            {label} ({sectionFiles.length})
          </div>
          <div className="overflow-x-auto">
            <table className="table-fixed w-full text-xs">
              <colgroup>
                <col style={{ width: '5%' }} />   {/* Role */}
                <col style={{ width: '6%' }} />   {/* Name */}
                <col style={{ width: '5%' }} />   {/* Side */}
                <col style={{ width: '5%' }} />   {/* Card */}
                <col style={{ width: '6%' }} />   {/* Format */}
                <col style={{ width: '4%' }} />   {/* Size */}
                <col style={{ width: '4%' }} />   {/* Items */}
                <col style={{ width: '8%' }} />   {/* 1st */}
                <col style={{ width: '8%' }} />   {/* 2nd */}
                <col style={{ width: '8%' }} />   {/* 3rd */}
                <col style={{ width: '8%' }} />   {/* Drive */}
                <col style={{ width: '10%' }} />  {/* Link */}
                <col style={{ width: '8%' }} />   {/* Who Copied First? */}
                <col style={{ width: '8%' }} />   {/* Reconfirmation */}
                <col style={{ width: '3%' }} />   {/* 📝 */}
                <col style={{ width: '6%' }} />   {/* Action */}
              </colgroup>
              <thead>
                <tr className={cn("border-b text-xs", bgClass)}>
                  <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">Role</th>
                  <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">Name</th>
                  <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">Side</th>
                  <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">Card</th>
                  <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">Format</th>
                  <th className="px-2 py-1.5 text-right font-bold whitespace-nowrap">Size</th>
                  <th className="px-2 py-1.5 text-right font-bold whitespace-nowrap">Items</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">1st</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">2nd</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">3rd</th>
                  <th className="px-3 py-1.5 text-center font-bold whitespace-nowrap border-l border-border/40">Cloud</th>
                  <th className="px-3 py-1.5 text-center font-bold whitespace-nowrap border-l border-border/40">Link</th>
                  <th className="px-3 py-1.5 text-left font-bold whitespace-nowrap border-l border-border/40">Who Copied First?</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">Reconfirmation</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">📝</th>
                  <th className="px-2 py-1.5 text-center font-bold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {sectionFiles.map((file) => (
                  <tr key={file.id} className={cn("border-b border-border/30 hover:bg-muted/30", bgClass)}>
                    {/* Role Badge */}
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="text-[11px] px-1.5 font-bold">{file.freelancer_type}</Badge>
                    </td>
                    {/* First Name with tooltip */}
                    <td className="px-2 py-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setFilterFreelancer(prev => prev === file.freelancer_name ? null : file.freelancer_name); }}>{getFirstName(file.freelancer_name)}</span>
                          </TooltipTrigger>
                          <TooltipContent><p className="font-bold">{file.freelancer_name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    {/* Side (read-only) */}
                    <td className="px-2 py-1.5 text-xs">
                      {file.side === "BRIDE SIDE" ? "BRIDE" : file.side === "GROOM SIDE" ? "GROOM" : file.side || "-"}
                    </td>
                    {/* Card (read-only) */}
                    <td className="px-2 py-1.5 text-xs">Card {parseInt(file.card_label || "1") || file.card_label || "1"}</td>
                    {/* Format (read-only) */}
                    <td className="px-2 py-1.5 text-xs">{file.format_type || "-"}</td>
                    {/* Size (read-only) */}
                    <td className="px-2 py-1.5 text-right text-xs">{file.size_gb ? `${file.size_gb}GB` : "-"}</td>
                    {/* Items (read-only) */}
                    <td className="px-2 py-1.5 text-right text-xs">{file.number_of_items || "-"}</td>
                    {/* 1st Backup */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.final_generated_path || ""} deviceName={file.backup_1_device_name || ""} file={file} backupNum={1} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.final_generated_path && (
                          <button onClick={() => openPathBuilder(file, 1)} className="hover:text-blue-500 text-muted-foreground transition-colors">
                            <PenLine className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* 2nd Backup */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_2_path || ""} deviceName={file.backup_2_device_name || ""} file={file} backupNum={2} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_2_path && (
                          <button onClick={() => openPathBuilder(file, 2)} className="hover:text-blue-500 text-muted-foreground transition-colors">
                            <PenLine className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* 3rd Backup */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_3_path || ""} deviceName={file.backup_3_device_name || ""} file={file} backupNum={3} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_3_path && (
                          <button onClick={() => openPathBuilder(file, 3)} className="hover:text-blue-500 text-muted-foreground transition-colors">
                            <PenLine className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Cloud */}
                    <td className="px-3 py-1.5 text-center border-l border-border/40">
                      <div className="flex items-center justify-center gap-0.5">
                        {file.drive_upload && file.drive_upload_path ? (
                          <HoverCard openDelay={100} closeDelay={300}>
                            <HoverCardTrigger asChild>
                              <span
                                className="inline-flex items-center text-[11px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 font-bold truncate max-w-[90px] cursor-pointer rounded-md hover:ring-1 hover:ring-purple-400"
                                onClick={(e) => { e.stopPropagation(); if (file.drive_upload_path) setFilterDevice(prev => prev === file.drive_upload_path ? null : file.drive_upload_path); }}
                              >
                                {file.drive_upload_path}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent
                              className="w-80 p-3 space-y-2 text-xs z-[200]"
                              side="top"
                              onPointerDownOutside={(e) => e.preventDefault()}
                              onInteractOutside={(e) => e.preventDefault()}
                            >
                              <div className="font-bold text-sm text-purple-700 dark:text-purple-400">{file.drive_upload_path}</div>
                              {file.drive_link && <div className="bg-muted/50 rounded px-2 py-1.5 font-mono text-[11px] break-all leading-relaxed">{file.drive_link}</div>}
                              {file.updated_at && (
                                <div className="text-[11px] font-bold text-foreground">
                                  {new Date(file.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                  {" "}
                                  {new Date(file.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-bold">{getTimeAgo(file.updated_at)}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <button
                            onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }}
                            className="hover:text-purple-500 text-muted-foreground transition-colors"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                        {file.drive_upload && file.drive_upload_path && (
                          <button onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }} className="hover:text-purple-500 text-muted-foreground transition-colors">
                            <PenLine className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Drive Link */}
                    <td className="px-3 py-1.5 text-center border-l border-border/40">
                      {file.drive_link ? (
                        <a href={file.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-0.5">
                          OPEN <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <X className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    {/* Who Copied (read-only) */}
                    <td className="px-3 py-1.5 text-xs font-bold border-l border-border/40">{file.who_copied || "-"}</td>
                    {/* Confirmed */}
                    <td className="px-2 py-1.5 text-center">
                      {!file.final_generated_path ? (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      ) : file.confirmed ? (
                        <button onClick={() => { setReconfirmFile(file); setReconfirmOpen(true); }} className="hover:scale-110 transition-transform">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide cursor-pointer">CONFIRMED</span>
                        </button>
                      ) : (
                        <button onClick={() => handleReconfirmClick(file)} className="hover:scale-110 transition-transform">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-wide">NOT CONFIRMED</span>
                        </button>
                      )}
                    </td>
                    {/* Notes */}
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => openNotesDialog(file)} className="hover:text-blue-600 transition-colors">
                        <PenLine className={cn("w-3.5 h-3.5 mx-auto", file.notes ? "text-blue-600" : "text-muted-foreground")} />
                      </button>
                    </td>
                    {/* Set File Path */}
                    <td className="px-2 py-1.5 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2 font-bold"
                        onClick={() => openPathBuilder(file)}
                      >
                        SET PATH
                      </Button>
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
        {renderSection("PHOTOS", photoFiles, "bg-emerald-50/50 dark:bg-emerald-950/10", "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300")}
        {photoFiles.length > 0 && videoFiles.length > 0 && <div className="h-1 bg-border" />}
        {renderSection("VIDEOS", videoFiles, "bg-indigo-50/50 dark:bg-indigo-950/10", "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300")}
        {otherFiles.length > 0 && <div className="h-1 bg-border" />}
        {renderSection("OTHER", otherFiles, "bg-muted/30", "bg-muted text-muted-foreground")}
      </div>
    );
  };

  // ─── Mobile Card Row ───
  const MobileRow = ({ row, rowKey }: { row: AssignmentRow; rowKey: string }) => {
    const isExpanded = expandedRows.has(rowKey);
    const rowFiles = getFilesForRow(row);
    const dayColor = dayColorMap.get(row.eventDay) || "bg-white";

    return (
      <div className={cn("border rounded-lg overflow-hidden mb-2", isExpanded && "ring-1 ring-cyan-300")}>
        <button
          className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left", dayColor)}
          onClick={() => toggleExpand(rowKey)}
        >
          <div
            className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setFilterDay(filterDay === row.eventDay ? null : row.eventDay); }}
          >
            {row.eventDay}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-sm truncate cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setFilterClient(filterClient === row.clientName ? null : row.clientName); }}
            >
              {row.clientName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{getBackupDeviceSummary(rowFiles)}</p>
            <p className="text-xs font-bold truncate">{row.event}</p>
          </div>
          {(() => {
            const remaining = getRemainingCount(rowFiles);
            return remaining > 0
              ? <span className="text-[10px] font-bold text-red-600 shrink-0">{remaining} REMAINING</span>
              : <span className="text-[10px] font-bold text-green-600 shrink-0">ALL COPIED</span>;
          })()}
          <Badge variant="outline" className="text-xs shrink-0 font-bold">{rowFiles.length}</Badge>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {isExpanded && (
          <div className="border-t bg-background">
            {rowFiles.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">No file rows</div>
            ) : (
              <div className="p-2 space-y-2">
                {rowFiles.map(file => (
                  <div key={file.id} className={cn(
                    "border rounded p-2 space-y-1 text-[11px]",
                    PHOTO_ROLES.includes(file.freelancer_type) ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-indigo-50/50 dark:bg-indigo-950/10"
                  )}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] px-1 font-bold">{file.freelancer_type}</Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold text-xs cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setFilterFreelancer(prev => prev === file.freelancer_name ? null : file.freelancer_name); }}>{getFirstName(file.freelancer_name)}</span>
                          </TooltipTrigger>
                          <TooltipContent><p className="font-bold">{file.freelancer_name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="ml-auto font-bold text-xs">{file.side === "BRIDE SIDE" ? "BRIDE" : file.side === "GROOM SIDE" ? "GROOM" : file.side || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold">Card {file.card_label || "1"}</span>
                      <span>{file.size_gb ? `${file.size_gb}GB` : "-"}</span>
                      <span>{file.format_type || "-"}</span>
                      <span>Copied: {file.who_copied || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">1st:</span>
                        <BackupPill path={file.final_generated_path || ""} deviceName={file.backup_1_device_name || ""} file={file} backupNum={1} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.final_generated_path && (
                          <button onClick={() => openPathBuilder(file, 1)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">2nd:</span>
                        <BackupPill path={file.backup_2_path || ""} deviceName={file.backup_2_device_name || ""} file={file} backupNum={2} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_2_path && (
                          <button onClick={() => openPathBuilder(file, 2)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">3rd:</span>
                        <BackupPill path={file.backup_3_path || ""} deviceName={file.backup_3_device_name || ""} file={file} backupNum={3} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_3_path && (
                          <button onClick={() => openPathBuilder(file, 3)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs cursor-pointer" onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }}>
                        Cloud: {file.drive_upload && file.drive_upload_path ? (
                          <span className="text-purple-600 font-bold">{file.drive_upload_path}</span>
                        ) : "✕"}
                      </span>
                      {file.drive_link && <a href={file.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold">OPEN</a>}
                      <span className="text-xs">{file.confirmed ? "✓ Confirmed" : ""}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => openNotesDialog(file)} className="hover:text-blue-600">
                          <PenLine className={cn("w-3 h-3", file.notes ? "text-blue-600" : "text-muted-foreground")} />
                        </button>
                        <Button variant="outline" size="sm" className="h-5 text-xs px-1.5 font-bold" onClick={() => openPathBuilder(file)}>
                          SET PATH
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 shrink-0" onClick={onClose}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <FolderOpen className="w-4 h-4" />
        </div>
        <h1 className="font-bold text-sm uppercase tracking-wide flex-1">File Management</h1>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-white/10 border-white/20 text-white">
            <SelectValue>{monthName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="hidden md:flex items-center gap-3 text-xs text-white/80">
          <span>{stats.totalEvents} events</span>
          <span>·</span>
          <span>{stats.totalFiles} files</span>
          <span>·</span>
          <span>{stats.totalSizeGB} GB</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 text-xs hidden md:flex"
          onClick={handleToggleExpandAll}
        >
          {allExpanded ? <><ChevronUp className="w-3 h-3 mr-1" />Collapse</> : <><ChevronDown className="w-3 h-3 mr-1" />Expand</>}
        </Button>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 shrink-0" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* ─── Filter Chips ─── */}
      {(filterDay || filterClient || filterDevice || filterFreelancer) && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {filterDay && (
            <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterDay(null)}>
              Day: {filterDay} ✕
            </Badge>
          )}
          {filterClient && (
            <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterClient(null)}>
              Client: {filterClient} ✕
            </Badge>
          )}
          {filterDevice && (
            <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterDevice(null)}>
              Device: {filterDevice} ✕
            </Badge>
          )}
          {filterFreelancer && (
            <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterFreelancer(null)}>
              Freelancer: {filterFreelancer} ✕
            </Badge>
          )}
          <button className="text-xs text-muted-foreground hover:text-foreground ml-auto" onClick={() => { setFilterDay(null); setFilterClient(null); setFilterDevice(null); setFilterFreelancer(null); }}>
            Clear all
          </button>
        </div>
      )}

      {/* ─── Loading ─── */}
      {isDataLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          {isEnsuring && <span className="ml-3 text-sm text-muted-foreground">Preparing file rows...</span>}
        </div>
      )}

      {/* ─── Empty ─── */}
      {!isDataLoading && filteredRows.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No past events for {monthName} {selectedYear}</p>
        </div>
      )}

      {/* ─── Content ─── */}
      {!isDataLoading && filteredRows.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {isMobile ? (
            <div className="p-3 space-y-0">
              {filteredRows.map((row) => {
                const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                return <MobileRow key={rowKey} row={row} rowKey={rowKey} />;
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-cyan-50/50 dark:bg-cyan-950/20 sticky top-0 z-10">
                  <TableHead className="w-10 text-xs"></TableHead>
                  <TableHead className="w-14 text-xs text-center">Day</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">1st Backup Devices</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs w-36 text-center">Status</TableHead>
                  <TableHead className="text-xs w-12 text-center">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const rowFiles = getFilesForRow(row);
                  const dayColor = dayColorMap.get(row.eventDay) || "bg-white";

                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow
                        className={cn(
                          "cursor-pointer transition-colors font-bold",
                          dayColor,
                          isExpanded && "ring-1 ring-cyan-300"
                        )}
                        onClick={() => toggleExpand(rowKey)}
                      >
                        <TableCell className="py-1.5 px-2">
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-cyan-600" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          <div
                            className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold mx-auto cursor-pointer hover:bg-cyan-700"
                            onClick={(e) => { e.stopPropagation(); setFilterDay(filterDay === row.eventDay ? null : row.eventDay); }}
                          >
                            {row.eventDay}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span
                            className="font-bold text-sm cursor-pointer hover:text-cyan-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setFilterClient(filterClient === row.clientName ? null : row.clientName); }}
                          >
                            {row.clientName}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">{getBackupDeviceSummary(rowFiles)}</TableCell>
                        <TableCell className="py-1.5 text-sm font-bold">{row.event}</TableCell>
                        <TableCell className="py-1.5 text-center">
                          {(() => {
                            const remaining = getRemainingCount(rowFiles);
                            return remaining > 0
                              ? <span className="text-xs font-bold text-red-600">{remaining} FILES REMAINING</span>
                              : <span className="text-xs font-bold text-green-600">ALL FILES COPIED</span>;
                          })()}
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          <Badge variant="outline" className="text-xs font-bold">{rowFiles.length}</Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0 bg-muted/20">
                            <div className="border-l-2 border-cyan-400 ml-6">
                              <FileRowsTable fileRows={rowFiles} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <ReconfirmationDialog
        open={reconfirmOpen}
        onOpenChange={setReconfirmOpen}
        file={reconfirmFile}
        onConfirm={handleConfirmFile}
        alreadyConfirmed={reconfirmFile?.confirmed === true}
      />

      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        onSave={async (updates) => {
          if (selectedFile) await update(selectedFile.id, { ...updates, synced_to_sheet: false });
        }}
        allFiles={files}
        onRefresh={refresh}
        initialBackupNumber={editBackupNumber ?? undefined}
      />

      <CloudUploadDialog
        open={cloudDialogOpen}
        onOpenChange={setCloudDialogOpen}
        fileRecord={cloudFile}
        devices={devices}
        onSave={async (id, updates) => { await update(id, updates); }}
      />

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Notes — {notesFile?.freelancer_name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Write notes about this file entry..."
            className="min-h-[100px] text-sm"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveNotes} className="font-bold">Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
