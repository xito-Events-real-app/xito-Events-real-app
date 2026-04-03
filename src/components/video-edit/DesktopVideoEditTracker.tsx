import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { useVideoEditTracker, STAGES, DisplayRow } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Video, MessageSquare, Music, ExternalLink, ChevronDown, ChevronRight, Loader2, Ungroup, Group, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Flame, Workflow, FolderOpen, LayoutDashboard, List, GitBranch, Users, RefreshCcw, CheckCircle, Play, Pause, Clock, Phone, ArrowRight, CalendarIcon, AlertTriangle, Timer, Search, Youtube, Share2 } from "lucide-react";
import { WtnPipelineView } from "./WtnPipelineView";
import { FileDetailsExpander } from "./FileDetailsExpander";
import { EditorChat, EditorChatSection } from "./EditorChat";
import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish, getBSYearsRange, formatBSDate } from "@/lib/nepali-date";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "3": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "4": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "5": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STAGE_CARD_COLORS: Record<string, string> = {
  QUEUE: "border-l-gray-400",
  EDIT_LAB: "border-l-blue-400",
  EDIT_ON_PROGRESS: "border-l-blue-600",
  COLOR_QUEUE: "border-l-purple-400",
  COLOR_LAB: "border-l-purple-600",
  COLOR_ON_PROGRESS: "border-l-violet-600",
  EXPORT_QUEUE: "border-l-amber-400",
  EXPORTED: "border-l-amber-600",
  CLIENT_REVIEW: "border-l-orange-500",
  RE_EDIT_ON_PROGRESS: "border-l-red-500",
  FINALIZED: "border-l-green-500",
};

