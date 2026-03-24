import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useVideoEditTracker, STAGES, DisplayRow } from "@/hooks/useVideoEditTracker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter, Flame, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "3": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "4": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "5": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STAGE_COLORS: Record<string, string> = {
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

const CONNECTOR_COLORS: Record<string, string> = {
  QUEUE: "bg-gray-300 dark:bg-gray-600",
  EDIT_LAB: "bg-blue-300 dark:bg-blue-700",
  EDIT_ON_PROGRESS: "bg-blue-400 dark:bg-blue-600",
  COLOR_QUEUE: "bg-purple-300 dark:bg-purple-700",
  COLOR_LAB: "bg-purple-400 dark:bg-purple-600",
  COLOR_ON_PROGRESS: "bg-violet-400 dark:bg-violet-600",
  EXPORT_QUEUE: "bg-amber-300 dark:bg-amber-700",
  EXPORTED: "bg-amber-400 dark:bg-amber-600",
  CLIENT_REVIEW: "bg-orange-400 dark:bg-orange-600",
  RE_EDIT_ON_PROGRESS: "bg-red-400 dark:bg-red-600",
  FINALIZED: "bg-green-400 dark:bg-green-600",
};

type SortMode = 'default' | 'urgency' | 'priority-asc' | 'priority-desc';

function getRowBSDate(row: DisplayRow): { year: number; month: number } | null {
  if (!row.eventDateAD) return null;
  try {
    const d = new Date(row.eventDateAD);
    if (isNaN(d.getTime())) return null;
    const bs = adToBS(d);
    return { year: bs.year, month: bs.month };
  } catch { return null; }
}

