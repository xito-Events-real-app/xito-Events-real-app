import { useState, useEffect, useMemo } from "react";
import { useVideoEditTracker, STAGES, DisplayRow } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Ungroup, Group, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800",
  "3": "bg-yellow-100 text-yellow-800",
  "4": "bg-orange-100 text-orange-800",
  "5": "bg-red-100 text-red-800",
};

function getRowBSDate(row: DisplayRow): { year: number; month: number } | null {
  if (!row.eventDateAD) return null;
  try {
    const d = new Date(row.eventDateAD);
    if (isNaN(d.getTime())) return null;
    const bs = adToBS(d);
    return { year: bs.year, month: bs.month };
  } catch { return null; }
}

type SortMode = 'default' | 'urgency' | 'priority-asc' | 'priority-desc';

function applyFilters(
  rows: DisplayRow[],
  filterClient: string | null,
  filterEditType: string | null,
  filterYear: number | null,
  filterMonth: number | null,
  sortMode: SortMode = 'default',
): DisplayRow[] {
  let result = rows.filter(row => {
    if (filterClient && row.clientName !== filterClient) return false;
    if (filterEditType && row.editType !== filterEditType) return false;
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

function VideoCard({
  row,
  index,
  onUpdateField,
  onPushToStatus,
  onSplit,
  onMerge,
  onClickClient,
  onClickEditType,
  editors,
  currentStageKey,
}: {
  row: DisplayRow;
  index: number;
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  onSplit?: (mergeKey: string) => void;
  onMerge?: (mergeKey: string) => void;
  onClickClient?: (name: string) => void;
  onClickEditType?: (type: string) => void;
  editors: { name: string; isVideoEditor: boolean }[];
  currentStageKey: string;
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
          <button onClick={() => onClickClient?.(row.clientName)} className="font-semibold text-sm truncate hover:text-primary hover:underline text-left">
            {row.clientName}
          </button>
          <p className="text-xs text-muted-foreground truncate">{row.subEventName || row.eventName}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onClickEditType?.(row.editType)}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20"
          >
            {row.editType}
          </button>
          {row.isMerged && row.mergeKey && (
            <button onClick={() => onSplit?.(row.mergeKey!)} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors">
              <Ungroup className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {!row.isMerged && row.canMerge && row.mergeKey && (
            <button onClick={() => onMerge?.(row.mergeKey!)} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors">
              <Group className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.id, "urgency", v, row.mergedIds)}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            {["1", "2", "3", "4", "5"].map(u => <SelectItem key={u} value={u}>Urgency {u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "editor", v === "unassigned" ? "" : v, row.mergedIds)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Editor..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {editors.filter(e => e.isVideoEditor && e.name).map(e => <SelectItem key={e.name} value={e.name}>⭐ {e.name}</SelectItem>)}
            {editors.filter(e => !e.isVideoEditor && e.name).map(e => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Select onValueChange={(v) => onPushToStatus?.(row.id, v, row.mergedIds)}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue placeholder="Move to..." />
        </SelectTrigger>
        <SelectContent>
          {STAGES.filter(s => s.key !== currentStageKey).map(s => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MobileVideoEditTracker() {
  const { rowsByStatus, isLoading, updateField, pushToStatus, splitRow, mergeRow } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterEditType, setFilterEditType] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const hasFilters = !!(filterClient || filterEditType || filterYear || filterMonth);
  const hasSortOrFilter = hasFilters || sortMode !== 'default';
  const years = getBSYearsRange(-2, 3);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("freelancers_cache").select("name, video_editor").order("name");
      if (data) {
        setEditors(data.filter(f => f.name).map(f => ({ name: f.name!, isVideoEditor: f.video_editor?.toUpperCase() === "YES" })));
      }
    })();
  }, []);

  const clientPipelineStats = useMemo(() => {
    if (!filterClient) return null;
    const stats: Record<string, number> = {};
    for (const stage of STAGES) {
      stats[stage.key] = (rowsByStatus[stage.key] || []).filter(r => r.clientName === filterClient).length;
    }
    return stats;
  }, [filterClient, rowsByStatus]);

  const filteredRowsByStatus = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};
    for (const stage of STAGES) {
      result[stage.key] = applyFilters(rowsByStatus[stage.key] || [], filterClient, filterEditType, filterYear, filterMonth, sortMode);
    }
    return result;
  }, [rowsByStatus, filterClient, filterEditType, filterYear, filterMonth, sortMode]);

  const allFilteredRows = useMemo(() => {
    if (!hasFilters) return [];
    const combined: DisplayRow[] = [];
    for (const stage of STAGES) combined.push(...(filteredRowsByStatus[stage.key] || []));
    return combined;
  }, [filteredRowsByStatus, hasFilters]);

  const clearAll = () => { setFilterClient(null); setFilterEditType(null); setFilterYear(null); setFilterMonth(null); setSortMode('default'); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-foreground">Video Edit</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="QUEUE">
            <div className="overflow-x-auto -mx-4 px-4">
              <TabsList className="w-max mb-2">
                {STAGES.map(stage => (
                  <TabsTrigger key={stage.key} value={stage.key} className="text-xs whitespace-nowrap">
                    {stage.label} ({filteredRowsByStatus[stage.key]?.length || 0})
                  </TabsTrigger>
                ))}
                {hasFilters && (
                  <TabsTrigger value="ALL" className="text-xs whitespace-nowrap">
                    All ({allFilteredRows.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Filter Bar */}
            <div className="mb-3 rounded-lg border bg-card p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {filterClient && (
                  <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterClient(null)}>
                    {filterClient} <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
                {filterEditType && (
                  <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterEditType(null)}>
                    {filterEditType} <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
                <Select value={filterYear?.toString() || "all"} onValueChange={(v) => setFilterYear(v === "all" ? null : Number(v))}>
                  <SelectTrigger className="w-20 h-6 text-[10px]"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMonth?.toString() || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}>
                  <SelectTrigger className="w-20 h-6 text-[10px]"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={clearAll}>Clear</Button>
                )}
              </div>
              {clientPipelineStats && (
                <div className="flex items-center gap-1 flex-wrap text-[10px] text-muted-foreground border-t pt-1.5">
                  {STAGES.filter(s => clientPipelineStats[s.key] > 0).map(s => (
                    <span key={s.key} className="text-foreground font-medium">
                      {s.label}: {clientPipelineStats[s.key]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {STAGES.map(stage => (
              <TabsContent key={stage.key} value={stage.key}>
                <div className="space-y-3">
                  {(filteredRowsByStatus[stage.key] || []).map((row, i) => (
                    <VideoCard
                      key={row.id}
                      row={row}
                      index={i}
                      onUpdateField={updateField}
                      onPushToStatus={pushToStatus}
                      onSplit={splitRow}
                      onMerge={mergeRow}
                      onClickClient={(name) => setFilterClient(prev => prev === name ? null : name)}
                      onClickEditType={(type) => setFilterEditType(prev => prev === type ? null : type)}
                      editors={editors}
                      currentStageKey={stage.key}
                    />
                  ))}
                  {(filteredRowsByStatus[stage.key]?.length || 0) === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No items in {stage.label}</p>
                  )}
                </div>
              </TabsContent>
            ))}
            {hasFilters && (
              <TabsContent value="ALL">
                <div className="space-y-3">
                  {allFilteredRows.map((row, i) => (
                    <VideoCard
                      key={row.id}
                      row={row}
                      index={i}
                      onUpdateField={updateField}
                      onPushToStatus={pushToStatus}
                      onSplit={splitRow}
                      onMerge={mergeRow}
                      onClickClient={(name) => setFilterClient(prev => prev === name ? null : name)}
                      onClickEditType={(type) => setFilterEditType(prev => prev === type ? null : type)}
                      editors={editors}
                      currentStageKey="ALL"
                    />
                  ))}
                  {allFilteredRows.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No items match filters</p>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
