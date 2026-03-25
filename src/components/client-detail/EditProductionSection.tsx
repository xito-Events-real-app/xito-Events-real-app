import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Camera, Video, HardDrive, Clock, ChevronDown, ChevronRight, Play, Pause, CheckCircle, Timer, FileText, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "@/hooks/useVideoEditTracker";
import { VideoEditRow } from "@/lib/video-edit-api";
import { adToBS, formatBSDate, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { pushToStatus as apiPushToStatus } from "@/lib/video-edit-api";
import { scheduleVideoEditPush } from "@/lib/video-edit-push-scheduler";
import { useToast } from "@/hooks/use-toast";

interface FileRecord {
  id: string;
  registered_date_time_ad: string;
  client_name: string;
  event_name: string;
  event_year: string;
  event_month: string;
  event_day: string;
  event_date_ad: string;
  freelancer_type: string;
  freelancer_name: string;
  side: string;
  format_type: string;
  size_gb: number;
  number_of_items: number;
  final_generated_path: string;
  backup_1_device_name: string;
  backup_1_recorded_at: string;
  backup_2_path: string;
  backup_2_device_name: string;
  who_copied: string;
  card_label: string;
}

const PHOTO_ROLES = new Set(["PB", "PG", "EP"]);
const VIDEO_ROLES = new Set(["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"]);

function toTB(gb: number) {
  return gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(1)} GB`;
}

function formatNepaliDate(year?: string, month?: string, day?: string): string {
  if (!year || !month) return "-";
  const mIdx = parseInt(String(month));
  const mName = mIdx >= 1 && mIdx <= 12 ? nepaliMonthsEnglish[mIdx - 1] : month;
  return `${mName} ${day || "?"}, ${year}`;
}

/* ── Event Age Stamp ── */
function getEventAge(eventDateAD: string): { days: number; bsShort: string } | null {
  if (!eventDateAD) return null;
  try {
    const eventDate = new Date(eventDateAD);
    if (isNaN(eventDate.getTime())) return null;
    const days = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
    const bs = adToBS(eventDate);
    const monthNames = ["Baisakh","Jestha","Ashar","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
    return { days, bsShort: `${monthNames[bs.month - 1]} ${bs.day}` };
  } catch { return null; }
}

function EventAgeStamp({ age }: { age: { days: number; bsShort: string } }) {
  return (
    <div className="inline-flex flex-col items-center justify-center px-2 py-1 rounded border-2 border-red-500/60 bg-red-500/10 rotate-[-3deg] min-w-[64px]">
      <span className="text-[11px] font-black text-red-600 dark:text-red-400 leading-tight tracking-tight">{age.days}D OLD</span>
      <span className="text-[9px] font-bold text-red-500/80 dark:text-red-400/70 leading-tight uppercase tracking-wide">{age.bsShort}</span>
    </div>
  );
}

/* ── Live Edit Timer ── */
function LiveEditTimer({ editStartedAt, stageHistory, stageKey }: { editStartedAt: string; stageHistory?: string; stageKey?: string }) {
  const [now, setNow] = useState(Date.now());
  const isFinalized = stageKey === 'FINALIZED';

  useEffect(() => {
    if (isFinalized) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isFinalized]);

  if (!editStartedAt) return null;
  const startTime = new Date(editStartedAt).getTime();
  if (isNaN(startTime)) return null;

  let endTime = now;
  if (isFinalized && stageHistory) {
    const lines = stageHistory.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const match = lastLine?.match(/\[(.+)\]/);
    if (match) { const parsed = new Date(match[1]).getTime(); if (!isNaN(parsed)) endTime = parsed; }
  }

  const diffMs = Math.max(0, endTime - startTime);
  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hrs = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const isOverdue = diffMs >= 2 * 24 * 60 * 60 * 1000;

  return (
    <div className={cn("flex items-center gap-1.5", isOverdue ? "text-red-600 dark:text-red-400 animate-pulse" : "text-green-600 dark:text-green-400")}>
      <Timer className="w-4 h-4" />
      <span className="text-base font-black tracking-tight font-mono">
        {days > 0 && <>{days}D </>}{hrs}H <span className="text-sm">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
      </span>
    </div>
  );
}

/* ── Path Pill ── */
function PathPill({ file }: { file: FileRecord }) {
  const path = file.final_generated_path;
  if (!path) return <span className="text-xs text-slate-500">-</span>;
  const deviceName = file.backup_1_device_name || path.split("\\")[0] || path.split("/")[0] || "Device";
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-semibold cursor-default hover:bg-emerald-500/25 transition-colors">
          <HardDrive className="w-3 h-3" />{deviceName}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 bg-slate-800 border-slate-700 p-3">
        <p className="text-xs font-semibold text-slate-300">Full Path</p>
        <p className="text-xs text-white break-all leading-relaxed font-mono">{path}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

const STAGE_CARD_COLORS: Record<string, string> = {
  QUEUE: "border-l-gray-400", EDIT_LAB: "border-l-blue-400", EDIT_ON_PROGRESS: "border-l-blue-600",
  COLOR_QUEUE: "border-l-purple-400", COLOR_LAB: "border-l-purple-600", COLOR_ON_PROGRESS: "border-l-violet-600",
  EXPORT_QUEUE: "border-l-amber-400", EXPORTED: "border-l-amber-600", CLIENT_REVIEW: "border-l-orange-500",
  RE_EDIT_ON_PROGRESS: "border-l-red-500", FINALIZED: "border-l-green-500",
};

const PROGRESS_KEYS = new Set(['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS']);

const stageColors: Record<string, { running: string; paused: string; label: string }> = {
  EDIT_ON_PROGRESS: { running: "bg-blue-50/90 dark:bg-blue-950/40 ring-2 ring-blue-400/70 shadow-[0_0_24px_rgba(59,130,246,0.3)]", paused: "bg-blue-50/40 dark:bg-blue-950/20 opacity-55", label: "EDIT ON PROGRESS" },
  COLOR_ON_PROGRESS: { running: "bg-purple-50/90 dark:bg-purple-950/40 ring-2 ring-purple-400/70 shadow-[0_0_24px_rgba(168,85,247,0.3)]", paused: "bg-purple-50/40 dark:bg-purple-950/20 opacity-55", label: "COLOR ON PROGRESS" },
  RE_EDIT_ON_PROGRESS: { running: "bg-rose-50/90 dark:bg-rose-950/40 ring-2 ring-rose-400/70 shadow-[0_0_24px_rgba(244,63,94,0.3)]", paused: "bg-rose-50/40 dark:bg-rose-950/20 opacity-55", label: "RE-EDIT ON PROGRESS" },
};

const stageLabelColors: Record<string, string> = {
  EDIT_ON_PROGRESS: "text-blue-600 dark:text-blue-400",
  COLOR_ON_PROGRESS: "text-purple-600 dark:text-purple-400",
  RE_EDIT_ON_PROGRESS: "text-rose-600 dark:text-rose-400",
};

interface Props {
  registeredDateTimeAD: string;
  clientName: string;
}

function dbToVideoRow(r: any): VideoEditRow {
  return {
    id: r.id, registeredDateTimeAD: r.registered_date_time_ad, registeredDateBS: r.registered_date_bs || '',
    clientName: r.client_name || '', eventName: r.event_name || '', eventYear: r.event_year || '',
    eventMonth: r.event_month || '', eventDay: r.event_day || '', eventDateAD: r.event_date_ad || '',
    videoEditStatus: r.video_edit_status || 'QUEUE', urgency: r.urgency || '', priority: '',
    subEventName: r.sub_event_name || '', editType: r.edit_type || '', editor: r.editor || '',
    companyNotes: r.company_notes || '', clientDemand: r.client_demand || '', reference: r.reference || '',
    songs: r.songs || '', forceSplit: r.force_split || false, isPlaying: r.is_playing || false,
    playingSince: r.playing_since || '', editStartedAt: r.edit_started_at || '', deadline: r.deadline || '',
    stageHistory: r.stage_history || '',
  };
}

export default function EditProductionSection({ registeredDateTimeAD, clientName }: Props) {
  const [filesOpen, setFilesOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [videoRows, setVideoRows] = useState<VideoEditRow[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const { toast } = useToast();

  // Load files
  useEffect(() => {
    (async () => {
      setIsLoadingFiles(true);
      try {
        const { data } = await supabase.from("files_management").select("*")
          .eq("registered_date_time_ad", registeredDateTimeAD).eq("deleted_or_not", false);
        setFiles(((data as any[]) || []).filter(r => !r.event_date_ad?.includes('**')) as FileRecord[]);
      } catch (e) { console.error(e); }
      finally { setIsLoadingFiles(false); }
    })();
  }, [registeredDateTimeAD]);

  // Load video edit rows
  const loadVideoRows = useCallback(async () => {
    setIsLoadingVideo(true);
    try {
      const { data } = await supabase.from("video_edit_tracker").select("*")
        .eq("registered_date_time_ad", registeredDateTimeAD).eq("deleted", false);
      setVideoRows((data || []).map(dbToVideoRow));
    } catch (e) { console.error(e); }
    finally { setIsLoadingVideo(false); }
  }, [registeredDateTimeAD]);

  useEffect(() => { loadVideoRows(); }, [loadVideoRows]);

  // Realtime for video edits
  useEffect(() => {
    const ch = supabase.channel('edit-section-video-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_edit_tracker' }, () => {
        setTimeout(() => loadVideoRows(), 0);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadVideoRows]);

  // ── Files stats ──
  const fileStats = useMemo(() => {
    const isPhoto = (f: FileRecord) => PHOTO_ROLES.has((f.freelancer_type || "").toUpperCase());
    const isVideo = (f: FileRecord) => VIDEO_ROLES.has((f.freelancer_type || "").toUpperCase());
    const gb = (f: FileRecord) => Number(f.size_gb) || 0;
    const sumGB = (arr: FileRecord[]) => arr.reduce((s, f) => s + gb(f), 0);
    const photoSize = sumGB(files.filter(isPhoto));
    const videoSize = sumGB(files.filter(isVideo));
    const remaining = files.filter(f => !f.final_generated_path);
    const remainingNames = [...new Set(remaining.map(f => f.freelancer_name).filter(Boolean))];
    return { total: files.length, photoSize, videoSize, remaining: remaining.length, remainingNames, allCopied: remaining.length === 0 && files.length > 0 };
  }, [files]);

  // ── Files event groups ──
  const eventGroups = useMemo(() => {
    const map = new Map<string, { eventName: string; year: string; month: string; day: string; files: FileRecord[] }>();
    for (const f of files) {
      const key = `${f.event_name}__${f.event_date_ad}`;
      if (!map.has(key)) map.set(key, { eventName: f.event_name, year: f.event_year, month: f.event_month, day: f.event_day, files: [] });
      map.get(key)!.files.push(f);
    }
    for (const group of map.values()) {
      group.files.sort((a, b) => {
        const aP = PHOTO_ROLES.has((a.freelancer_type || "").toUpperCase());
        const bP = PHOTO_ROLES.has((b.freelancer_type || "").toUpperCase());
        if (aP !== bP) return aP ? -1 : 1;
        return (a.freelancer_name || "").localeCompare(b.freelancer_name || "");
      });
    }
    return Array.from(map.values());
  }, [files]);

  // ── Video stats ──
  const videoStats = useMemo(() => {
    const finalized = videoRows.filter(r => r.videoEditStatus === 'FINALIZED').length;
    const clientReview = videoRows.filter(r => r.videoEditStatus === 'CLIENT_REVIEW').length;
    const remaining = videoRows.length - finalized;
    return { total: videoRows.length, finalized, remaining, clientReview };
  }, [videoRows]);

  // ── Video grouped by stage (editor-view style) ──
  const groupedVideoStages = useMemo(() => {
    const result: { key: string; label: string; rows: VideoEditRow[] }[] = [];
    for (const stage of STAGES) {
      const rows = videoRows.filter(r => (r.videoEditStatus || 'QUEUE').toUpperCase() === stage.key);
      if (rows.length > 0) result.push({ key: stage.key, label: stage.label, rows });
    }
    // Sort: running progress first, then paused progress, then rest
    result.sort((a, b) => {
      const aRank = PROGRESS_KEYS.has(a.key) && a.rows.some(r => r.isPlaying) ? 2 : PROGRESS_KEYS.has(a.key) ? 1 : 0;
      const bRank = PROGRESS_KEYS.has(b.key) && b.rows.some(r => r.isPlaying) ? 2 : PROGRESS_KEYS.has(b.key) ? 1 : 0;
      return bRank - aRank;
    });
    return result;
  }, [videoRows]);

  const handlePushToStatus = useCallback(async (id: string, newStatus: string) => {
    try {
      await apiPushToStatus(id, newStatus);
      scheduleVideoEditPush();
      toast({ title: `Moved to ${STAGES.find(s => s.key === newStatus)?.label || newStatus}` });
      loadVideoRows();
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
    }
  }, [toast, loadVideoRows]);

  const handleTogglePlaying = useCallback(async (id: string, currentlyPlaying: boolean) => {
    try {
      await supabase.from("video_edit_tracker").update({
        is_playing: !currentlyPlaying,
        playing_since: !currentlyPlaying ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      loadVideoRows();
    } catch (err: any) {
      toast({ title: "Toggle failed", description: err.message, variant: "destructive" });
    }
  }, [toast, loadVideoRows]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Film className="w-5 h-5 text-emerald-400" />
        Edit & Production
      </h2>

      {/* ═══ FILES STATUS ═══ */}
      <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-slate-800 bg-slate-900 hover:bg-slate-800/80 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {filesOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <HardDrive className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-bold text-white">Files Status</span>
                </div>
                {isLoadingFiles ? (
                  <span className="text-xs text-slate-500">Loading...</span>
                ) : files.length === 0 ? (
                  <span className="text-xs text-slate-500">No files</span>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-purple-400">📷 {toTB(fileStats.photoSize)}</span>
                    <span className="text-xs font-semibold text-amber-400">🎬 {toTB(fileStats.videoSize)}</span>
                    <span className="text-xs text-slate-400">{fileStats.total} files</span>
                    {fileStats.allCopied ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-2">ALL COPIED</Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] px-2">
                        {fileStats.remaining} remaining
                        {fileStats.remainingNames.length > 0 && ` (${fileStats.remainingNames.join(', ')})`}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-slate-800 bg-slate-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/15"><Camera className="w-5 h-5 text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-400">Photo Size</p>
                    <p className="text-xl font-black text-white tabular-nums">{toTB(fileStats.photoSize)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15"><Video className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">Video Size</p>
                    <p className="text-xl font-black text-white tabular-nums">{toTB(fileStats.videoSize)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/15"><Clock className="w-5 h-5 text-red-400" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-red-400">Remaining</p>
                    <p className="text-xl font-black text-white tabular-nums">{fileStats.remaining}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event-grouped table */}
            {eventGroups.map((group, gi) => {
              const photoFiles = group.files.filter(f => PHOTO_ROLES.has((f.freelancer_type || "").toUpperCase()));
              const videoFiles = group.files.filter(f => VIDEO_ROLES.has((f.freelancer_type || "").toUpperCase()));
              const photoGB = photoFiles.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
              const videoGB = videoFiles.reduce((s, f) => s + (Number(f.size_gb) || 0), 0);
              const remaining = group.files.filter(f => !f.final_generated_path).length;
              const photoDevices = [...new Set(photoFiles.map(f => f.backup_1_device_name).filter(Boolean))].join(", ");
              const videoDevices = [...new Set(videoFiles.map(f => f.backup_1_device_name).filter(Boolean))].join(", ");

              return (
                <div key={gi} className="space-y-3">
                  <div className="bg-blue-900/40 border-l-4 border-blue-500 px-4 py-2.5 rounded-r-lg flex flex-wrap items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    <h3 className="text-base font-bold text-white">{group.eventName || "Event"}</h3>
                    <Badge className="text-xs bg-slate-800 text-slate-300 border-slate-700 px-3 py-1">{formatNepaliDate(group.year, group.month, group.day)}</Badge>
                    <span className="text-xs text-slate-400">{group.files.length} files</span>
                    {photoFiles.length > 0 && <span className="text-xs font-semibold text-purple-400">📷 {toTB(photoGB)}{photoDevices ? ` (${photoDevices})` : ""}</span>}
                    {videoFiles.length > 0 && <span className="text-xs font-semibold text-amber-400">🎬 {toTB(videoGB)}{videoDevices ? ` (${videoDevices})` : ""}</span>}
                    {remaining > 0 && <span className="text-xs font-bold text-red-400 ml-auto">Remaining: {remaining}</span>}
                  </div>

                  <Card className="border-slate-800 bg-slate-900 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="w-[16%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Name</TableHead>
                            <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                            <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Side</TableHead>
                            <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Format</TableHead>
                            <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider text-right">Size</TableHead>
                            <TableHead className="w-[6%] text-slate-400 text-xs font-semibold uppercase tracking-wider text-right">Items</TableHead>
                            <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Copy</TableHead>
                            <TableHead className="w-[8%] text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Backup</TableHead>
                            <TableHead className="w-[10%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Copied By</TableHead>
                            <TableHead className="w-[24%] text-slate-400 text-xs font-semibold uppercase tracking-wider">Path</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.files.map(f => {
                            const copied = !!f.final_generated_path;
                            const hasB2 = !!f.backup_2_path;
                            const isPhoto = PHOTO_ROLES.has((f.freelancer_type || "").toUpperCase());
                            const rowBg = isPhoto ? "bg-purple-500/5" : "bg-amber-500/5";
                            return (
                              <TableRow key={f.id} className={cn("border-slate-800/50 hover:bg-slate-800/30", rowBg)}>
                                <TableCell className="py-3"><span className="text-sm font-semibold text-white truncate block">{f.freelancer_name || "-"}</span></TableCell>
                                <TableCell className="py-3"><span className="text-xs text-slate-300">{f.freelancer_type || "-"}</span></TableCell>
                                <TableCell className="py-3"><span className="text-xs text-slate-300">{f.side || "-"}</span></TableCell>
                                <TableCell className="py-3"><span className="text-xs text-slate-300">{f.format_type || "-"}</span></TableCell>
                                <TableCell className="py-3 text-right"><span className="text-sm font-medium text-white tabular-nums">{f.size_gb || "0"}</span></TableCell>
                                <TableCell className="py-3 text-right"><span className="text-sm font-medium text-white tabular-nums">{f.number_of_items || "0"}</span></TableCell>
                                <TableCell className="py-3 text-center">
                                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full inline-block", copied ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>{copied ? "DONE" : "PENDING"}</span>
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full inline-block", hasB2 ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400")}>{hasB2 ? "DOUBLE" : "SINGLE"}</span>
                                </TableCell>
                                <TableCell className="py-3"><span className="text-xs text-slate-200">{f.who_copied || "-"}</span></TableCell>
                                <TableCell className="py-3"><PathPill file={f} /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ VIDEO EDITS ═══ */}
      <Collapsible open={videoOpen} onOpenChange={setVideoOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-slate-800 bg-slate-900 hover:bg-slate-800/80 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {videoOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <Film className="w-5 h-5 text-teal-400" />
                  <span className="text-base font-bold text-white">Video Edits</span>
                </div>
                {isLoadingVideo ? (
                  <span className="text-xs text-slate-500">Loading...</span>
                ) : videoRows.length === 0 ? (
                  <span className="text-xs text-slate-500">No video edits</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-2">
                      <CheckCircle className="w-3 h-3 mr-1" />{videoStats.finalized} Finalized
                    </Badge>
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-2">
                      {videoStats.remaining} Remaining
                    </Badge>
                    {videoStats.clientReview > 0 && (
                      <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] px-2">
                        {videoStats.clientReview} Client Review
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-4">
            {groupedVideoStages.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No video edit rows for this client</p>
            ) : (
              groupedVideoStages.map(group => {
                const borderColor = STAGE_CARD_COLORS[group.key] || "border-l-gray-400";
                return (
                  <div key={group.key} className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${borderColor.replace('border-l-', 'bg-')}`} />
                      {group.label}
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{group.rows.length}</Badge>
                    </h3>
                    <div className="grid gap-2">
                      {group.rows.map(row => {
                        const isProgressStage = PROGRESS_KEYS.has(group.key);
                        const isPaused = isProgressStage && !row.isPlaying;
                        const isRunning = isProgressStage && row.isPlaying;
                        const age = getEventAge(row.eventDateAD);
                        const sc = stageColors[group.key];

                        return (
                          <div key={row.id} className={cn(
                            `border-l-4 ${borderColor} rounded-xl p-4 shadow-sm transition-all duration-300`,
                            isRunning && sc?.running,
                            isPaused && sc?.paused,
                            !isProgressStage && "bg-slate-900 border border-slate-800"
                          )}>
                            {/* Top: client + controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white">{row.eventName} · {row.editType}</p>
                                {row.editor && <p className="text-xs text-slate-400">Editor: {row.editor}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isProgressStage && (
                                  <button
                                    onClick={() => handleTogglePlaying(row.id, row.isPlaying)}
                                    className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
                                      row.isPlaying
                                        ? "bg-amber-200 dark:bg-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-300"
                                        : "bg-green-200 dark:bg-green-800/60 text-green-700 dark:text-green-300 hover:bg-green-300"
                                    )}
                                  >
                                    {row.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                  </button>
                                )}
                                <Select onValueChange={(val) => handlePushToStatus(row.id, val)}>
                                  <SelectTrigger className="h-7 w-28 text-[10px] bg-slate-800 border-slate-700 text-slate-300">
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
                                  isRunning ? (stageLabelColors[group.key] || "text-white") : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {isRunning ? sc?.label : "PAUSED"}
                                </span>
                              </div>
                            )}

                            {/* Bottom: age + timer */}
                            <div className="flex items-center gap-2 mt-1">
                              {age && <EventAgeStamp age={age} />}
                              {isProgressStage && row.editStartedAt && (
                                <LiveEditTimer editStartedAt={row.editStartedAt} stageHistory={row.stageHistory} stageKey={group.key} />
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