/* ── Date/time helper functions ── */
function getEventAge(eventDateAD: string): { days: number; bsDisplay: string; bsShort: string } | null {
  if (!eventDateAD) return null;
  try {
    const eventDate = new Date(eventDateAD);
    if (isNaN(eventDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - eventDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const bs = adToBS(eventDate);
    const bsDisplay = formatBSDate(bs);
    const monthNames = ["Baisakh","Jestha","Ashar","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
    const bsShort = `${monthNames[bs.month - 1]} ${bs.day}`;
    return { days, bsDisplay, bsShort };
  } catch { return null; }
}

function EventAgeStamp({ age }: { age: { days: number; bsShort: string } }) {
  return (
    <div className="inline-flex flex-col items-center justify-center px-2 py-1 rounded border-2 border-red-500/60 bg-red-500/10 rotate-[-3deg] min-w-[64px]">
      <span className="text-[11px] font-black text-red-600 dark:text-red-400 leading-tight tracking-tight">
        {age.days}D OLD
      </span>
      <span className="text-[9px] font-bold text-red-500/80 dark:text-red-400/70 leading-tight uppercase tracking-wide">
        {age.bsShort}
      </span>
    </div>
  );
}

function getTimeAgo(isoDate: string): string | null {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return null;
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    if (days > 0) return `${days}d ${hrs}h ago`;
    if (hrs > 0) return `${hrs}h ago`;
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m ago`;
  } catch { return null; }
}

/* ── Live Edit Timer ── */
const NO_TIMER_STAGES: string[] = [];
const PROGRESS_STAGES_SET = new Set(['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS', 'COLOR_QUEUE', 'COLOR_LAB', 'EXPORT_QUEUE', 'EXPORTED', 'CLIENT_REVIEW', 'FINALIZED']);
const COLORIST_STAGES = new Set(['COLOR_QUEUE', 'COLOR_LAB', 'COLOR_ON_PROGRESS', 'EXPORT_QUEUE', 'EXPORTED', 'CLIENT_REVIEW', 'RE_EDIT_ON_PROGRESS', 'FINALIZED']);
const YT_STAGES = new Set(['EXPORTED', 'CLIENT_REVIEW', 'RE_EDIT_ON_PROGRESS', 'FINALIZED']);
const REVIEW_STAGES = new Set(['CLIENT_REVIEW']);

function LiveEditTimer({
  editStartedAt,
  stageHistory,
  size,
  stageKey,
}: {
  editStartedAt: string;
  stageHistory?: string;
  size: 'card' | 'table';
  stageKey?: string;
}) {
  const [now, setNow] = useState(Date.now());
  const isFinalized = stageKey === 'FINALIZED';

  useEffect(() => {
    if (isFinalized) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isFinalized]);

  if (!editStartedAt) return <span className="text-muted-foreground text-xs">-</span>;

  const startTime = new Date(editStartedAt).getTime();
  if (isNaN(startTime)) return <span className="text-muted-foreground text-xs">-</span>;

  // For finalized, compute end time from last stage_history entry
  let endTime = now;
  if (isFinalized && stageHistory) {
    const lines = stageHistory.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const match = lastLine?.match(/\[(.+)\]/);
    if (match) {
      const parsed = new Date(match[1]).getTime();
      if (!isNaN(parsed)) endTime = parsed;
    }
  }

  const diffMs = Math.max(0, endTime - startTime);
  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hrs = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const isOverdue = diffMs >= 2 * 24 * 60 * 60 * 1000;
  const colorCls = isOverdue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
  const pulseCls = isOverdue && !isFinalized ? "animate-pulse" : "";

  if (size === 'table') {
    const shortText = days > 0 ? `${days}d ${hrs}h` : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    const fullText = `${days}D ${hrs}H ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1 text-xs font-medium cursor-default", colorCls, pulseCls)}>
            <Timer className="w-3 h-3" />
            {isFinalized ? `Total: ${shortText}` : shortText}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className={cn("text-sm font-mono font-bold", colorCls)}>{fullText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Card size - big display
  return (
    <div className={cn("flex items-center gap-1.5", colorCls, pulseCls)}>
      <Timer className="w-4 h-4" />
      <span className="text-base font-black tracking-tight font-mono">
        {days > 0 && <>{days}D </>}
        {hrs}H{' '}
        <span className="text-sm">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </span>
    </div>
  );
}

/* ── Stage History Dialog ── */
function StageHistoryDialog({ stageHistory, editStartedAt }: { stageHistory: string; editStartedAt: string }) {
  const [open, setOpen] = useState(false);
  if (!stageHistory) return null;

  const lines = stageHistory.trim().split('\n').filter(Boolean);
  const entries: { stage: string; timestamp: Date }[] = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+\[(.+)\]$/);
    if (match) {
      const ts = new Date(match[2]);
      if (!isNaN(ts.getTime())) {
        entries.push({ stage: match[1], timestamp: ts });
      }
    }
  }

  const stageLabel = (key: string) => STAGES.find(s => s.key === key)?.label || key;

  const formatDuration = (ms: number) => {
    const totalMins = Math.floor(ms / 60000);
    const d = Math.floor(totalMins / 1440);
    const h = Math.floor((totalMins % 1440) / 60);
    const m = totalMins % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setOpen(true)}>
        History
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stage Transition History</DialogTitle>
            <DialogDescription>Timeline of stage transitions for this edit</DialogDescription>
          </DialogHeader>
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {entries.map((entry, i) => {
              const prevTime = i === 0 ? new Date(editStartedAt) : entries[i - 1].timestamp;
              const duration = entry.timestamp.getTime() - prevTime.getTime();
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{stageLabel(entry.stage)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.timestamp.toLocaleString()}
                    </p>
                    {i > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        ↑ {formatDuration(duration)} in {stageLabel(entries[i - 1].stage)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getDeadlineInfo(deadline: string): { text: string; isCrossed: boolean; isClose: boolean } | null {
  if (!deadline) return null;
  try {
    const dl = new Date(deadline);
    if (isNaN(dl.getTime())) return null;
    const now = new Date();
    const diffMs = dl.getTime() - now.getTime();
    const totalHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    const timeStr = days > 0 ? `${days}d ${hrs}h` : `${hrs}h`;

    if (diffMs < 0) {
      return { text: `Crossed ${timeStr} ago`, isCrossed: true, isClose: false };
    }
    const isClose = diffMs < 3 * 24 * 60 * 60 * 1000; // within 3 days
    return { text: `${timeStr} remaining`, isCrossed: false, isClose };
  } catch { return null; }
}

function DeadlinePicker({ value, onChange }: { value: string; onChange: (val: string | null) => void }) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [hour, setHour] = useState(value ? new Date(value).getHours().toString() : "12");
  const [minute, setMinute] = useState(value ? new Date(value).getMinutes().toString().padStart(2, '0') : "00");

  const handleSave = () => {
    if (!date) return;
    const d = new Date(date);
    d.setHours(parseInt(hour), parseInt(minute), 0, 0);
    onChange(d.toISOString());
  };

  return (
    <div className="space-y-3 p-1">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="p-3 pointer-events-auto"
      />
      <div className="flex items-center gap-2 px-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <Select value={hour} onValueChange={setHour}>
          <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm font-bold">:</span>
        <Select value={minute} onValueChange={setMinute}>
          <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["00", "15", "30", "45"].map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 px-3 pb-1">
        <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSave} disabled={!date}>
          Set Deadline
        </Button>
        {value && (
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onChange(null)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function UrgencyBadge({ value }: { value: string }) {
  const cls = URGENCY_COLORS[value] || URGENCY_COLORS["1"];
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${cls}`}>
      {value || "-"}
    </span>
  );
}

function SongsCell({ songs }: { songs: string }) {
  let parsed: { link?: string; notes?: string } = {};
  try { parsed = JSON.parse(songs || "{}"); } catch { /* ignore */ }
  const hasLink = !!parsed.link;
  const hasNotes = !!parsed.notes;
  if (!hasLink && !hasNotes) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      {hasLink && (
        <a href={parsed.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
      {hasNotes && (
        <Tooltip>
          <TooltipTrigger><Music className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
          <TooltipContent className="max-w-xs"><p className="text-xs">{parsed.notes}</p></TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function getRowBSDate(row: DisplayRow): { year: number; month: number } | null {
  if (!row.eventDateAD) return null;
  try {
    const d = new Date(row.eventDateAD);
    if (isNaN(d.getTime())) return null;
    const bs = adToBS(d);
    return { year: bs.year, month: bs.month };
  } catch { return null; }
}

function VideoEditTable({
  rows,
  onUpdateField,
  onPushToStatus,
  onSplit,
  onMerge,
  onClickClient,
  onClickEditType,
  editors,
  currentStageKey,
  onUpdateDeadline,
}: {
  rows: (DisplayRow & { _pipelinePos?: number })[];
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  onSplit?: (mergeKey: string) => void;
  onMerge?: (mergeKey: string) => void;
  onClickClient?: (name: string) => void;
  onClickEditType?: (type: string) => void;
  editors: { name: string; isVideoEditor: boolean }[];
  currentStageKey: string;
  onUpdateDeadline?: (id: string, deadline: string | null, mergedIds?: string[]) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reviewComments, setReviewComments] = useState<Record<string, { author: string; comment: string; created_at: string }[]>>({});
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Load company review comments for CLIENT_REVIEW stage
  useEffect(() => {
    if (!REVIEW_STAGES.has(currentStageKey) || rows.length === 0) return;
    const trackerIds = rows.flatMap(r => r.mergedIds?.length ? r.mergedIds : [r.id]);
    if (trackerIds.length === 0) return;
    supabase
      .from('youtube_video_comments')
      .select('tracker_row_id, author, comment, created_at')
      .in('tracker_row_id', trackerIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, typeof data> = {};
        for (const c of data) {
          const key = c.tracker_row_id || '';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c as any);
        }
        setReviewComments(grouped);
      });
  }, [currentStageKey, rows]);

  return (
    <div className="rounded-xl border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-8 text-center"></TableHead>
            <TableHead className="w-12 text-center">S.No</TableHead>
            <TableHead className="w-12 text-center">Pipeline</TableHead>
            <TableHead className="w-16 text-center">Urgency</TableHead>
            <TableHead className="w-14 text-center">Priority</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Edit Type</TableHead>
            <TableHead>Editor</TableHead>
            {COLORIST_STAGES.has(currentStageKey) && <TableHead>Colorist</TableHead>}
            <TableHead className="w-28">Event Date</TableHead>
            <TableHead className="w-24">Edit Started</TableHead>
            <TableHead className="w-28">Deadline</TableHead>
            <TableHead className="w-12 text-center">Notes</TableHead>
            <TableHead className="w-12 text-center">Songs</TableHead>
            {YT_STAGES.has(currentStageKey) && <TableHead className="w-12 text-center">YT</TableHead>}
            {REVIEW_STAGES.has(currentStageKey) && <TableHead className="w-40">Company Review</TableHead>}
            <TableHead className="w-32 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLORIST_STAGES.has(currentStageKey) ? 17 : 16} className="text-center py-12 text-muted-foreground">
                No rows found
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => {
            const isExpanded = expandedRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
              <TableRow className={cn(
                "hover:bg-muted/30",
                ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'].includes(currentStageKey) && row.isPlaying && "animate-editing-glow",
                ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'].includes(currentStageKey) && !row.isPlaying && "opacity-60"
              )}>
              <TableCell className="text-center p-1">
                <button
                  onClick={() => toggleExpand(row.id)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
              </TableCell>
              <TableCell className="text-center text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px] font-bold">
                  P{row._pipelinePos || '-'}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.id, "urgency", v, row.mergedIds)}>
                  <SelectTrigger className="w-16 h-8 p-0 border-0 bg-transparent justify-center">
                    <UrgencyBadge value={row.urgency || "0"} />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map(u => (
                      <SelectItem key={u} value={u}>
                        <div className="flex items-center gap-2">
                          <UrgencyBadge value={u} />
                          <span>{u === "5" ? "Critical" : u === "4" ? "High" : u === "3" ? "Medium" : u === "2" ? "Low" : "Minimal"}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground/10 text-xs font-bold">
                  {row.priority}
                </span>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => onClickClient?.(row.clientName)}
                  className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left"
                >
                  {row.clientName}
                </button>
              </TableCell>
              <TableCell>
                <div className="text-sm">{row.subEventName || row.eventName}</div>
                {row.subEventName && (
                  <div className="text-xs text-muted-foreground">{row.eventName}</div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onClickEditType?.(row.editType)}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    {row.editType}
                  </button>
                  {row.isMerged && row.mergeKey && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onSplit?.(row.mergeKey!)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
                        >
                          <Ungroup className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Split into separate rows</p></TooltipContent>
                    </Tooltip>
                  )}
                  {!row.isMerged && row.canMerge && row.mergeKey && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onMerge?.(row.mergeKey!)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
                        >
                          <Group className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Merge with partner</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "editor", v === "unassigned" ? "" : v, row.mergedIds)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="Assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {editors.filter(e => e.isVideoEditor && e.name).map(e => (
                      <SelectItem key={`ve-${e.name}`} value={e.name}>⭐ {e.name}</SelectItem>
                    ))}
                    {editors.filter(e => !e.isVideoEditor && e.name).map(e => (
                      <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {COLORIST_STAGES.has(currentStageKey) && (
              <TableCell>
                <Select value={row.colorist || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "colorist", v === "unassigned" ? "" : v, row.mergedIds)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="Assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {editors.filter(e => e.isVideoEditor && e.name).map(e => (
                      <SelectItem key={`vc-${e.name}`} value={e.name}>⭐ {e.name}</SelectItem>
                    ))}
                    {editors.filter(e => !e.isVideoEditor && e.name).map(e => (
                      <SelectItem key={`c-${e.name}`} value={e.name}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              )}
              {/* Event Date */}
              <TableCell>
                {(() => {
                  const age = getEventAge(row.eventDateAD);
                  if (!age) return <span className="text-muted-foreground text-xs">-</span>;
                  return <EventAgeStamp age={age} />;
                })()}
              </TableCell>
              {/* Edit Started */}
              <TableCell>
                <LiveEditTimer editStartedAt={row.editStartedAt} stageHistory={row.stageHistory} size="table" stageKey={currentStageKey} />
                {currentStageKey === 'FINALIZED' && row.stageHistory && (
                  <StageHistoryDialog stageHistory={row.stageHistory} editStartedAt={row.editStartedAt} />
                )}
              </TableCell>
              {/* Deadline */}
              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    {(() => {
                      const dl = getDeadlineInfo(row.deadline);
                      if (!dl) return (
                        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" /> Set
                        </button>
                      );
                      return (
                        <button className={cn(
                          "text-xs font-medium flex items-center gap-1 transition-colors",
                          dl.isCrossed ? "text-red-600 dark:text-red-400" :
                          dl.isClose ? "text-amber-600 dark:text-amber-400" :
                          "text-green-600 dark:text-green-400"
                        )}>
                          <CalendarIcon className="w-3 h-3" />
                          {dl.text}
                        </button>
                      );
                    })()}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DeadlinePicker
                      value={row.deadline}
                      onChange={(val) => onUpdateDeadline?.(row.id, val, row.mergedIds)}
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell className="text-center">
                {row.companyNotes ? (
                  <Tooltip>
                    <TooltipTrigger><MessageSquare className="w-4 h-4 text-primary" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs"><p className="text-xs whitespace-pre-wrap">{row.companyNotes}</p></TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <SongsCell songs={row.songs} />
              </TableCell>
              {YT_STAGES.has(currentStageKey) && (
              <TableCell className="text-center">
                {row.youtubeLink ? (
                  <div className="flex items-center justify-center gap-1">
                    {row.youtubeLink.split(',').map((link, i) => (
                      <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-500">
                        <Youtube className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              )}
              {REVIEW_STAGES.has(currentStageKey) && (
              <TableCell>
                {(() => {
                  const ids = row.mergedIds?.length ? row.mergedIds : [row.id];
                  const allComments = ids.flatMap(id => reviewComments[id] || []);
                  if (allComments.length === 0) return <span className="text-muted-foreground text-xs">-</span>;
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer max-w-[160px]">
                          {allComments.slice(0, 2).map((c, i) => (
                            <p key={i} className="text-[10px] truncate">
                              <span className="font-bold text-primary">{c.author}:</span>{' '}
                              <span className="text-muted-foreground">{c.comment}</span>
                            </p>
                          ))}
                          {allComments.length > 2 && (
                            <p className="text-[10px] text-muted-foreground">+{allComments.length - 2} more</p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-3">
                        <p className="text-xs font-bold mb-2">Company Review</p>
                        {allComments.map((c, i) => (
                          <div key={i} className="mb-2">
                            <span className="text-xs font-bold">{c.author}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">{new Date(c.created_at).toLocaleString()}</span>
                            <p className="text-xs">{c.comment}</p>
                          </div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </TableCell>
              )}
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      Move to <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STAGES.filter(s => s.key !== currentStageKey).map(s => (
                      <DropdownMenuItem key={s.key} onClick={() => onPushToStatus?.(row.id, s.key, row.mergedIds)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            {isExpanded && (
              <TableRow>
                <TableCell colSpan={17} className="p-0 bg-muted/20 border-b-2 border-primary/20">
                  <FileDetailsExpander
                    registeredDateTimeAD={row.registeredDateTimeAD}
                    eventName={row.eventName}
                  />
                </TableCell>
              </TableRow>
            )}
            </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type SortMode = 'default' | 'urgency' | 'priority-asc' | 'priority-desc';

function applyFiltersAndSort(
  rows: DisplayRow[],
  filterClient: string | null,
  filterEditType: string | null,
  filterYear: number | null,
  filterMonth: number | null,
  sortMode: SortMode,
  filterEditor: string | null = null,
): DisplayRow[] {
  let result = rows.filter(row => {
    if (filterClient && row.clientName !== filterClient) return false;
    if (filterEditType && row.editType !== filterEditType) return false;
    if (filterEditor && row.editor !== filterEditor) return false;
    if (filterYear || filterMonth) {
      const bs = getRowBSDate(row);
      if (!bs) return false;
      if (filterYear && bs.year !== filterYear) return false;
      if (filterMonth && bs.month !== filterMonth) return false;
    }
    return true;
  });

  if (sortMode === 'urgency') {
    result = [...result].sort((a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0));
  } else if (sortMode === 'priority-asc') {
    result = [...result].sort((a, b) => (parseInt(a.priority || '999') || 999) - (parseInt(b.priority || '999') || 999));
  } else if (sortMode === 'priority-desc') {
    result = [...result].sort((a, b) => (parseInt(b.priority || '0') || 0) - (parseInt(a.priority || '0') || 0));
  }

  return result;
}

/* ── Dashboard View ── */
function DashboardView({
  rowsByStatus,
  allRows,
  onStageClick,
  onAssign,
  availableEditors,
  onPushToStatus,
  onTogglePlaying,
  onClientFilter,
  onEditorClick,
}: {
  rowsByStatus: Record<string, DisplayRow[]>;
  allRows: any[];
  onStageClick: (stageKey: string) => void;
  onAssign: (rowId: string, editorName: string, mergedIds?: string[]) => void;
  availableEditors: { name: string; stage: 'EDIT_LAB' | 'QUEUE' | 'NONE'; rows: DisplayRow[]; whatsapp: string }[];
  onPushToStatus: (id: string, newStatus: string, mergedIds?: string[]) => void;
  onTogglePlaying: (id: string, currentlyPlaying: boolean, mergedIds?: string[]) => void;
  onClientFilter?: (clientName: string) => void;
  onEditorClick?: (editorName: string) => void;
}) {
  const [assignDialogEditor, setAssignDialogEditor] = useState<string | null>(null);

  // WTN Ongoing Edits: combine EDIT_ON_PROGRESS, COLOR_ON_PROGRESS, RE_EDIT_ON_PROGRESS
  const PROGRESS_STAGES = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'] as const;
  const STAGE_SHORT_LABEL: Record<string, string> = {
    EDIT_ON_PROGRESS: 'Edit on Progress',
    COLOR_ON_PROGRESS: 'Color on Progress',
    RE_EDIT_ON_PROGRESS: 'Re-Edit on Progress',
  };

  const { runningRows, pausedRows } = useMemo(() => {
    const all: (DisplayRow & { _progressStage: string })[] = [];
    for (const sk of PROGRESS_STAGES) {
      (rowsByStatus[sk] || []).forEach(r => all.push({ ...r, _progressStage: sk }));
    }
    const running = all
      .filter(r => r.isPlaying)
      .sort((a, b) => (a.playingSince || '').localeCompare(b.playingSince || ''));
    const paused = all
      .filter(r => !r.isPlaying)
      .sort((a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0));
    return { runningRows: running, pausedRows: paused };
  }, [rowsByStatus]);

  const totalProgress = runningRows.length + pausedRows.length;

  // Top urgent unassigned QUEUE rows for assignment popup
  const urgentUnassigned = useMemo(() => {
    return [...(rowsByStatus['QUEUE'] || [])]
      .filter(r => !r.editor)
      .sort((a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0))
      .slice(0, 5);
  }, [rowsByStatus]);

  const renderOngoingCard = (row: DisplayRow & { _progressStage: string }, isRunning: boolean) => (
    <div
      key={row.id}
      className={cn(
        "border-l-4 rounded-xl bg-card p-4 relative min-h-[140px] flex flex-col",
        STAGE_CARD_COLORS[row._progressStage] || "border-l-blue-600",
        isRunning ? "shadow-lg animate-editing-glow" : "shadow-sm opacity-60"
      )}
    >
      <button
        onClick={() => onTogglePlaying(row.id, isRunning, row.mergedIds)}
        className={cn(
          "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isRunning
            ? "bg-green-100 dark:bg-green-950 hover:bg-green-200 dark:hover:bg-green-900"
            : "bg-muted hover:bg-accent"
        )}
        title={isRunning ? "Pause editing" : "Resume editing"}
      >
        {isRunning
          ? <Pause className="w-4 h-4 text-green-700 dark:text-green-300" />
          : <Play className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      <button onClick={() => onClientFilter?.(row.clientName)} className="font-bold text-base text-foreground pr-10 hover:text-primary hover:underline text-left transition-colors">{row.clientName}</button>
      <p className="text-sm text-muted-foreground">{row.eventName} · {row.editType}</p>
      {/* Event age stamp */}
      {(() => {
        const age = getEventAge(row.eventDateAD);
        return age ? (
          <div className="mt-2">
            <EventAgeStamp age={age} />
          </div>
        ) : null;
      })()}
      {/* Deadline */}
      {(() => {
        const dl = getDeadlineInfo(row.deadline);
        return dl ? (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium mt-1",
            dl.isCrossed ? "text-red-600 dark:text-red-400" :
            dl.isClose ? "text-amber-600 dark:text-amber-400" :
            "text-green-600 dark:text-green-400"
          )}>
            <CalendarIcon className="w-3 h-3" />
            Deadline: {dl.text}
          </div>
        ) : null;
      })()}
      <div className="flex items-center gap-2 mt-2">
        <UrgencyBadge value={row.urgency || "0"} />
          {row.editor && (
          <button onClick={() => onEditorClick?.(row.editor)} className="text-sm px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 font-bold hover:bg-teal-200 dark:hover:bg-teal-900 transition-colors cursor-pointer">
            {row.editor}
          </button>
        )}
      </div>
      {/* Stage tag - bottom left large */}
      {/* Move to pipeline */}
      <Select onValueChange={(v) => onPushToStatus(row.id, v, row.mergedIds)}>
        <SelectTrigger className="w-full h-8 text-xs mt-1"><SelectValue placeholder="Move to..." /></SelectTrigger>
        <SelectContent>
          {STAGES.filter(s => s.key !== row._progressStage).map(s => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-auto pt-3 flex items-end justify-between">
        <button
          onClick={() => onStageClick(row._progressStage)}
          className={cn(
            "text-sm px-3 py-1 rounded-lg font-bold hover:opacity-80 transition-opacity cursor-pointer",
            row._progressStage === 'EDIT_ON_PROGRESS' ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
            row._progressStage === 'COLOR_ON_PROGRESS' ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" :
            "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          )}
        >
          {STAGE_SHORT_LABEL[row._progressStage] || row._progressStage}
        </button>
        {/* Live timer - bottom right */}
        {row.editStartedAt && (
          <LiveEditTimer editStartedAt={row.editStartedAt} stageHistory={row.stageHistory} size="card" stageKey={row._progressStage} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* WTN Ongoing Edits */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-blue-500" />
          WTN Ongoing Edits
          <Badge variant="outline" className="text-xs">{totalProgress}</Badge>
        </h3>
        {totalProgress === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
            No videos currently being edited
          </div>
        ) : (
          <div className="space-y-5">
            {/* Running Section */}
            {runningRows.length > 0 && (
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-green-500" />
                  <span className="text-base font-bold text-foreground uppercase tracking-wide">Running ({runningRows.length})</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {runningRows.map(row => renderOngoingCard(row, true))}
                </div>
              </div>
            )}

            {/* Paused Section */}
            {pausedRows.length > 0 && (
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Pause className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base font-bold text-muted-foreground uppercase tracking-wide">Paused ({pausedRows.length})</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {pausedRows.map(row => renderOngoingCard(row, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Pipeline Overview — clickable */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline Overview</h3>
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {STAGES.map(stage => {
            const count = (rowsByStatus[stage.key] || []).length;
            const borderColor = STAGE_CARD_COLORS[stage.key] || "border-l-gray-400";
            return (
              <button
                key={stage.key}
                onClick={() => onStageClick(stage.key)}
                className={`border-l-4 ${borderColor} rounded-lg bg-card p-3 shadow-sm text-left hover:shadow-md hover:bg-muted/30 transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                  <span className="text-lg font-bold text-foreground">{count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadlines Section */}
      {(() => {
        const allNonFinalized = STAGES
          .filter(s => s.key !== 'FINALIZED')
          .flatMap(s => (rowsByStatus[s.key] || []).map(r => ({ ...r, _stage: s.key })));

        const withDeadline = allNonFinalized.filter(r => r.deadline);
        const crossed = withDeadline
          .filter(r => { const dl = getDeadlineInfo(r.deadline); return dl?.isCrossed; })
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        const approaching = withDeadline
          .filter(r => { const dl = getDeadlineInfo(r.deadline); return dl && !dl.isCrossed && dl.isClose; })
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        if (crossed.length === 0 && approaching.length === 0) return null;

        return (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Deadlines
              <Badge variant="outline" className="text-xs">{crossed.length + approaching.length}</Badge>
            </h3>
            <div className="space-y-4">
              {crossed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">Crossed ({crossed.length})</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {crossed.map(row => {
                      const dl = getDeadlineInfo(row.deadline);
                      return (
                        <div key={row.id} className="border-l-4 border-l-red-500 rounded-lg bg-card p-3 shadow-sm">
                          <p className="font-semibold text-sm text-foreground">{row.clientName}</p>
                          <p className="text-xs text-muted-foreground">{row.eventName} · {row.editType}</p>
                          {row.editor && <p className="text-[10px] text-muted-foreground">{row.editor}</p>}
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{dl?.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {approaching.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">Approaching ({approaching.length})</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {approaching.map(row => {
                      const dl = getDeadlineInfo(row.deadline);
                      return (
                        <div key={row.id} className="border-l-4 border-l-amber-500 rounded-lg bg-card p-3 shadow-sm">
                          <p className="font-semibold text-sm text-foreground">{row.clientName}</p>
                          <p className="text-xs text-muted-foreground">{row.eventName} · {row.editType}</p>
                          {row.editor && <p className="text-[10px] text-muted-foreground">{row.editor}</p>}
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">{dl?.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Available Editors */}
      {availableEditors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            Available Editors
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Editors not currently on any active progress</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableEditors.map(editor => {
              if (editor.stage === 'EDIT_LAB') {
                // EDIT_LAB: amber border, tasks, WhatsApp button
                return (
                  <div key={editor.name} className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{editor.name}</span>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-[10px]">Edit Lab</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {editor.rows.map(row => {
                        const firstName = editor.name.split(' ')[0];
                        const phone = editor.whatsapp;
                        return (
                          <div key={row.id} className="text-xs text-muted-foreground flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="truncate">{row.clientName} · {row.eventName} · {row.editType}</span>
                            </div>
                            {phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(phone, `Hi ${firstName}, have you started editing ${row.clientName} - ${row.eventName} (${row.editType})?`);
                                }}
                                className="shrink-0 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 transition-colors text-[10px] font-medium whitespace-nowrap"
                              >
                                Ask {firstName}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              if (editor.stage === 'QUEUE') {
                // QUEUE: yellow border, tasks, Move to Edit Lab button
                return (
                  <div key={editor.name} className="rounded-xl border-2 border-yellow-400 dark:border-yellow-600 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{editor.name}</span>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 text-[10px]">Queue</Badge>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {editor.rows.map(row => (
                        <div key={row.id} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                          {row.clientName} · {row.eventName} · {row.editType}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs border-green-500 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => {
                        editor.rows.forEach(row => {
                          onPushToStatus(row.id, 'EDIT_LAB', row.mergedIds);
                        });
                      }}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Move to Edit Lab
                    </Button>
                  </div>
                );
              }
              // NONE: plain card, click to assign
              return (
                <button
                  key={editor.name}
                  onClick={() => setAssignDialogEditor(editor.name)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-card p-4 text-left hover:bg-muted/30 hover:shadow-sm transition-all"
                >
                  <span className="font-semibold text-sm text-foreground">{editor.name}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Click to assign from queue</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={!!assignDialogEditor} onOpenChange={(open) => { if (!open) setAssignDialogEditor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to {assignDialogEditor}</DialogTitle>
            <DialogDescription>
              Top urgent unassigned videos from Queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {urgentUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No unassigned videos in queue</p>
            ) : (
              urgentUnassigned.map(row => (
                <div key={row.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{row.clientName}</p>
                    <p className="text-xs text-muted-foreground">{row.eventName} · {row.editType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge value={row.urgency || "0"} />
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        onAssign(row.id, assignDialogEditor!, row.mergedIds);
                        setAssignDialogEditor(null);
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Editor View ── */
const EDITOR_STAGE_ORDER = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS', 'EDIT_LAB', 'QUEUE', 'COLOR_QUEUE', 'COLOR_LAB', 'EXPORT_QUEUE', 'EXPORTED', 'CLIENT_REVIEW', 'FINALIZED'];

const NEXT_UP_PRIORITY_STAGES = ['EDIT_LAB', 'RE_EDIT_ON_PROGRESS', 'COLOR_QUEUE', 'QUEUE'];
const NEXT_UP_STAGE_COLORS: Record<string, string> = {
  'EDIT_LAB': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'RE_EDIT_ON_PROGRESS': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'COLOR_QUEUE': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'QUEUE': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function EditorView({ editorName, rowsByStatus, onPushToStatus, onUpdateField, onTogglePlaying, editors, allClientNames }: {
  editorName: string;
  rowsByStatus: Record<string, DisplayRow[]>;
  onPushToStatus: (id: string, newStatus: string, mergedIds?: string[]) => void;
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onTogglePlaying: (id: string, currentlyPlaying: boolean, mergedIds?: string[]) => void;
  editors: { name: string; isVideoEditor: boolean; whatsapp?: string }[];
  allClientNames: string[];
}) {
  const { toast } = useToast();
  const [nextUpOpen, setNextUpOpen] = useState(false);
  const groupedByStage = useMemo(() => {
    const result: { key: string; label: string; rows: DisplayRow[] }[] = [];
    for (const stageKey of EDITOR_STAGE_ORDER) {
      const stage = STAGES.find(s => s.key === stageKey);
      if (!stage) continue;
      const rows = (rowsByStatus[stageKey] || []).filter(r => r.editor === editorName);
      if (rows.length > 0) {
        result.push({ key: stageKey, label: stage.label, rows });
      }
    }
    // Running progress cards on top, then paused progress, then rest
    const PROGRESS_KEYS = new Set(['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS']);
    result.sort((a, b) => {
      const aHasRunning = PROGRESS_KEYS.has(a.key) && a.rows.some(r => r.isPlaying) ? 2 : PROGRESS_KEYS.has(a.key) ? 1 : 0;
      const bHasRunning = PROGRESS_KEYS.has(b.key) && b.rows.some(r => r.isPlaying) ? 2 : PROGRESS_KEYS.has(b.key) ? 1 : 0;
      return bHasRunning - aHasRunning;
    });
    return result;
  }, [editorName, rowsByStatus]);

  const allEditorRows = useMemo(() => {
    const rows: DisplayRow[] = [];
    for (const stage of STAGES) {
      (rowsByStatus[stage.key] || []).filter(r => r.editor === editorName).forEach(r => rows.push({ ...r, videoEditStatus: stage.key }));
    }
    return rows;
  }, [editorName, rowsByStatus]);

  const totalAssigned = allEditorRows.length;

  // Current: highest urgency in EDIT_ON_PROGRESS for this editor
  const currentEdit = useMemo(() => {
    const rows = (rowsByStatus['EDIT_ON_PROGRESS'] || []).filter(r => r.editor === editorName);
    if (!rows.length) return null;
    return [...rows].sort((a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0))[0];
  }, [rowsByStatus, editorName]);

  // Next: highest urgency in EDIT_LAB/QUEUE for this editor
  const nextEdit = useMemo(() => {
    const combined = [
      ...(rowsByStatus['EDIT_LAB'] || []).filter(r => r.editor === editorName),
      ...(rowsByStatus['QUEUE'] || []).filter(r => r.editor === editorName),
    ];
    if (!combined.length) return null;
    return [...combined].sort((a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0))[0];
  }, [rowsByStatus, editorName]);

  // Last finalized
  const lastFinalized = useMemo(() => {
    const rows = (rowsByStatus['FINALIZED'] || []).filter(r => r.editor === editorName);
    if (!rows.length) return null;
    return [...rows].sort((a, b) => (b.registeredDateTimeAD || '').localeCompare(a.registeredDateTimeAD || ''))[0];
  }, [rowsByStatus, editorName]);

  const finalizedCount = (rowsByStatus['FINALIZED'] || []).filter(r => r.editor === editorName).length;
  const reEditRows = (rowsByStatus['RE_EDIT_ON_PROGRESS'] || []).filter(r => r.editor === editorName);

  const statCards = [
    {
      title: "Current", icon: Play, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50",
      content: currentEdit ? (
        <div><p className="font-bold text-sm text-foreground">{currentEdit.clientName}</p><p className="text-xs text-muted-foreground">{currentEdit.eventName} · {currentEdit.editType}</p></div>
      ) : <p className="text-xs text-muted-foreground">Nothing in progress</p>
    },
    {
      title: "Next Up", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50",
      content: nextEdit ? (
        <div><p className="font-bold text-sm text-foreground">{nextEdit.clientName}</p><p className="text-xs text-muted-foreground">{nextEdit.eventName} · {nextEdit.editType}</p></div>
      ) : <p className="text-xs text-muted-foreground">Queue is empty</p>,
      extra: (() => {
        const candidates = NEXT_UP_PRIORITY_STAGES.flatMap(stageKey => {
          const stage = STAGES.find(s => s.key === stageKey);
          return (rowsByStatus[stageKey] || [])
            .filter(r => r.editor === editorName)
            .map(r => ({ ...r, _stageKey: stageKey, _stageLabel: stage?.label || stageKey }));
        });
        if (!candidates.length) return null;
        return (
          <Popover open={nextUpOpen} onOpenChange={setNextUpOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs mt-1 w-full font-semibold">Set Next Edit</Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-3 max-h-80 overflow-y-auto" align="start">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Pick the next edit for {editorName}</p>
              {NEXT_UP_PRIORITY_STAGES.map(stageKey => {
                const stageRows = candidates.filter(r => r._stageKey === stageKey);
                if (!stageRows.length) return null;
                const stageLabel = STAGES.find(s => s.key === stageKey)?.label || stageKey;
                return (
                  <div key={stageKey} className="mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{stageLabel}</p>
                    {stageRows.map(r => (
                      <button
                        key={r.id}
                        className="w-full text-left px-2 py-2 rounded hover:bg-accent flex items-center gap-2 text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onUpdateField(r.id, 'urgency', '5', r.mergedIds);
                          setNextUpOpen(false);
                        }}
                      >
                        <Badge className={cn("text-[10px] px-2 py-0.5 shrink-0", NEXT_UP_STAGE_COLORS[stageKey] || '')}>{stageLabel}</Badge>
                        <span className="font-semibold truncate">{r.clientName}</span>
                        <span className="text-muted-foreground truncate">{r.editType}</span>
                        <UrgencyBadge value={r.urgency || "0"} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        );
      })()
    },
    {
      title: "Last Finalized", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/50",
      content: lastFinalized ? (
        <div><p className="font-bold text-sm text-foreground">{lastFinalized.clientName}</p><p className="text-xs text-muted-foreground">{lastFinalized.eventName} · {lastFinalized.editType}</p></div>
      ) : <p className="text-xs text-muted-foreground">None yet</p>
    },
    {
      title: "Finalized", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50",
      content: <div><p className="font-bold text-2xl text-foreground">{finalizedCount}</p><p className="text-xs text-muted-foreground">Total completed</p></div>
    },
    {
      title: "Re-Edits", icon: RefreshCcw, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/50",
      content: (
        <div>
          <p className="font-bold text-2xl text-foreground">{reEditRows.length}</p>
          {reEditRows.slice(0, 3).map(r => (
            <p key={r.id} className="text-xs text-muted-foreground truncate">{r.clientName} · {r.editType}</p>
          ))}
        </div>
      )
    },
  ];

  const editorInfo = editors.find(e => e.name === editorName);
  const portalUrl = `https://wtnclienttracker.lovable.app/editor-portal/${encodeURIComponent(editorName)}`;
  const mentionOptions = useMemo(() => {
    const names = new Set<string>();
    editors.forEach(e => e.name && names.add(e.name));
    allClientNames.forEach(n => names.add(n));
    return Array.from(names).sort();
  }, [editors, allClientNames]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{editorName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{editorName}</h2>
          <p className="text-xs text-muted-foreground">{totalAssigned} assigned videos</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            const msg = `Hi ${editorName.split(' ')[0]}, here's your editor portal:\n${portalUrl}`;
            if (editorInfo?.whatsapp) {
              openWhatsApp(editorInfo.whatsapp, msg);
            } else {
              navigator.clipboard.writeText(portalUrl);
              toast({ title: "Portal link copied!" });
            }
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          {editorInfo?.whatsapp ? "Send Portal Link" : "Copy Portal Link"}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`${card.bg} border-none shadow-sm`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  <span className={card.color}>{card.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {card.content}
                {'extra' in card && card.extra}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {groupedByStage.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No videos assigned to {editorName}</p>
      ) : (
        groupedByStage.map(group => {
          const borderColor = STAGE_CARD_COLORS[group.key] || "border-l-gray-400";
          return (
            <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${borderColor.replace('border-l-', 'bg-')}`} />
                {group.label}
                <Badge variant="outline" className="text-xs">{group.rows.length}</Badge>
              </h3>
              <div className="grid gap-2">
                {group.rows.map(row => {
                  const isProgressStage = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'].includes(group.key);
                  const isPaused = isProgressStage && !row.isPlaying;
                  const isRunning = isProgressStage && row.isPlaying;
                  const age = getEventAge(row.eventDateAD);

                  // Stage-specific colors for progress cards
                  const stageColors: Record<string, { running: string; paused: string; label: string }> = {
                    EDIT_ON_PROGRESS: {
                      running: "bg-blue-50/90 dark:bg-blue-950/40 ring-2 ring-blue-400/70 shadow-[0_0_24px_rgba(59,130,246,0.3)]",
                      paused: "bg-blue-50/40 dark:bg-blue-950/20 opacity-55",
                      label: "EDIT ON PROGRESS",
                    },
                    COLOR_ON_PROGRESS: {
                      running: "bg-purple-50/90 dark:bg-purple-950/40 ring-2 ring-purple-400/70 shadow-[0_0_24px_rgba(168,85,247,0.3)]",
                      paused: "bg-purple-50/40 dark:bg-purple-950/20 opacity-55",
                      label: "COLOR ON PROGRESS",
                    },
                    RE_EDIT_ON_PROGRESS: {
                      running: "bg-rose-50/90 dark:bg-rose-950/40 ring-2 ring-rose-400/70 shadow-[0_0_24px_rgba(244,63,94,0.3)]",
                      paused: "bg-rose-50/40 dark:bg-rose-950/20 opacity-55",
                      label: "RE-EDIT ON PROGRESS",
                    },
                  };
                  const sc = stageColors[group.key];

                  const stageLabelColors: Record<string, string> = {
                    EDIT_ON_PROGRESS: "text-blue-600 dark:text-blue-400",
                    COLOR_ON_PROGRESS: "text-purple-600 dark:text-purple-400",
                    RE_EDIT_ON_PROGRESS: "text-rose-600 dark:text-rose-400",
                  };

                  return (
                    <div key={row.id} className={cn(
                      `border-l-4 ${borderColor} rounded-xl p-4 shadow-sm transition-all duration-300`,
                      isRunning && sc?.running,
                      isPaused && sc?.paused,
                      !isProgressStage && "bg-card"
                    )}>
                      {/* Top row: client + controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{row.clientName}</p>
                          <p className="text-xs text-muted-foreground">{row.eventName} · {row.editType}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isProgressStage && (
                            <button
                              onClick={() => onTogglePlaying(row.id, row.isPlaying, row.mergedIds)}
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
                                row.isPlaying
                                  ? "bg-amber-200 dark:bg-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-300"
                                  : "bg-green-200 dark:bg-green-800/60 text-green-700 dark:text-green-300 hover:bg-green-300"
                              )}
                              title={row.isPlaying ? "Pause" : "Resume"}
                            >
                              {row.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                          )}
                          <UrgencyBadge value={row.urgency || "0"} />
                          <Select onValueChange={(val) => onPushToStatus(row.id, val, row.mergedIds)}>
                            <SelectTrigger className="h-7 w-28 text-[10px]">
                              <SelectValue placeholder="Move to" />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.filter(s => s.key !== group.key).map(s => (
                                <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Big center stage label for progress cards */}
                      {isProgressStage && (
                        <div className="flex items-center justify-center gap-3 my-3">
                          {isRunning && (
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                            </span>
                          )}
                          {isPaused && <Pause className="w-4 h-4 text-amber-500" />}
                          <span className={cn(
                            "text-lg font-extrabold uppercase tracking-wider",
                            isRunning ? (stageLabelColors[group.key] || "text-foreground") : "text-amber-600 dark:text-amber-400"
                          )}>
                            {isRunning ? sc?.label : "PAUSED"}
                          </span>
                        </div>
                      )}

                      {/* Bottom: age + timer */}
                      <div className="flex items-center gap-2 mt-1">
                        {age && <EventAgeStamp age={age} />}
                        {isProgressStage && row.editStartedAt && (
                          <LiveEditTimer editStartedAt={row.editStartedAt} stageHistory={row.stageHistory} size="card" stageKey={group.key} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Chat Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Chat
        </h3>
        <EditorChat
          editorName={editorName}
          senderName="Admin"
          senderType="admin"
          mentionOptions={mentionOptions}
        />
      </div>
    </div>
  );
}

/* ── Sidebar ── */
type ActiveView = 'dashboard' | 'classic' | 'pipeline' | string;

function VideoEditSidebar({
  activeView,
  onViewChange,
  editors,
  editorCounts,
  activeProgressEditors,
  playingEditors,
  editorStageGroups,
  onSearchClick,
}: {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  editors: { name: string; isVideoEditor: boolean }[];
  editorCounts: Record<string, number>;
  activeProgressEditors: Set<string>;
  playingEditors: Set<string>;
  editorStageGroups: {
    active: string[];
    paused: string[];
    onQueue: string[];
    editLab: string[];
    available: string[];
  };
  onSearchClick?: () => void;
}) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classic' as const, label: 'Classic View', icon: List },
    { id: 'pipeline' as const, label: 'Pipeline View', icon: GitBranch },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  ];

  const renderEditorBtn = (name: string, dotClass: string, nameClass: string) => {
    const isActive = activeView === name;
    const count = editorCounts[name] || 0;
    return (
      <button
        key={name}
        onClick={() => onViewChange(name)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
          isActive
            ? "bg-teal-600/30 text-teal-300 font-semibold"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        )}
      >
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
        <span className={cn("flex-1 text-left truncate", nameClass)}>{name}</span>
        {count > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            isActive ? "bg-teal-500/30 text-teal-200" : "bg-zinc-700 text-zinc-400"
          )}>
            {count}
          </span>
        )}
      </button>
    );
  };

  const renderGroup = (label: string, names: string[], dotClass: string, nameClass: string = "") => {
    if (names.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="space-y-0.5">
          {names.map(name => renderEditorBtn(name, dotClass, nameClass))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-56 min-h-screen bg-zinc-900 text-white border-r border-zinc-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Video Edit</div>
            <div className="text-[10px] text-zinc-400">Tracker</div>
          </div>
          <button
            onClick={onSearchClick}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Search clients (press E twice)"
          >
            <Search className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActiveNav = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActiveNav
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-zinc-800" />

      {/* Editor Groups */}
      <div className="p-3 flex-1 overflow-y-auto space-y-2">
        {renderGroup("Active Editors", editorStageGroups.active, "bg-green-500 animate-editor-pulse", "animate-editor-wave")}
        {renderGroup("Paused Editors", editorStageGroups.paused, "bg-green-500", "")}
        {renderGroup("On Queue", editorStageGroups.onQueue, "bg-yellow-500", "")}
        {renderGroup("Edit Lab", editorStageGroups.editLab, "bg-amber-500", "")}
        {renderGroup("Available", editorStageGroups.available, "bg-zinc-600", "italic")}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-600 text-center">Video Edit Tracker v2.0</div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function DesktopVideoEditTracker() {
  const { rowsByStatus, allRows, isLoading, updateField, pushToStatus, splitRow, mergeRow, togglePlaying, updateDeadline, syncYouTubeLinks } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean; whatsapp?: string }[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterEditType, setFilterEditType] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [filterEditor, setFilterEditor] = useState<string | null>(null);
  const [activeDesktopTab, setActiveDesktopTab] = useState<string>("QUEUE");
  const [pipelineInitialStage, setPipelineInitialStage] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastETime = useRef(0);
  const navigate = useNavigate();

  // Double-E shortcut to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable)) return;
        const now = Date.now();
        if (now - lastETime.current < 400) {
          e.preventDefault();
          setSearchOpen(true);
          setSearchQuery('');
          lastETime.current = 0;
        } else {
          lastETime.current = now;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchOpen]);

  const uniqueClientNames = useMemo(() => {
    const names = new Set<string>();
    for (const stage of STAGES) {
      (rowsByStatus[stage.key] || []).forEach(r => { if (r.clientName) names.add(r.clientName); });
    }
    return Array.from(names).sort();
  }, [rowsByStatus]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return uniqueClientNames.slice(0, 30);
    const q = searchQuery.toLowerCase();
    return uniqueClientNames.filter(n => n.toLowerCase().includes(q));
  }, [searchQuery, uniqueClientNames]);

  const handleSearchSelect = useCallback((name: string) => {
    setFilterClient(name);
    setActiveView('classic');
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const hasFilters = !!(filterClient || filterEditType || filterYear || filterMonth || filterEditor);
  const hasSortOrFilter = hasFilters || sortMode !== 'default';

  useEffect(() => {
    let isActive = true;

    (async () => {
      const { data } = await supabase.from("freelancers_cache").select("name, video_editor, whatsapp_no, contact_no").order("name");
      if (!isActive || !data) return;

      setEditors(
        data
          .filter(f => f.name)
          .map(f => ({ name: f.name!, isVideoEditor: f.video_editor?.toUpperCase() === "YES", whatsapp: f.whatsapp_no || f.contact_no || '' }))
      );
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const years = getBSYearsRange(-2, 3);

  // Editor assignment counts (across non-finalized stages)
  const editorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const nonFinalizedStages = STAGES.filter(s => s.key !== 'FINALIZED');
    for (const stage of nonFinalizedStages) {
      for (const row of (rowsByStatus[stage.key] || [])) {
        if (row.editor) {
          counts[row.editor] = (counts[row.editor] || 0) + 1;
        }
      }
    }
    return counts;
  }, [rowsByStatus]);

  // Editors currently in active progress (green dot)
  const activeProgressEditors = useMemo(() => {
    const progressStages = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'];
    const editors = new Set<string>();
    for (const stageKey of progressStages) {
      (rowsByStatus[stageKey] || []).forEach(r => { if (r.editor) editors.add(r.editor); });
    }
    return editors;
  }, [rowsByStatus]);

  // Editors with actively playing rows
  const playingEditors = useMemo(() => {
    const progressStages = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'];
    const playing = new Set<string>();
    for (const stageKey of progressStages) {
      (rowsByStatus[stageKey] || []).forEach(r => { if (r.editor && r.isPlaying) playing.add(r.editor); });
    }
    return playing;
  }, [rowsByStatus]);

  // Available editors: have been assigned before but NOT in any active progress stage
  const availableEditors = useMemo(() => {
    const allEditorNames = new Set<string>();
    for (const stage of STAGES) {
      (rowsByStatus[stage.key] || []).forEach(r => { if (r.editor) allEditorNames.add(r.editor); });
    }
    const available = Array.from(allEditorNames).filter(name => !activeProgressEditors.has(name)).sort();
    return available.map(name => {
      const editLabRows = (rowsByStatus['EDIT_LAB'] || []).filter(r => r.editor === name);
      const queueRows = (rowsByStatus['QUEUE'] || []).filter(r => r.editor === name);
      const editorInfo = editors.find(e => e.name === name);
      const whatsapp = editorInfo?.whatsapp || '';
      if (editLabRows.length > 0) {
        return { name, stage: 'EDIT_LAB' as const, rows: editLabRows, whatsapp };
      } else if (queueRows.length > 0) {
        return { name, stage: 'QUEUE' as const, rows: queueRows, whatsapp };
      } else {
        return { name, stage: 'NONE' as const, rows: [] as DisplayRow[], whatsapp };
      }
    });
  }, [rowsByStatus, activeProgressEditors, editors]);

  // Active editors per stage (for filter pills in classic view)
  const activeEditorsByStage = useMemo(() => {
    const result: Record<string, { name: string; count: number }[]> = {};
    for (const stage of STAGES) {
      const counts = new Map<string, number>();
      (rowsByStatus[stage.key] || []).forEach(r => {
        if (r.editor) counts.set(r.editor, (counts.get(r.editor) || 0) + 1);
      });
      result[stage.key] = Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [rowsByStatus]);

  // Filtered rows per stage
  const filteredRowsByStatus = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};
    for (const stage of STAGES) {
      result[stage.key] = applyFiltersAndSort(rowsByStatus[stage.key] || [], filterClient, filterEditType, filterYear, filterMonth, sortMode, filterEditor);
    }
    return result;
  }, [rowsByStatus, filterClient, filterEditType, filterYear, filterMonth, sortMode, filterEditor]);

  // Pipeline position map
  const pipelinePosMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stage of STAGES) {
      const stageRows = [...(rowsByStatus[stage.key] || [])].sort(
        (a, b) => (parseInt(b.urgency || '0') || 0) - (parseInt(a.urgency || '0') || 0)
      );
      stageRows.forEach((r, i) => { map[r.id] = i + 1; });
    }
    return map;
  }, [rowsByStatus]);

  const addPipelinePos = (rows: DisplayRow[]) =>
    rows.map(r => ({ ...r, _pipelinePos: pipelinePosMap[r.id] || 0 }));

  const totalCount = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key]?.length || 0), 0);
  const clearAll = () => { setFilterClient(null); setFilterEditType(null); setFilterYear(null); setFilterMonth(null); setFilterEditor(null); setSortMode('default'); };

  const filteredClientSummary = useMemo(() => {
    const total = STAGES.reduce((sum, stage) => sum + (filteredRowsByStatus[stage.key]?.length || 0), 0);
    const untouched = filteredRowsByStatus['QUEUE']?.length || 0;
    const finalized = filteredRowsByStatus['FINALIZED']?.length || 0;

    return {
      total,
      untouched,
      finalized,
      onProgress: total - untouched - finalized,
    };
  }, [filteredRowsByStatus]);

  const handleStageClick = (stageKey: string) => {
    setPipelineInitialStage(stageKey);
    setActiveView('pipeline');
  };

  const isEditorView = activeView !== 'dashboard' && activeView !== 'classic' && activeView !== 'pipeline' && activeView !== 'chat';

  // Compute editor stage groups for sidebar
  const editorStageGroups = useMemo(() => {
    const progressStages = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'];
    const videoEditorNames = editors.filter(e => e.isVideoEditor && e.name).map(e => e.name);
    
    const active: string[] = [];
    const paused: string[] = [];
    const onQueue: string[] = [];
    const editLab: string[] = [];
    const available: string[] = [];

    for (const name of videoEditorNames) {
      const inProgress = progressStages.some(sk => (rowsByStatus[sk] || []).some(r => r.editor === name));
      const isPlayingAny = progressStages.some(sk => (rowsByStatus[sk] || []).some(r => r.editor === name && r.isPlaying));
      const inQueue = (rowsByStatus['QUEUE'] || []).some(r => r.editor === name);
      const inEditLab = (rowsByStatus['EDIT_LAB'] || []).some(r => r.editor === name);

      if (inProgress && isPlayingAny) {
        active.push(name);
      } else if (inProgress) {
        paused.push(name);
      } else if (inQueue) {
        onQueue.push(name);
      } else if (inEditLab) {
        editLab.push(name);
      } else {
        available.push(name);
      }
    }
    return { active, paused, onQueue, editLab, available };
  }, [editors, rowsByStatus]);

  return (
    <div className="flex min-h-screen bg-background">
      <VideoEditSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        editors={editors}
        editorCounts={editorCounts}
        activeProgressEditors={activeProgressEditors}
        playingEditors={playingEditors}
        editorStageGroups={editorStageGroups}
        onSearchClick={() => { setSearchOpen(true); setSearchQuery(''); }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeView === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Total: {totalCount} videos across {STAGES.length} stages</p>
              </div>
              <DashboardView
                rowsByStatus={rowsByStatus}
                allRows={allRows}
                onStageClick={handleStageClick}
                onAssign={(id, editor, mergedIds) => updateField(id, 'editor', editor, mergedIds)}
                availableEditors={availableEditors}
                onPushToStatus={pushToStatus}
                onTogglePlaying={togglePlaying}
                onClientFilter={(name) => { setFilterClient(name); setActiveView('classic'); }}
                onEditorClick={(name) => setActiveView(name)}
              />
            </div>
          </div>
        ) : activeView === 'pipeline' ? (
          <WtnPipelineView onClose={() => setActiveView('dashboard')} inline initialStage={pipelineInitialStage} />
        ) : activeView === 'chat' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[1200px] mx-auto">
              <h1 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Editor Chat
              </h1>
              <EditorChatSection
                editors={editors.filter(e => e.isVideoEditor && e.name).map(e => e.name)}
                mentionOptions={uniqueClientNames.concat(editors.filter(e => e.name).map(e => e.name))}
              />
            </div>
          </div>
        ) : isEditorView ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[1200px] mx-auto">
              <EditorView editorName={activeView} rowsByStatus={rowsByStatus} onPushToStatus={pushToStatus} onUpdateField={updateField} onTogglePlaying={togglePlaying} editors={editors} allClientNames={uniqueClientNames} />
            </div>
          </div>
        ) : (
          /* ── Classic View ── */
          <div className="flex-1 overflow-y-auto">
            <div className="border-b bg-card">
              <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-foreground">Classic View</h1>
                  <p className="text-xs text-muted-foreground">
                    Total: {totalCount} · {STAGES.filter(s => (rowsByStatus[s.key]?.length || 0) > 0).map(s => `${s.label}: ${rowsByStatus[s.key]?.length}`).join(' · ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-6">
              {filterClient ? (
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setFilterClient(null)}>
                        Client: {filterClient} <X className="w-3 h-3" />
                      </Badge>
                      {filterEditType && (
                        <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setFilterEditType(null)}>
                          Type: {filterEditType} <X className="w-3 h-3" />
                        </Badge>
                      )}
                      {filterEditor && (
                        <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setFilterEditor(null)}>
                          Editor: {filterEditor} <X className="w-3 h-3" />
                        </Badge>
                      )}
                      <Select value={filterYear?.toString() || "all"} onValueChange={(v) => setFilterYear(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {years.map(y => <SelectItem key={y} value={y.toString()}>{y} BS</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterMonth?.toString() || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={sortMode === 'urgency' ? 'default' : 'outline'}
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setSortMode(prev => prev === 'urgency' ? 'default' : 'urgency')}
                      >
                        <Flame className="w-3 h-3" /> Urgency
                      </Button>
                      <Button
                        variant={sortMode.startsWith('priority') ? 'default' : 'outline'}
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setSortMode(prev =>
                          prev === 'default' ? 'priority-asc' : prev === 'priority-asc' ? 'priority-desc' : prev === 'priority-desc' ? 'default' : 'priority-asc'
                        )}
                      >
                        {sortMode === 'priority-asc' ? <ArrowUp className="w-3 h-3" /> : sortMode === 'priority-desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
                        Priority
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Clear All</Button>
                    </div>
                    <div className="flex items-center gap-3 text-sm border-t pt-2">
                      <span className="font-semibold text-foreground">Total: {filteredClientSummary.total}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={filteredClientSummary.untouched > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>Untouched: {filteredClientSummary.untouched}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={filteredClientSummary.onProgress > 0 ? "font-medium text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>On Progress: {filteredClientSummary.onProgress}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={filteredClientSummary.finalized > 0 ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}>Finalized: {filteredClientSummary.finalized}</span>
                    </div>
                  </div>
                  {STAGES.map(stage => {
                    const stageRows = filteredRowsByStatus[stage.key] || [];
                    if (stageRows.length === 0) return null;

                    return (
                      <div key={stage.key} className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {stage.label}
                          <Badge variant="outline" className="text-xs">{stageRows.length}</Badge>
                        </h3>
                        <VideoEditTable
                          rows={addPipelinePos(stageRows)}
                          onUpdateField={updateField}
                          onPushToStatus={pushToStatus}
                          onSplit={splitRow}
                          onMerge={mergeRow}
                          onClickClient={(name) => setFilterClient(prev => prev === name ? null : name)}
                          onClickEditType={(type) => setFilterEditType(prev => prev === type ? null : type)}
                          editors={editors}
                          currentStageKey={stage.key}
                          onUpdateDeadline={updateDeadline}
                        />
                      </div>
                    );
                  })}
                  {filteredClientSummary.total === 0 && (
                    <p className="text-center text-muted-foreground py-12">No rows found for {filterClient}</p>
                  )}
                </div>
              ) : (
                <Tabs defaultValue="QUEUE" onValueChange={(v) => setActiveDesktopTab(v)}>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <TabsList className="mb-2 w-max">
                      {STAGES.map(stage => (
                        <TabsTrigger key={stage.key} value={stage.key} className="gap-1 text-xs whitespace-nowrap">
                          {stage.label} ({filteredRowsByStatus[stage.key]?.length || 0})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Filter Bar */}
                  <div className="mb-4 rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                      {filterEditType && (
                        <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setFilterEditType(null)}>
                          Type: {filterEditType} <X className="w-3 h-3" />
                        </Badge>
                      )}
                      {filterEditor && (
                        <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setFilterEditor(null)}>
                          Editor: {filterEditor} <X className="w-3 h-3" />
                        </Badge>
                      )}
                      <Select value={filterYear?.toString() || "all"} onValueChange={(v) => setFilterYear(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {years.map(y => <SelectItem key={y} value={y.toString()}>{y} BS</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterMonth?.toString() || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={sortMode === 'urgency' ? 'default' : 'outline'}
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setSortMode(prev => prev === 'urgency' ? 'default' : 'urgency')}
                      >
                        <Flame className="w-3 h-3" /> Urgency
                      </Button>
                      <Button
                        variant={sortMode.startsWith('priority') ? 'default' : 'outline'}
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setSortMode(prev =>
                          prev === 'default' ? 'priority-asc' : prev === 'priority-asc' ? 'priority-desc' : prev === 'priority-desc' ? 'default' : 'priority-asc'
                        )}
                      >
                        {sortMode === 'priority-asc' ? <ArrowUp className="w-3 h-3" /> : sortMode === 'priority-desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
                        Priority
                      </Button>
                      {hasSortOrFilter && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Clear All</Button>
                      )}
                    </div>
                    {/* Editor filter pills */}
                    {(activeEditorsByStage[activeDesktopTab] || []).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Editors:</span>
                        {(activeEditorsByStage[activeDesktopTab] || []).map(({ name, count }) => (
                          <button
                            key={name}
                            onClick={() => setFilterEditor(prev => prev === name ? null : name)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                              filterEditor === name
                                ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                                : 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-800 hover:shadow-sm'
                            }`}
                          >
                            {name} ({count})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {STAGES.map(stage => (
                    <TabsContent key={stage.key} value={stage.key}>
                      <VideoEditTable
                        rows={addPipelinePos(filteredRowsByStatus[stage.key] || [])}
                        onUpdateField={updateField}
                        onPushToStatus={pushToStatus}
                        onSplit={splitRow}
                        onMerge={mergeRow}
                        onClickClient={(name) => setFilterClient(prev => prev === name ? null : name)}
                        onClickEditType={(type) => setFilterEditType(prev => prev === type ? null : type)}
                        editors={editors}
                        currentStageKey={stage.key}
                        onUpdateDeadline={updateDeadline}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Search Client
            </DialogTitle>
            <DialogDescription>
              Type to search or press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">E</kbd> twice to open
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={searchInputRef}
            placeholder="Search client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                handleSearchSelect(searchResults[0]);
              }
            }}
          />
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>
            ) : (
              searchResults.map(name => {
                const total = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key] || []).filter(r => r.clientName === name).length, 0);
                return (
                  <button
                    key={name}
                    onClick={() => handleSearchSelect(name)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground">{name}</span>
                    <Badge variant="outline" className="text-[10px]">{total} videos</Badge>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
