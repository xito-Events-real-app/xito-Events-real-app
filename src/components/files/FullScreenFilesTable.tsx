import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, X, ChevronLeft, FolderOpen, ChevronDown, ChevronUp, Filter, FileText, Database } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";
import { supabase } from "@/integrations/supabase/client";
import { useFilesManagement } from "@/hooks/useFilesManagement";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "./FilePathBuilderDialog";
import { FileRecord, getNextCardLabel } from "@/lib/files-api";

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Files management hook
  const monthObj = useMemo(() => ({ year: selectedYear, month: selectedMonth }), [selectedYear, selectedMonth]);
  const { files, isLoading: filesLoading, isEnsuring, update } = useFilesManagement(monthObj);
  const { devices } = useStorageDevices();

  // Path builder dialog
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

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
    return rows;
  }, [assignments, filterDay, filterClient]);

  // Day color mapping
  const dayColorMap = useMemo(() => {
    const days = [...new Set(filteredRows.map(r => r.eventDay))];
    const map = new Map<string, string>();
    days.forEach((d, i) => map.set(d, DAY_COLORS[i % DAY_COLORS.length]));
    return map;
  }, [filteredRows]);

  // Get files for a specific assignment row
  const getFilesForRow = useCallback((row: AssignmentRow): FileRecord[] => {
    return files.filter(f =>
      f.registered_date_time_ad === row.registeredDateTimeAD &&
      f.event_name === row.event
    );
  }, [files]);

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

  // Inline edit handlers
  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    await update(id, { [field]: value, synced_to_sheet: false });
  };

  const handleFormatChange = async (file: FileRecord, newFormat: string) => {
    const nextLabel = await getNextCardLabel(file.client_name, file.freelancer_name, newFormat);
    await update(file.id, { format_type: newFormat, card_label: nextLabel, synced_to_sheet: false });
  };

  const openPathBuilder = (file: FileRecord) => {
    setSelectedFile(file);
    setPathDialogOpen(true);
  };

  // Years/months
  const years = getBSYearsRange();
  const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || "";

  const isDataLoading = loading || filesLoading || isEnsuring;

  // ─── File Rows Table (inline in expand) ───
  const FileRowsTable = ({ fileRows }: { fileRows: FileRecord[] }) => {
    if (fileRows.length === 0) {
      return <div className="px-4 py-3 text-xs text-muted-foreground italic">No file rows for this event</div>;
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-cyan-50/50 dark:bg-cyan-950/10">
              <TableHead className="text-[10px] w-16">Crew</TableHead>
              <TableHead className="text-[10px]">Freelancer</TableHead>
              <TableHead className="text-[10px] w-20">Side</TableHead>
              <TableHead className="text-[10px] w-16">Card</TableHead>
              <TableHead className="text-[10px] w-16">Size</TableHead>
              <TableHead className="text-[10px] w-20">Format</TableHead>
              <TableHead className="text-[10px] w-20">Copied</TableHead>
              <TableHead className="text-[10px] text-center w-8">✓</TableHead>
              <TableHead className="text-[10px] text-center w-8">2x</TableHead>
              <TableHead className="text-[10px] text-center w-8">3x</TableHead>
              <TableHead className="text-[10px] text-center w-8">☁</TableHead>
              <TableHead className="text-[10px]">Path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fileRows.map((file) => (
              <TableRow key={file.id} className="text-xs">
                <TableCell>
                  <Badge variant="outline" className="text-[10px] px-1.5">{file.freelancer_type}</Badge>
                </TableCell>
                <TableCell className="font-medium text-xs">{file.freelancer_name}</TableCell>
                <TableCell>
                  <Select value={file.side || ""} onValueChange={(v) => handleInlineUpdate(file.id, "side", v)}>
                    <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRIDE SIDE">BRIDE</SelectItem>
                      <SelectItem value="GROOM SIDE">GROOM</SelectItem>
                      <SelectItem value="OTHER">OTHER</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-6 text-[10px] w-14 border-0 bg-transparent p-0.5"
                    defaultValue={file.card_label}
                    onBlur={(e) => { if (e.target.value !== file.card_label) handleInlineUpdate(file.id, "card_label", e.target.value); }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-6 text-[10px] w-14 border-0 bg-transparent p-0.5"
                    defaultValue={file.size_gb || ""}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== file.size_gb) handleInlineUpdate(file.id, "size_gb", v); }}
                  />
                </TableCell>
                <TableCell>
                  <Select value={file.format_type || ""} onValueChange={(v) => handleFormatChange(file, v)}>
                    <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      {["RAW_ONLY", "JPEG_ONLY", "RAW_JPEG", "CF", "NORMAL", "CF_NORMAL"].map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-6 text-[10px] w-16 border-0 bg-transparent p-0.5"
                    defaultValue={file.who_copied}
                    onBlur={(e) => { if (e.target.value !== file.who_copied) handleInlineUpdate(file.id, "who_copied", e.target.value); }}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox className="h-3.5 w-3.5" checked={file.reconfirmation} onCheckedChange={(v) => handleInlineUpdate(file.id, "reconfirmation", !!v)} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox className="h-3.5 w-3.5" checked={file.double_backup} onCheckedChange={(v) => handleInlineUpdate(file.id, "double_backup", !!v)} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox className="h-3.5 w-3.5" checked={file.triple_backup} onCheckedChange={(v) => handleInlineUpdate(file.id, "triple_backup", !!v)} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox className="h-3.5 w-3.5" checked={file.drive_upload} onCheckedChange={(v) => handleInlineUpdate(file.id, "drive_upload", !!v)} />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => openPathBuilder(file)}
                    className={cn(
                      "text-[10px] truncate max-w-[140px] text-left hover:text-cyan-600 transition-colors",
                      file.final_generated_path ? "text-foreground underline decoration-dotted" : "text-muted-foreground italic"
                    )}
                  >
                    {file.final_generated_path || "Set path..."}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
              className="font-medium text-sm text-muted-foreground italic truncate cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setFilterClient(filterClient === row.clientName ? null : row.clientName); }}
            >
              {row.clientName}
            </p>
            <p className="text-xs text-muted-foreground/70 italic truncate">{row.event}</p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">{rowFiles.length} files</Badge>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {isExpanded && (
          <div className="border-t bg-background">
            {rowFiles.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground italic">No file rows</div>
            ) : (
              <div className="p-2 space-y-2">
                {rowFiles.map(file => (
                  <div key={file.id} className="border rounded p-2 space-y-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1">{file.freelancer_type}</Badge>
                      <span className="font-medium">{file.freelancer_name}</span>
                      <span className="text-muted-foreground ml-auto">{file.side || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>Card: {file.card_label || "-"}</span>
                      <span>Size: {file.size_gb || 0}GB</span>
                      <span>Fmt: {file.format_type || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Copied: {file.who_copied || "-"}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        {file.reconfirmation && <Badge className="text-[8px] px-1 bg-emerald-100 text-emerald-700">✓</Badge>}
                        {file.double_backup && <Badge className="text-[8px] px-1 bg-blue-100 text-blue-700">2x</Badge>}
                        {file.triple_backup && <Badge className="text-[8px] px-1 bg-purple-100 text-purple-700">3x</Badge>}
                        {file.drive_upload && <Badge className="text-[8px] px-1 bg-cyan-100 text-cyan-700">☁</Badge>}
                      </div>
                    </div>
                    <button
                      onClick={() => openPathBuilder(file)}
                      className={cn(
                        "text-[10px] truncate w-full text-left hover:text-cyan-600",
                        file.final_generated_path ? "text-foreground underline decoration-dotted" : "text-muted-foreground italic"
                      )}
                    >
                      {file.final_generated_path || "Set path..."}
                    </button>
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

        {/* Year selector */}
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Month selector */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-white/10 border-white/20 text-white">
            <SelectValue>{monthName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-xs text-white/80">
          <span>{stats.totalEvents} events</span>
          <span>·</span>
          <span>{stats.totalFiles} files</span>
          <span>·</span>
          <span>{stats.totalSizeGB} GB</span>
        </div>

        {/* Expand/Collapse All */}
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
      {(filterDay || filterClient) && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {filterDay && (
            <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setFilterDay(null)}>
              Day: {filterDay} ✕
            </Badge>
          )}
          {filterClient && (
            <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setFilterClient(null)}>
              Client: {filterClient} ✕
            </Badge>
          )}
          <button className="text-[10px] text-muted-foreground hover:text-foreground ml-auto" onClick={() => { setFilterDay(null); setFilterClient(null); }}>
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
            /* ─── Mobile Layout ─── */
            <div className="p-3 space-y-0">
              {filteredRows.map((row) => {
                const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                return <MobileRow key={rowKey} row={row} rowKey={rowKey} />;
              })}
            </div>
          ) : (
            /* ─── Desktop Table ─── */
            <Table>
              <TableHeader>
                <TableRow className="bg-cyan-50/50 dark:bg-cyan-950/20 sticky top-0 z-10">
                  <TableHead className="w-10 text-[10px]"></TableHead>
                  <TableHead className="w-14 text-[10px] text-center">Day</TableHead>
                  <TableHead className="text-[10px]">Client</TableHead>
                  <TableHead className="text-[10px]">Event</TableHead>
                  <TableHead className="text-[10px] w-16 text-center">Files</TableHead>
                  <TableHead className="text-[10px] w-20">Date (AD)</TableHead>
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
                          "cursor-pointer transition-colors text-muted-foreground italic",
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
                            className="font-medium text-sm cursor-pointer hover:text-cyan-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setFilterClient(filterClient === row.clientName ? null : row.clientName); }}
                          >
                            {row.clientName}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-sm">{row.event}</TableCell>
                        <TableCell className="py-1.5 text-center">
                          <Badge variant="outline" className="text-[10px]">{rowFiles.length}</Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-[10px] text-muted-foreground/60">{row.eventDateAD}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 bg-muted/20">
                            <div className="px-4 py-2 border-l-2 border-cyan-400 ml-6">
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

      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        onSave={async (updates) => {
          if (selectedFile) await update(selectedFile.id, { ...updates, synced_to_sheet: false });
        }}
      />
    </div>
  );
}