function applyFiltersAndSort(
  rows: DisplayRow[],
  filterClient: string | null,
  filterEditType: string | null,
  filterYear: number | null,
  filterMonth: number | null,
  sortMode: SortMode,
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

interface PipelineCardProps {
  row: DisplayRow & { _stageKey?: string };
  index: number;
  stageKey: string;
  editors: { name: string; isVideoEditor: boolean }[];
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  isDragTarget: boolean;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

function PipelineCard({
  row, index, stageKey, editors, onUpdateField, onPushToStatus,
  isDragTarget, onDragStart, onDragOver, onDragEnd, onDrop,
}: PipelineCardProps) {
  const urgCls = URGENCY_COLORS[row.urgency] || URGENCY_COLORS["1"];
  const borderCls = STAGE_COLORS[stageKey] || "border-l-muted";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(row.id)}
      onDragOver={(e) => onDragOver(e, row.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, row.id)}
      className={`
        relative w-[200px] min-w-[200px] rounded-xl border-l-4 ${borderCls}
        border border-border bg-card shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing
        ${isDragTarget ? 'ring-2 ring-primary scale-105' : ''}
      `}
    >
      {/* Drag handle */}
      <div className="absolute top-1 right-1 text-muted-foreground/40">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="p-3 space-y-2">
        {/* Priority + Urgency */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground/10 text-[10px] font-bold">
            {index + 1}
          </span>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${urgCls}`}>
            {row.urgency || "-"}
          </span>
        </div>

        {/* Client name */}
        <p className="font-semibold text-xs leading-tight truncate text-foreground">
          {row.clientName}
        </p>

        {/* Event */}
        <p className="text-[10px] text-muted-foreground truncate">
          {row.subEventName || row.eventName}
        </p>

        {/* Edit type */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-medium truncate max-w-full">
          {row.editType}
        </span>

        {/* Event date */}
        {row.eventDateAD && (
          <p className="text-[10px] text-muted-foreground">{row.eventDateAD}</p>
        )}

        {/* Urgency selector */}
        <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.id, "urgency", v, row.mergedIds)}>
          <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            {["1", "2", "3", "4", "5"].map(u => (
              <SelectItem key={u} value={u}>Urgency {u}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Editor selector */}
        <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "editor", v === "unassigned" ? "" : v, row.mergedIds)}>
          <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Editor..." /></SelectTrigger>
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

        {/* Move to */}
        <Select onValueChange={(v) => onPushToStatus?.(row.id, v, row.mergedIds)}>
          <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Move to..." /></SelectTrigger>
          <SelectContent>
            {STAGES.filter(s => s.key !== stageKey).map(s => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface SnakeGridProps {
  rows: (DisplayRow & { _stageKey?: string })[];
  stageKey: string;
  editors: { name: string; isVideoEditor: boolean }[];
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  cardsPerRow: number;
}

function SnakeGrid({ rows, stageKey, editors, onUpdateField, onPushToStatus, cardsPerRow }: SnakeGridProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Sync orderedIds with rows
  useEffect(() => {
    setOrderedIds(prev => {
      const rowIdSet = new Set(rows.map(r => r.id));
      const existing = prev.filter(id => rowIdSet.has(id));
      const existingSet = new Set(existing);
      const newIds = rows.filter(r => !existingSet.has(r.id)).map(r => r.id);
      return [...existing, ...newIds];
    });
  }, [rows]);

  const orderedRows = useMemo(() => {
    const rowMap = new Map(rows.map(r => [r.id, r]));
    return orderedIds.map(id => rowMap.get(id)).filter(Boolean) as (DisplayRow & { _stageKey?: string })[];
  }, [orderedIds, rows]);

  const handleDragStart = useCallback((id: string) => setDragId(id), []);
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDropTargetId(id);
  }, []);
  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { handleDragEnd(); return; }
    setOrderedIds(prev => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(dragId);
      const toIdx = arr.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragId);
      return arr;
    });
    handleDragEnd();
  }, [dragId, handleDragEnd]);

  if (orderedRows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No items</p>;
  }

  // Build snake rows
  const gridRows: (DisplayRow & { _stageKey?: string })[][] = [];
  for (let i = 0; i < orderedRows.length; i += cardsPerRow) {
    gridRows.push(orderedRows.slice(i, i + cardsPerRow));
  }

  const connectorCls = CONNECTOR_COLORS[stageKey] || "bg-muted";

  return (
    <div className="space-y-0">
      {gridRows.map((rowCards, rowIdx) => {
        const isReversed = rowIdx % 2 !== 0;
        const displayCards = isReversed ? [...rowCards].reverse() : rowCards;
        const isLastRow = rowIdx === gridRows.length - 1;

        return (
          <div key={rowIdx}>
            {/* Card row */}
            <div className="flex items-center gap-0">
              {displayCards.map((card, cardIdx) => {
                const globalIdx = isReversed
                  ? rowIdx * cardsPerRow + (rowCards.length - 1 - cardIdx)
                  : rowIdx * cardsPerRow + cardIdx;

                return (
                  <div key={card.id} className="flex items-center">
                    <PipelineCard
                      row={card}
                      index={globalIdx}
                      stageKey={card._stageKey || stageKey}
                      editors={editors}
                      onUpdateField={onUpdateField}
                      onPushToStatus={onPushToStatus}
                      isDragTarget={dropTargetId === card.id}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                    />
                    {/* Horizontal connector between cards */}
                    {cardIdx < displayCards.length - 1 && (
                      <div className={`w-6 h-1 rounded-full ${connectorCls} shrink-0`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vertical connector to next row */}
            {!isLastRow && (
              <div className={`flex ${isReversed ? 'justify-start pl-[100px]' : `justify-end pr-[100px]`}`}>
                <div className={`w-1 h-8 rounded-full ${connectorCls}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WtnPipelineView({ onClose }: { onClose: () => void }) {
  const { rowsByStatus, isLoading, updateField, pushToStatus } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState("QUEUE");
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterEditType, setFilterEditType] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const hasFilters = !!(filterClient || filterEditType || filterYear || filterMonth);
  const hasSortOrFilter = hasFilters || sortMode !== 'default';
  const years = getBSYearsRange(-2, 3);

  // Responsive cards per row
  const [cardsPerRow, setCardsPerRow] = useState(4);
  useEffect(() => {
    const update = () => setCardsPerRow(window.innerWidth < 768 ? 2 : window.innerWidth < 1200 ? 3 : 4);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("freelancers_cache").select("name, video_editor").order("name");
      if (data) {
        setEditors(data.filter(f => f.name).map(f => ({ name: f.name!, isVideoEditor: f.video_editor?.toUpperCase() === "YES" })));
      }
    })();
  }, []);

  const filteredRowsByStatus = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};
    for (const stage of STAGES) {
      result[stage.key] = applyFiltersAndSort(rowsByStatus[stage.key] || [], filterClient, filterEditType, filterYear, filterMonth, sortMode);
    }
    return result;
  }, [rowsByStatus, filterClient, filterEditType, filterYear, filterMonth, sortMode]);

  const clearAll = () => { setFilterClient(null); setFilterEditType(null); setFilterYear(null); setFilterMonth(null); setSortMode('default'); };

  const activeRows = useMemo(() => {
    if (activeTab === 'ALL') {
      const combined: (DisplayRow & { _stageKey?: string })[] = [];
      for (const stage of STAGES) {
        (filteredRowsByStatus[stage.key] || []).forEach(r => combined.push({ ...r, _stageKey: stage.key }));
      }
      return combined;
    }
    return (filteredRowsByStatus[activeTab] || []).map(r => ({ ...r, _stageKey: activeTab }));
  }, [activeTab, filteredRowsByStatus]);

  const totalCount = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key]?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-[500] bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">WTN</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">WTN Pipeline</h1>
              <p className="text-[10px] text-muted-foreground">Total: {totalCount}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-card shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-2">
          <div className="overflow-x-auto">
            <div className="flex gap-1 w-max">
              {hasFilters && (
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  All
                </button>
              )}
              {STAGES.map(stage => (
                <button
                  key={stage.key}
                  onClick={() => setActiveTab(stage.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeTab === stage.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {stage.label} ({filteredRowsByStatus[stage.key]?.length || 0})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b bg-card/50 shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {filterClient && (
              <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterClient(null)}>
                Client: {filterClient} <X className="w-2.5 h-2.5" />
              </Badge>
            )}
            {filterEditType && (
              <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterEditType(null)}>
                Type: {filterEditType} <X className="w-2.5 h-2.5" />
              </Badge>
            )}
            <Select value={filterYear?.toString() || "all"} onValueChange={(v) => setFilterYear(v === "all" ? null : Number(v))}>
              <SelectTrigger className="w-24 h-6 text-[10px]"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(y => <SelectItem key={y} value={y.toString()}>{y} BS</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth?.toString() || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}>
              <SelectTrigger className="w-24 h-6 text-[10px]"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={sortMode === 'urgency' ? 'default' : 'outline'}
              size="sm" className="h-6 text-[10px] px-2 gap-0.5"
              onClick={() => setSortMode(prev => prev === 'urgency' ? 'default' : 'urgency')}
            >
              <Flame className="w-2.5 h-2.5" /> Urgency
            </Button>
            <Button
              variant={sortMode.startsWith('priority') ? 'default' : 'outline'}
              size="sm" className="h-6 text-[10px] px-2 gap-0.5"
              onClick={() => setSortMode(prev =>
                prev === 'default' ? 'priority-asc' : prev === 'priority-asc' ? 'priority-desc' : prev === 'priority-desc' ? 'default' : 'priority-asc'
              )}
            >
              {sortMode === 'priority-asc' ? <ArrowUp className="w-2.5 h-2.5" /> : sortMode === 'priority-desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUpDown className="w-2.5 h-2.5" />}
              Priority
            </Button>
            {hasSortOrFilter && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={clearAll}>Clear</Button>
            )}
          </div>
        </div>
      </div>

      {/* Snake pipeline content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <SnakeGrid
              rows={activeRows}
              stageKey={activeTab}
              editors={editors}
              onUpdateField={updateField}
              onPushToStatus={pushToStatus}
              cardsPerRow={cardsPerRow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
