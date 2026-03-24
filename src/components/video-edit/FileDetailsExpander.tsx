import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { HardDrive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FileInfo {
  id: string;
  freelancer_type: string;
  freelancer_name: string;
  side: string;
  card_label: string;
  size_gb: number;
  format_type: string;
  who_copied: string;
  final_generated_path: string;
  backup_1_device_name: string;
  confirmed: boolean;
  double_backup: boolean;
  triple_backup: boolean;
  drive_upload: boolean;
}

interface Props {
  registeredDateTimeAD: string;
  eventName: string;
  compact?: boolean; // For pipeline cards
}

const ROLE_ORDER: Record<string, number> = {
  PB: 1, PG: 2, EP: 3, ASST: 4,
  VB: 10, VG: 11, EV: 12, DRONE: 13, FPV: 14, IPHONE: 15,
};

function isPhotoRole(code: string) {
  return ["PB", "PG", "EP", "ASST"].includes(code.toUpperCase());
}

export function FileDetailsExpander({ registeredDateTimeAD, eventName, compact }: Props) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("files_management")
        .select("id, freelancer_type, freelancer_name, side, card_label, size_gb, format_type, who_copied, final_generated_path, backup_1_device_name, confirmed, double_backup, triple_backup, drive_upload")
        .eq("registered_date_time_ad", registeredDateTimeAD)
        .eq("event_name", eventName)
        .eq("deleted_or_not", false);
      if (!cancelled) {
        setFiles((data as FileInfo[]) || []);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [registeredDateTimeAD, eventName]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const oa = ROLE_ORDER[a.freelancer_type?.toUpperCase()] || 50;
      const ob = ROLE_ORDER[b.freelancer_type?.toUpperCase()] || 50;
      if (oa !== ob) return oa - ob;
      return (a.freelancer_name || "").localeCompare(b.freelancer_name || "");
    });
  }, [files]);

  const totalSizeGB = useMemo(() => files.reduce((s, f) => s + (f.size_gb || 0), 0), [files]);
  const totalSizeLabel = totalSizeGB >= 1024 ? `${(totalSizeGB / 1024).toFixed(1)} TB` : `${totalSizeGB.toFixed(1)} GB`;

  const deviceNames = useMemo(() => {
    const set = new Set<string>();
    files.forEach(f => { if (f.backup_1_device_name) set.add(f.backup_1_device_name); });
    return Array.from(set);
  }, [files]);

  const notCopied = useMemo(() => files.filter(f => !f.final_generated_path), [files]);
  const allCopied = notCopied.length === 0 && files.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-3 px-4">
        <span className="text-xs text-muted-foreground italic">No file records found for this event</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? 'px-2 py-2' : 'px-4 py-3'}`}>
      {/* Summary Line */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-foreground">
          Total Size: <span className="text-primary">{totalSizeLabel}</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="font-medium text-foreground">
          Location:{" "}
          {deviceNames.map((name, i) => (
            <span key={name}>
              {i > 0 && ", "}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="underline decoration-dotted cursor-help text-primary">
                    {name}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold">{name}</p>
                    {files.filter(f => f.backup_1_device_name === name).map(f => (
                      <p key={f.id} className="text-muted-foreground truncate">
                        {f.freelancer_type} ({f.freelancer_name}): {f.final_generated_path || "No path"}
                        {f.card_label ? ` [${f.card_label}]` : ""}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </span>
          ))}
          {deviceNames.length === 0 && <span className="text-muted-foreground">-</span>}
        </span>
        <span className="text-muted-foreground">|</span>
        {allCopied ? (
          <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> ALL FILES COPIED
          </span>
        ) : (
          <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {notCopied.map(f => `${f.freelancer_name}'s Card`).join(", ")} NOT COPIED
          </span>
        )}
      </div>

      {/* Freelancer Details Table */}
      <div className="rounded-lg border overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[10px] w-14">Crew</TableHead>
              <TableHead className="text-[10px]">Freelancer</TableHead>
              <TableHead className="text-[10px] w-16">Side</TableHead>
              <TableHead className="text-[10px] w-14">Card</TableHead>
              <TableHead className="text-[10px] w-14">Size</TableHead>
              <TableHead className="text-[10px] w-16">Format</TableHead>
              <TableHead className="text-[10px] w-16">Copied By</TableHead>
              <TableHead className="text-[10px] w-14 text-center">1x</TableHead>
              <TableHead className="text-[10px] w-10 text-center">2x</TableHead>
              <TableHead className="text-[10px] w-10 text-center">3x</TableHead>
              <TableHead className="text-[10px] w-10 text-center">☁</TableHead>
              <TableHead className="text-[10px]">Path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFiles.map(file => {
              const isPhoto = isPhotoRole(file.freelancer_type || "");
              return (
                <TableRow
                  key={file.id}
                  className={`text-xs ${isPhoto ? 'bg-purple-500/5' : 'bg-amber-500/5'}`}
                >
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1">
                      {file.freelancer_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-xs">{file.freelancer_name}</TableCell>
                  <TableCell className="text-[10px]">{file.side || "-"}</TableCell>
                  <TableCell className="text-[10px]">{file.card_label || "-"}</TableCell>
                  <TableCell className="text-[10px]">{file.size_gb ? `${file.size_gb}GB` : "-"}</TableCell>
                  <TableCell className="text-[10px]">{file.format_type || "-"}</TableCell>
                  <TableCell className="text-[10px]">{file.who_copied || "-"}</TableCell>
                  <TableCell className="text-center text-[10px]">
                    {file.backup_1_device_name ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-green-600 font-bold">✓</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{file.backup_1_device_name}</p></TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-[10px]">{file.double_backup ? "✓" : "-"}</TableCell>
                  <TableCell className="text-center text-[10px]">{file.triple_backup ? "✓" : "-"}</TableCell>
                  <TableCell className="text-center text-[10px]">{file.drive_upload ? "✓" : "-"}</TableCell>
                  <TableCell>
                    {file.final_generated_path ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-[10px] text-foreground underline decoration-dotted truncate max-w-[120px] block">
                            {file.final_generated_path.split("\\").slice(-2).join("\\")}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm"><p className="text-xs font-mono break-all">{file.final_generated_path}</p></TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No path</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
