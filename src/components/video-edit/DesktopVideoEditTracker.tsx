import { useState, useEffect } from "react";
import { useVideoEditTracker, STAGES } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Video, MessageSquare, Music, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { VideoEditRow } from "@/lib/video-edit-api";
import { supabase } from "@/integrations/supabase/client";

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "3": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "4": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "5": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

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

function VideoEditTable({
  rows,
  onUpdateField,
  onPushToStatus,
  editors,
  actionLabel,
  nextStatus,
}: {
  rows: VideoEditRow[];
  onUpdateField: (id: string, field: string, value: string) => void;
  onPushToStatus?: (id: string, status: string) => void;
  editors: { name: string; isVideoEditor: boolean }[];
  actionLabel: string | null;
  nextStatus: string | null;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-center">S.No</TableHead>
            <TableHead className="w-16 text-center">Urgency</TableHead>
            <TableHead className="w-14 text-center">Priority</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Edit Type</TableHead>
            <TableHead>Editor</TableHead>
            <TableHead className="w-12 text-center">Notes</TableHead>
            <TableHead className="w-12 text-center">Songs</TableHead>
            {actionLabel && <TableHead className="w-32 text-center">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={actionLabel ? 10 : 9} className="text-center py-12 text-muted-foreground">
                No rows found
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => (
            <TableRow key={row.id} className="hover:bg-muted/30">
              <TableCell className="text-center text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
              <TableCell className="text-center">
                <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.id, "urgency", v)}>
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
              <TableCell className="font-medium text-sm">{row.clientName}</TableCell>
              <TableCell>
                <div className="text-sm">{row.subEventName || row.eventName}</div>
                {row.subEventName && (
                  <div className="text-xs text-muted-foreground">{row.eventName}</div>
                )}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium">
                  {row.editType}
                </span>
              </TableCell>
              <TableCell>
                <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "editor", v === "unassigned" ? "" : v)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
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
              {actionLabel && nextStatus && (
                <TableCell className="text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onPushToStatus?.(row.id, nextStatus)}
                  >
                    {actionLabel}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DesktopVideoEditTracker() {
  const { rowsByStatus, isLoading, updateField, pushToStatus } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("freelancers_cache").select("name, video_editor").order("name");
      if (data) {
        setEditors(
          data
            .filter(f => f.name)
            .map(f => ({ name: f.name!, isVideoEditor: f.video_editor?.toUpperCase() === "YES" }))
        );
      }
    })();
  }, []);

  const totalCount = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key]?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Video Edit Tracker</h1>
              <p className="text-xs text-muted-foreground">
                Total: {totalCount} · {STAGES.filter(s => (rowsByStatus[s.key]?.length || 0) > 0).map(s => `${s.label}: ${rowsByStatus[s.key]?.length}`).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="QUEUE">
            <div className="overflow-x-auto -mx-6 px-6">
              <TabsList className="mb-4 w-max">
                {STAGES.map(stage => (
                  <TabsTrigger key={stage.key} value={stage.key} className="gap-1 text-xs whitespace-nowrap">
                    {stage.label} ({rowsByStatus[stage.key]?.length || 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {STAGES.map(stage => (
              <TabsContent key={stage.key} value={stage.key}>
                <VideoEditTable
                  rows={rowsByStatus[stage.key] || []}
                  onUpdateField={updateField}
                  onPushToStatus={pushToStatus}
                  editors={editors}
                  actionLabel={stage.nextLabel}
                  nextStatus={stage.nextStatus}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
