import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Camera, Video, HardDrive, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";

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

interface Props {
  registeredDateTimeAD: string;
  clientName: string;
}

export default function ClientFileStatusSection({ registeredDateTimeAD }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.from("files_management").select("*")
          .eq("registered_date_time_ad", registeredDateTimeAD).eq("deleted_or_not", false);
        setFiles(((data as any[]) || []).filter(r => !r.event_date_ad?.includes('**')) as FileRecord[]);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [registeredDateTimeAD]);

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

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading file status...</div>;
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-semibold text-slate-400">No file records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" />
          Files Status
        </h2>
        {fileStats.allCopied ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs px-3">ALL COPIED</Badge>
        ) : (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs px-3">
            {fileStats.remaining} remaining
            {fileStats.remainingNames.length > 0 && ` (${fileStats.remainingNames.join(', ')})`}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15"><Camera className="w-5 h-5 text-sky-400" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-sky-400">Photo Size</p>
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

      {/* Event-grouped tables — always expanded */}
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
              {photoFiles.length > 0 && <span className="text-xs font-semibold text-sky-400">📷 {toTB(photoGB)}{photoDevices ? ` (${photoDevices})` : ""}</span>}
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
                      const rowBg = isPhoto ? "bg-cyan-500/8" : "bg-amber-500/8";
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
  );
}
