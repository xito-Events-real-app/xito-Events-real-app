import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingEditorChat } from "@/components/video-edit/FloatingEditorChat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, Pause, Image, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackerRow {
  id: string;
  client_name: string | null;
  event_name: string | null;
  edit_type: string | null;
  editor: string | null;
  photo_edit_status: string | null;
  urgency: string | null;
  is_playing: boolean;
  playing_since: string | null;
  edit_started_at: string | null;
  stage_history: string;
  deadline: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  QUEUE: "Queue",
  EDIT_LAB: "Edit Lab",
  EDIT_ON_PROGRESS: "Edit on Progress",
  EXPORTED: "Exported",
  CLIENT_REVIEW: "Client Review",
  RE_EDIT_ON_PROGRESS: "Re-Edit on Progress",
  FINALIZED: "Finalized",
};

const STAGE_COLORS: Record<string, string> = {
  QUEUE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  EDIT_LAB: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  EDIT_ON_PROGRESS: "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100",
  EXPORTED: "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
  CLIENT_REVIEW: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  RE_EDIT_ON_PROGRESS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  FINALIZED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const PROGRESS_STAGES = new Set(["EDIT_ON_PROGRESS", "RE_EDIT_ON_PROGRESS"]);

function PortalTimer({ editStartedAt, stageHistory, stageKey }: { editStartedAt: string; stageHistory?: string; stageKey?: string }) {
  const [now, setNow] = useState(Date.now());
  const isFinalized = stageKey === "FINALIZED";

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
    const lines = stageHistory.trim().split("\n");
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

  return (
    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
      <Timer className="w-4 h-4" />
      <span className="text-base font-black tracking-tight font-mono">
        {days > 0 && <>{days}D </>}
        {hrs}H {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

export default function PhotoEditorPortal() {
  const { editorName: rawName } = useParams<{ editorName: string }>();
  const editorName = decodeURIComponent(rawName || "");
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentionOptions, setMentionOptions] = useState<string[]>([]);

  const loadRows = useCallback(async () => {
    const { data } = await supabase
      .from("photo_edit_tracker")
      .select("id, client_name, event_name, edit_type, editor, photo_edit_status, urgency, is_playing, playing_since, edit_started_at, stage_history, deadline")
      .eq("editor", editorName)
      .eq("deleted", false)
      .order("urgency", { ascending: false });

    if (data) setRows(data as TrackerRow[]);
    setIsLoading(false);
  }, [editorName]);

  useEffect(() => {
    loadRows();
    (async () => {
      const [{ data: freelancers }, { data: clients }] = await Promise.all([
        supabase.from("freelancers_cache").select("name").order("name"),
        supabase.from("photo_edit_tracker").select("client_name").eq("deleted", false),
      ]);
      const names = new Set<string>();
      freelancers?.forEach((f: any) => f.name && names.add(f.name));
      clients?.forEach((c: any) => c.client_name && names.add(c.client_name));
      setMentionOptions(Array.from(names).sort());
    })();
  }, [loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel("photo-editor-portal-tracker")
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_edit_tracker" }, () => setTimeout(loadRows, 500))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRows]);

  const togglePlaying = async (row: TrackerRow) => {
    const newIsPlaying = !row.is_playing;
    const now = new Date().toISOString();
    const historyEntry = `${newIsPlaying ? "RESUMED" : "PAUSED"} [${now}]`;
    const existing = row.stage_history || "";
    const updated = existing ? `${existing}\n${historyEntry}` : historyEntry;

    await supabase
      .from("photo_edit_tracker")
      .update({ is_playing: newIsPlaying, playing_since: newIsPlaying ? now : null, stage_history: updated, updated_at: now })
      .eq("id", row.id);

    setTimeout(loadRows, 300);
  };

  const groupedByStage = useMemo(() => {
    const stageOrder = ["EDIT_ON_PROGRESS", "RE_EDIT_ON_PROGRESS", "EDIT_LAB", "QUEUE", "EXPORTED", "CLIENT_REVIEW", "FINALIZED"];
    const groups: { key: string; label: string; rows: TrackerRow[] }[] = [];
    for (const sk of stageOrder) {
      const stageRows = rows.filter((r) => (r.photo_edit_status || "QUEUE").toUpperCase() === sk);
      if (stageRows.length > 0) groups.push({ key: sk, label: STAGE_LABELS[sk] || sk, rows: stageRows });
    }
    return groups;
  }, [rows]);

  const currentEdit = useMemo(() => rows.find((r) => PROGRESS_STAGES.has((r.photo_edit_status || "").toUpperCase()) && r.is_playing), [rows]);
  const currentInProgress = useMemo(() => {
    return [...rows].filter((r) => (r.photo_edit_status || "") === "EDIT_ON_PROGRESS").sort((a, b) => Number(b.urgency || 0) - Number(a.urgency || 0))[0] || null;
  }, [rows]);
  const nextUp = useMemo(() => {
    return [...rows]
      .filter((r) => ["EDIT_LAB", "QUEUE", "RE_EDIT_ON_PROGRESS"].includes((r.photo_edit_status || "").toUpperCase()))
      .sort((a, b) => Number(b.urgency || 0) - Number(a.urgency || 0))[0] || null;
  }, [rows]);
  const lastFinalized = useMemo(() => {
    return [...rows]
      .filter((r) => (r.photo_edit_status || "").toUpperCase() === "FINALIZED")
      .sort((a, b) => (b.edit_started_at || "").localeCompare(a.edit_started_at || ""))[0] || null;
  }, [rows]);
  const finalizedCount = rows.filter((r) => (r.photo_edit_status || "").toUpperCase() === "FINALIZED").length;
  const reEditCount = rows.filter((r) => (r.photo_edit_status || "").toUpperCase() === "RE_EDIT_ON_PROGRESS").length;

  if (!editorName) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground">Invalid editor link</p></div>;
  }

  const statCards = [
    { title: "Current", row: currentInProgress, value: null },
    { title: "Next Up", row: nextUp, value: null },
    { title: "Last Finalized", row: lastFinalized, value: null },
    { title: "Finalized", row: null, value: finalizedCount },
    { title: "Re-Edits", row: null, value: reEditCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{editorName}</h1>
              <p className="text-xs text-muted-foreground">Photo Editor Portal · {rows.length} tasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {statCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    {card.row ? (
                      <>
                        <p className="font-semibold text-sm text-foreground truncate">{card.row.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{card.row.event_name} · {card.row.edit_type}</p>
                      </>
                    ) : (
                      <p className="font-bold text-xl text-foreground">{card.value ?? 0}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentEdit && (
              <Card className="border-2 border-green-500/50 shadow-lg shadow-green-500/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Currently Working On</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">{currentEdit.client_name}</p>
                      <p className="text-sm text-muted-foreground">{currentEdit.event_name} · {currentEdit.edit_type}</p>
                      <Badge className={cn("mt-2 text-[10px]", STAGE_COLORS[(currentEdit.photo_edit_status || "").toUpperCase()])}>
                        {STAGE_LABELS[(currentEdit.photo_edit_status || "").toUpperCase()]}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <button onClick={() => togglePlaying(currentEdit)} className="w-14 h-14 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shadow-md hover:bg-amber-300 transition-all" title="Pause">
                        <Pause className="w-7 h-7" />
                      </button>
                      {currentEdit.edit_started_at && <PortalTimer editStartedAt={currentEdit.edit_started_at} stageHistory={currentEdit.stage_history} stageKey={(currentEdit.photo_edit_status || "").toUpperCase()} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {groupedByStage.map((group) => {
              const isProgress = PROGRESS_STAGES.has(group.key);
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <Badge variant="outline" className="text-xs">{group.rows.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.rows.map((row) => (
                      <Card key={row.id} className={cn("transition-all", isProgress && row.is_playing && "ring-2 ring-green-400/50 shadow-md", isProgress && !row.is_playing && "opacity-60")}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{row.client_name}</p>
                            <p className="text-xs text-muted-foreground">{row.event_name} · {row.edit_type}</p>
                            {row.urgency && parseInt(row.urgency) >= 3 && <Badge className="mt-1 text-[10px] bg-destructive/10 text-destructive">Urgency: {row.urgency}</Badge>}
                            {row.edit_started_at && <div className="mt-1"><PortalTimer editStartedAt={row.edit_started_at} stageHistory={row.stage_history} stageKey={group.key} /></div>}
                          </div>
                          {isProgress && (
                            <button
                              onClick={() => togglePlaying(row)}
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all",
                                row.is_playing ? "bg-amber-200 text-amber-700 hover:bg-amber-300" : "bg-green-200 text-green-700 hover:bg-green-300"
                              )}
                              title={row.is_playing ? "Pause" : "Resume"}
                            >
                              {row.is_playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="text-center text-muted-foreground py-20">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tasks assigned yet</p>
              </div>
            )}
          </>
        )}
      </div>

      <FloatingEditorChat editors={[editorName]} mentionOptions={mentionOptions} senderName={editorName} senderType="editor" />
    </div>
  );
}
