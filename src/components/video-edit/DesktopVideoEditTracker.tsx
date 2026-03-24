import React, { useState, useEffect, useMemo } from "react";
import { useVideoEditTracker, STAGES, DisplayRow } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Video, MessageSquare, Music, ExternalLink, ChevronDown, ChevronRight, Loader2, Ungroup, Group, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Flame, Workflow, FolderOpen } from "lucide-react";
import { WtnPipelineView } from "./WtnPipelineView";
import { FileDetailsExpander } from "./FileDetailsExpander";
import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";

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
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
            <TableHead className="w-12 text-center">Notes</TableHead>
            <TableHead className="w-12 text-center">Songs</TableHead>
            <TableHead className="w-32 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                No rows found
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => {
            const isExpanded = expandedRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
              <TableRow className="hover:bg-muted/30">
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
                <TableCell colSpan={12} className="p-0 bg-muted/20 border-b-2 border-primary/20">
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

export function DesktopVideoEditTracker() {
  const { rowsByStatus, allRows, isLoading, updateField, pushToStatus, splitRow, mergeRow } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);
  const [showPipeline, setShowPipeline] = useState(false);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterEditType, setFilterEditType] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [filterEditor, setFilterEditor] = useState<string | null>(null);
  const [activeDesktopTab, setActiveDesktopTab] = useState<string>("QUEUE");

  const hasFilters = !!(filterClient || filterEditType || filterYear || filterMonth || filterEditor);
  const hasSortOrFilter = hasFilters || sortMode !== 'default';

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

  const years = getBSYearsRange(-2, 3);

  // Cross-pipeline stats for client filter
  const clientPipelineStats = useMemo(() => {
    if (!filterClient) return null;
    const stats: Record<string, number> = {};
    for (const stage of STAGES) {
      const count = (rowsByStatus[stage.key] || []).filter(r => r.clientName === filterClient).length;
      stats[stage.key] = count;
    }
    return stats;
  }, [filterClient, rowsByStatus]);

  // Active editors per stage (for filter pills)
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

  // Compute pipeline position (urgency-sorted rank within each stage)
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

  // "All" tab rows - combined from all stages when filters active
  const allFilteredRows = useMemo(() => {
    if (!hasFilters) return [];
    const combined: DisplayRow[] = [];
    for (const stage of STAGES) {
      const stageRows = filteredRowsByStatus[stage.key] || [];
      combined.push(...stageRows.map(r => ({ ...r, _stageName: stage.label } as any)));
    }
    return combined;
  }, [filteredRowsByStatus, hasFilters]);

  const totalCount = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key]?.length || 0), 0);
  const clearAll = () => { setFilterClient(null); setFilterEditType(null); setFilterYear(null); setFilterMonth(null); setFilterEditor(null); setSortMode('default'); };

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
          <Button
            onClick={() => setShowPipeline(true)}
            className="rounded-full w-10 h-10 bg-green-600 hover:bg-green-500 text-white shadow-lg p-0"
          >
            <Workflow className="w-5 h-5" />
          </Button>
        </div>

      {showPipeline && <WtnPipelineView onClose={() => setShowPipeline(false)} />}
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          filterClient ? (
            /* ── Stacked Client Detail View ── */
            (() => {
              const total = STAGES.reduce((s, st) => s + (filteredRowsByStatus[st.key]?.length || 0), 0);
              const untouched = filteredRowsByStatus['QUEUE']?.length || 0;
              const finalized = filteredRowsByStatus['FINALIZED']?.length || 0;
              const onProgress = total - untouched - finalized;
              return (
                <div className="space-y-6">
                  {/* Filter Bar */}
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
                      <span className="font-semibold text-foreground">Total: {total}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={untouched > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>Untouched: {untouched}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={onProgress > 0 ? "font-medium text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>On Progress: {onProgress}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={finalized > 0 ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}>Finalized: {finalized}</span>
                    </div>
                  </div>

                  {/* Stacked sections per stage */}
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
                        />
                      </div>
                    );
                  })}
                  {total === 0 && (
                    <p className="text-center text-muted-foreground py-12">No rows found for {filterClient}</p>
                  )}
                </div>
              );
            })()
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
                />
              </TabsContent>
            ))}
          </Tabs>
          )
        )}
      </div>
    </div>
  );
}
