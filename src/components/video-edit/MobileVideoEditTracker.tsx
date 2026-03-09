import { useState, useEffect } from "react";
import { useVideoEditTracker } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Video, RefreshCw, Sparkles, FlaskConical, ArrowRight, Loader2 } from "lucide-react";
import { VideoEditRow } from "@/lib/video-edit-api";
import { supabase } from "@/integrations/supabase/client";

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800",
  "3": "bg-yellow-100 text-yellow-800",
  "4": "bg-orange-100 text-orange-800",
  "5": "bg-red-100 text-red-800",
};

function VideoCard({
  row,
  index,
  onUpdateField,
  onPushToLab,
  editors,
  showPushToLab,
}: {
  row: VideoEditRow;
  index: number;
  onUpdateField: (rowNumber: number, field: string, value: string) => void;
  onPushToLab?: (rowNumber: number) => void;
  editors: { name: string; isVideoEditor: boolean }[];
  showPushToLab: boolean;
}) {
  const urgCls = URGENCY_COLORS[row.urgency] || URGENCY_COLORS["1"];
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${urgCls}`}>
              {row.urgency || "-"}
            </span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground/10 text-xs font-bold">
              {row.priority}
            </span>
          </div>
          <p className="font-semibold text-sm truncate">{row.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">{row.subEventName || row.eventName}</p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium shrink-0">
          {row.editType}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.rowNumber, "urgency", v)}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            {["1", "2", "3", "4", "5"].map(u => <SelectItem key={u} value={u}>Urgency {u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.rowNumber, "editor", v === "unassigned" ? "" : v)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Editor..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {editors.filter(e => e.isVideoEditor && e.name).map(e => <SelectItem key={e.name} value={e.name}>⭐ {e.name}</SelectItem>)}
            {editors.filter(e => !e.isVideoEditor && e.name).map(e => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showPushToLab && (
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={() => onPushToLab?.(row.rowNumber)}>
          <FlaskConical className="w-3 h-3" /> Push to Lab <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export function MobileVideoEditTracker() {
  const { queueRows, labRows, isLoading, isGenerating, updateField, pushToLab, generateRows, refresh } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("freelancers_cache").select("name, video_editor").order("name");
      if (data) {
        setEditors(data.filter(f => f.name).map(f => ({ name: f.name!, isVideoEditor: f.video_editor?.toUpperCase() === "YES" })));
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-foreground">Video Edit</h1>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-red-500 to-pink-600 text-white" onClick={generateRows} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="queue">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="queue" className="flex-1 gap-1 text-xs">
                <Video className="w-3 h-3" /> Queue ({queueRows.length})
              </TabsTrigger>
              <TabsTrigger value="lab" className="flex-1 gap-1 text-xs">
                <FlaskConical className="w-3 h-3" /> Lab ({labRows.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="queue">
              <div className="space-y-3">
                {queueRows.map((row, i) => (
                  <VideoCard key={row.rowNumber} row={row} index={i} onUpdateField={updateField} onPushToLab={pushToLab} editors={editors} showPushToLab />
                ))}
                {queueRows.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No items in queue</p>}
              </div>
            </TabsContent>
            <TabsContent value="lab">
              <div className="space-y-3">
                {labRows.map((row, i) => (
                  <VideoCard key={row.rowNumber} row={row} index={i} onUpdateField={updateField} editors={editors} showPushToLab={false} />
                ))}
                {labRows.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No items in lab</p>}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
