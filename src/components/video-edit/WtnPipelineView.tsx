import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useVideoEditTracker, STAGES, DisplayRow } from "@/hooks/useVideoEditTracker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter, Flame, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, ChevronDown, ChevronRight, FolderOpen, Timer, CalendarIcon } from "lucide-react";
import { FileDetailsExpander } from "./FileDetailsExpander";
import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish, getBSYearsRange, formatBSDate } from "@/lib/nepali-date";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function getEventAgePipeline(eventDateAD: string): { days: number; bsDisplay: string; bsShort: string } | null {
  if (!eventDateAD) return null;
  try {
    const eventDate = new Date(eventDateAD);
    if (isNaN(eventDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - eventDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const bs = adToBS(eventDate);
    return { days, bsDisplay: formatBSDate(bs) };
  } catch { return null; }
}

function getDeadlineInfoPipeline(deadline: string): { text: string; isCrossed: boolean; isClose: boolean } | null {
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
    if (diffMs < 0) return { text: `Crossed ${timeStr} ago`, isCrossed: true, isClose: false };
    return { text: `${timeStr} left`, isCrossed: false, isClose: diffMs < 3 * 24 * 60 * 60 * 1000 };
  } catch { return null; }
}

const URGENCY_COLORS: Record<string, string> = {
  "1": "bg-muted text-muted-foreground",
  "2": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "3": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "4": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "5": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STAGE_BORDER: Record<string, string> = {
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

const STAGE_BG: Record<string, string> = {
  QUEUE: "bg-gray-50/80 dark:bg-gray-900/40",
  EDIT_LAB: "bg-blue-50/80 dark:bg-blue-950/40",
  EDIT_ON_PROGRESS: "bg-blue-100/60 dark:bg-blue-900/40",
  COLOR_QUEUE: "bg-purple-50/80 dark:bg-purple-950/40",
  COLOR_LAB: "bg-purple-100/60 dark:bg-purple-900/40",
  COLOR_ON_PROGRESS: "bg-violet-100/60 dark:bg-violet-900/40",
  EXPORT_QUEUE: "bg-amber-50/80 dark:bg-amber-950/40",
  EXPORTED: "bg-amber-100/60 dark:bg-amber-900/40",
  CLIENT_REVIEW: "bg-orange-50/80 dark:bg-orange-950/40",
  RE_EDIT_ON_PROGRESS: "bg-red-50/80 dark:bg-red-950/40",
  FINALIZED: "bg-green-50/80 dark:bg-green-950/40",
};

const STAGE_BADGE: Record<string, string> = {
  QUEUE: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  EDIT_LAB: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
  EDIT_ON_PROGRESS: "bg-blue-300 text-blue-900 dark:bg-blue-700 dark:text-blue-100",
  COLOR_QUEUE: "bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200",
  COLOR_LAB: "bg-purple-300 text-purple-900 dark:bg-purple-700 dark:text-purple-100",
  COLOR_ON_PROGRESS: "bg-violet-300 text-violet-900 dark:bg-violet-700 dark:text-violet-100",
  EXPORT_QUEUE: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
  EXPORTED: "bg-amber-300 text-amber-900 dark:bg-amber-700 dark:text-amber-100",
  CLIENT_REVIEW: "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200",
  RE_EDIT_ON_PROGRESS: "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200",
  FINALIZED: "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200",
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
  rows: DisplayRow[], filterClient: string | null, filterEditType: string | null,
  filterYear: number | null, filterMonth: number | null, sortMode: SortMode,
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

function getStageLabel(key: string): string {
  return STAGES.find(s => s.key === key)?.label || key;
}

// --- Pipeline Card ---

interface PipelineCardProps {
  row: DisplayRow & { _stageKey?: string; _pipelinePos?: number };
  stageKey: string;
  editors: { name: string; isVideoEditor: boolean }[];
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  isDropBefore: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
}

function PipelineCard({
  row, stageKey, editors, onUpdateField, onPushToStatus,
  isDropBefore, isDragging, onPointerDown,
}: PipelineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const urgCls = URGENCY_COLORS[row.urgency] || URGENCY_COLORS["1"];
  const borderCls = STAGE_BORDER[stageKey] || "border-l-muted";
  const bgCls = STAGE_BG[stageKey] || "bg-card";
  const badgeCls = STAGE_BADGE[stageKey] || "bg-muted text-muted-foreground";
  const pipelineNum = row._pipelinePos ?? 0;

  return (
    <div className="relative flex items-stretch">
      {isDropBefore && (
        <div className="absolute -left-1.5 top-0 bottom-0 w-1.5 bg-primary rounded-full z-10 animate-pulse" />
      )}
      <div
        className={`
          relative ${expanded ? 'w-[480px] min-w-[480px]' : 'w-[320px] min-w-[320px]'} rounded-xl border-l-4 ${borderCls}
          border border-border ${bgCls} shadow-sm hover:shadow-lg transition-all select-none
          ${isDragging ? 'opacity-40 scale-95 shadow-2xl' : ''}
          ${['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'].includes(stageKey) && row.isPlaying ? 'animate-editing-glow' : ''}
          ${['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'].includes(stageKey) && !row.isPlaying ? 'opacity-60' : ''}
        `}
      >
        {/* Drag handle */}
        <div
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground touch-none p-1"
          onPointerDown={(e) => onPointerDown(e, row.id)}
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="p-4 space-y-2">
          {/* Priority + Urgency + Stage Badge */}
          <div className="flex items-center gap-2 flex-wrap pr-8">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground/10 text-sm font-bold">
              #{pipelineNum}
            </span>
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold ${urgCls}`}>
              ⚡{row.urgency || "-"}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeCls}`}>
              {getStageLabel(stageKey)}
            </span>
          </div>

          {/* Client name */}
          <p className="font-bold text-base leading-tight truncate text-foreground">
            {row.clientName}
          </p>

          {/* Sub-event */}
          <p className="text-sm text-muted-foreground truncate">
            {row.subEventName || row.eventName}
          </p>

          {/* Edit type */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-accent/15 text-accent text-sm font-medium truncate max-w-full">
            {row.editType}
          </span>

          {/* Event date with age */}
          {(() => {
            const age = getEventAgePipeline(row.eventDateAD);
            return age ? (
              <p className="text-xs text-muted-foreground">
                📅 {age.bsDisplay} · <span className="font-medium">{age.days}d old</span>
              </p>
            ) : row.eventDateAD ? (
              <p className="text-sm text-muted-foreground">📅 {row.eventDateAD}</p>
            ) : null;
          })()}

          {/* Deadline */}
          {(() => {
            const dl = getDeadlineInfoPipeline(row.deadline);
            return dl ? (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                dl.isCrossed ? "text-red-600 dark:text-red-400" :
                dl.isClose ? "text-amber-600 dark:text-amber-400" :
                "text-green-600 dark:text-green-400"
              )}>
                <CalendarIcon className="w-3 h-3" />
                {dl.text}
              </div>
            ) : null;
          })()}

          {/* Urgency selector */}
          <Select value={row.urgency || "0"} onValueChange={(v) => onUpdateField(row.id, "urgency", v, row.mergedIds)}>
            <SelectTrigger className="w-full h-8 text-sm"><SelectValue placeholder="Urgency" /></SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4", "5"].map(u => (
                <SelectItem key={u} value={u}>Urgency {u}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Editor selector */}
          <Select value={row.editor || "unassigned"} onValueChange={(v) => onUpdateField(row.id, "editor", v === "unassigned" ? "" : v, row.mergedIds)}>
            <SelectTrigger className="w-full h-8 text-sm"><SelectValue placeholder="Editor..." /></SelectTrigger>
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
            <SelectTrigger className="w-full h-8 text-sm"><SelectValue placeholder="Move to..." /></SelectTrigger>
            <SelectContent>
              {STAGES.filter(s => s.key !== stageKey).map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Files expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>
        </div>

        {/* Expanded file details */}
        {expanded && (
          <div className="border-t border-border">
            <FileDetailsExpander
              registeredDateTimeAD={row.registeredDateTimeAD}
              eventName={row.eventName}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}
// --- Snake Grid ---

interface SnakeGridProps {
  rows: (DisplayRow & { _stageKey?: string; _pipelinePos?: number })[];
  stageKey: string;
  editors: { name: string; isVideoEditor: boolean }[];
  onUpdateField: (id: string, field: string, value: string, mergedIds?: string[]) => void;
  onPushToStatus?: (id: string, status: string, mergedIds?: string[]) => void;
  cardsPerRow: number;
}

function SnakeGrid({ rows, stageKey, editors, onUpdateField, onPushToStatus, cardsPerRow }: SnakeGridProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const dragStateRef = useRef<{
    dragId: string | null;
    startX: number; startY: number;
    active: boolean;
  }>({ dragId: null, startX: 0, startY: 0, active: false });
  const dropTargetRef = useRef<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

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
    return orderedIds.map(id => rowMap.get(id)).filter(Boolean).map((r, i) => ({
      ...r,
      _pipelinePos: i + 1,
    })) as (DisplayRow & { _stageKey?: string; _pipelinePos?: number })[];
  }, [orderedIds, rows]);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { dragId: id, startX: e.clientX, startY: e.clientY, active: false };
    setDragId(id);
    dropTargetRef.current = null;
    setDropTargetIdx(null);

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStateRef.current.startX;
      const dy = ev.clientY - dragStateRef.current.startY;
      if (!dragStateRef.current.active && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragStateRef.current.active = true;
      }
      if (!dragStateRef.current.active) return;

      const els = document.querySelectorAll('[data-pipeline-card-idx]');
      let closest: number | null = null;
      let closestDist = Infinity;
      els.forEach(el => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt((ev.clientX - cx) ** 2 + (ev.clientY - cy) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = parseInt(el.getAttribute('data-pipeline-card-idx') || '-1');
        }
      });
      dropTargetRef.current = closest;
      setDropTargetIdx(closest);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);

      const targetIdx = dropTargetRef.current;
      const currentDragId = dragStateRef.current.dragId;

      if (dragStateRef.current.active && currentDragId && targetIdx !== null) {
        setOrderedIds(prev => {
          const arr = [...prev];
          const fromIdx = arr.indexOf(currentDragId);
          if (fromIdx === -1 || targetIdx >= arr.length) return prev;
          const targetId = arr[targetIdx];
          if (currentDragId === targetId) return prev;
          arr.splice(fromIdx, 1);
          const toIdx = arr.indexOf(targetId);
          arr.splice(toIdx, 0, currentDragId);
          return arr;
        });
      }

      dragStateRef.current = { dragId: null, startX: 0, startY: 0, active: false };
      dropTargetRef.current = null;
      setDragId(null);
      setDropTargetIdx(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, []);

  if (orderedRows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No items</p>;
  }

  const gridRows: (DisplayRow & { _stageKey?: string; _pipelinePos?: number })[][] = [];
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
            <div className="flex items-stretch gap-0">
              {displayCards.map((card, cardIdx) => {
                const globalIdx = isReversed
                  ? rowIdx * cardsPerRow + (rowCards.length - 1 - cardIdx)
                  : rowIdx * cardsPerRow + cardIdx;

                return (
                  <div key={card.id} className="flex items-stretch" data-pipeline-card-idx={globalIdx}>
                    <PipelineCard
                      row={card}
                      stageKey={card._stageKey || stageKey}
                      editors={editors}
                      onUpdateField={onUpdateField}
                      onPushToStatus={onPushToStatus}
                      isDragging={dragId === card.id}
                      isDropBefore={dropTargetIdx === globalIdx && dragId !== card.id}
                      onPointerDown={handlePointerDown}
                    />
                    {cardIdx < displayCards.length - 1 && (
                      <div className={`w-8 h-1.5 rounded-full ${connectorCls} shrink-0 self-center`} />
                    )}
                  </div>
                );
              })}
            </div>

            {!isLastRow && (
              <div className={`flex ${isReversed ? 'justify-start pl-[160px]' : `justify-end pr-[160px]`}`}>
                <div className={`w-1.5 h-10 rounded-full ${connectorCls}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Pipeline View ---

export function WtnPipelineView({ onClose, inline = false, initialStage }: { onClose: () => void; inline?: boolean; initialStage?: string }) {
  const { rowsByStatus, isLoading, updateField, pushToStatus } = useVideoEditTracker();
  const [editors, setEditors] = useState<{ name: string; isVideoEditor: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState(initialStage || "QUEUE");
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterEditType, setFilterEditType] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [filterEditor, setFilterEditor] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const isMobile = useIsMobile();

  const hasFilters = !!(filterClient || filterEditType || filterYear || filterMonth || filterEvent || filterEditor);
  const hasSortOrFilter = hasFilters || sortMode !== 'default';
  const years = getBSYearsRange(-2, 3);

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

  // Compute stable pipeline positions from UNFILTERED urgency-sorted rows per stage
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

  // Apply filters (not event filter) and sort, then attach pipeline pos
  const filteredRowsByStatus = useMemo(() => {
    const result: Record<string, (DisplayRow & { _pipelinePos?: number })[]> = {};
    for (const stage of STAGES) {
      let filtered = applyFiltersAndSort(rowsByStatus[stage.key] || [], filterClient, filterEditType, filterYear, filterMonth, sortMode, filterEditor);
      if (filterEvent) {
        filtered = filtered.filter(r => r.editType === filterEvent);
      }
      result[stage.key] = filtered.map(r => ({ ...r, _pipelinePos: pipelinePosMap[r.id] || 0 }));
    }
    return result;
  }, [rowsByStatus, filterClient, filterEditType, filterYear, filterMonth, filterEvent, filterEditor, sortMode, pipelinePosMap]);

  // Get unique edit types for the right sidebar from current stage's UNFILTERED rows
  const editTypes = useMemo(() => {
    const types = new Set<string>();
    if (activeTab === 'ALL') {
      for (const stage of STAGES) {
        (rowsByStatus[stage.key] || []).forEach(r => { if (r.editType) types.add(r.editType); });
      }
    } else {
      (rowsByStatus[activeTab] || []).forEach(r => { if (r.editType) types.add(r.editType); });
    }
    return Array.from(types).sort();
  }, [activeTab, rowsByStatus]);

  // Get unique editors for filter from current stage's UNFILTERED rows
  const activeEditors = useMemo(() => {
    const counts = new Map<string, number>();
    if (activeTab === 'ALL') {
      for (const stage of STAGES) {
        (rowsByStatus[stage.key] || []).forEach(r => { if (r.editor) counts.set(r.editor, (counts.get(r.editor) || 0) + 1); });
      }
    } else {
      (rowsByStatus[activeTab] || []).forEach(r => { if (r.editor) counts.set(r.editor, (counts.get(r.editor) || 0) + 1); });
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, rowsByStatus]);

  const clearAll = () => { setFilterClient(null); setFilterEditType(null); setFilterYear(null); setFilterMonth(null); setFilterEvent(null); setFilterEditor(null); setSortMode('urgency'); };

  const activeRows = useMemo(() => {
    if (activeTab === 'ALL') {
      const combined: (DisplayRow & { _stageKey?: string; _pipelinePos?: number })[] = [];
      for (const stage of STAGES) {
        (filteredRowsByStatus[stage.key] || []).forEach(r => combined.push({ ...r, _stageKey: stage.key }));
      }
      return combined;
    }
    return (filteredRowsByStatus[activeTab] || []).map(r => ({ ...r, _stageKey: activeTab }));
  }, [activeTab, filteredRowsByStatus]);

  const totalCount = STAGES.reduce((sum, s) => sum + (rowsByStatus[s.key]?.length || 0), 0);

  return (
    <div className={inline ? "flex flex-col h-full" : "fixed inset-0 z-[500] bg-background flex flex-col"}>
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
          {!inline && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          )}
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
            {filterEvent && (
              <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterEvent(null)}>
                Event: {filterEvent} <X className="w-2.5 h-2.5" />
              </Badge>
            )}
            {filterEditor && (
              <Badge variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => setFilterEditor(null)}>
                Editor: {filterEditor} <X className="w-2.5 h-2.5" />
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

      {/* Main content: Snake pipeline + Event sidebar */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile: horizontal edit type filter strip */}
        {isMobile && editTypes.length > 0 && (
          <div className="border-b bg-card/30 shrink-0 px-4 py-2 overflow-x-auto">
            <div className="flex gap-1.5 w-max">
              {editTypes.map((type, i) => {
                const colors = [
                  'bg-blue-500 text-white border-blue-600',
                  'bg-purple-500 text-white border-purple-600',
                  'bg-amber-500 text-white border-amber-600',
                  'bg-emerald-500 text-white border-emerald-600',
                  'bg-rose-500 text-white border-rose-600',
                  'bg-cyan-500 text-white border-cyan-600',
                ];
                const inactiveColors = [
                  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
                  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800',
                  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
                  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
                  'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800',
                  'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-800',
                ];
                const colorIdx = i % colors.length;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterEvent(prev => prev === type ? null : type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border-2 ${
                      filterEvent === type ? colors[colorIdx] : inactiveColors[colorIdx]
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Snake pipeline */}
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

          {/* Desktop: right-side edit type filter rail */}
          {!isMobile && editTypes.length > 0 && (
            <div className="w-[220px] shrink-0 border-l bg-card/50 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Edit Types</h3>
                <div className="space-y-2">
                  {editTypes.map((type, i) => {
                    const colors = [
                      'bg-blue-500 text-white border-blue-600 shadow-blue-200 dark:shadow-blue-900',
                      'bg-purple-500 text-white border-purple-600 shadow-purple-200 dark:shadow-purple-900',
                      'bg-amber-500 text-white border-amber-600 shadow-amber-200 dark:shadow-amber-900',
                      'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200 dark:shadow-emerald-900',
                      'bg-rose-500 text-white border-rose-600 shadow-rose-200 dark:shadow-rose-900',
                      'bg-cyan-500 text-white border-cyan-600 shadow-cyan-200 dark:shadow-cyan-900',
                    ];
                    const inactiveColors = [
                      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700',
                      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700',
                      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
                      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
                      'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
                      'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-700',
                    ];
                    const colorIdx = i % colors.length;
                    const isActive = filterEvent === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterEvent(prev => prev === type ? null : type)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                          isActive
                            ? `${colors[colorIdx]} shadow-md`
                            : `${inactiveColors[colorIdx]} hover:shadow-sm`
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
                {/* Editors section */}
                {activeEditors.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-5">Editors</h3>
                    <div className="space-y-2">
                      {activeEditors.map(({ name, count }) => (
                        <button
                          key={name}
                          onClick={() => setFilterEditor(prev => prev === name ? null : name)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                            filterEditor === name
                              ? 'bg-teal-500 text-white border-teal-600 shadow-md'
                              : 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-700 hover:shadow-sm'
                          }`}
                        >
                          {name} ({count})
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
