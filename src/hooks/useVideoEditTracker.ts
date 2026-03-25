import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  VideoEditRow,
  getVideoEditRows,
  updateVideoEditField as apiUpdateField,
  pushToStatus as apiPushToStatus,
  ensureVideoEditRows,
  syncWithDeliverables,
} from "@/lib/video-edit-api";
import { scheduleVideoEditPush } from "@/lib/video-edit-push-scheduler";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

const EDIT_TYPE_ORDER: Record<string, number> = {
  'Full Video': 1,
  'Highlights': 2,
  'Reel': 3,
  'Reels': 3,
  'Teaser': 4,
};

function getEditTypePriority(editType: string): number {
  return EDIT_TYPE_ORDER[editType] || 99;
}

export const STAGES = [
  { key: 'QUEUE', label: 'Queue', nextStatus: 'EDIT_LAB', nextLabel: 'Edit Lab' },
  { key: 'EDIT_LAB', label: 'Edit Lab', nextStatus: 'EDIT_ON_PROGRESS', nextLabel: 'Edit on Progress' },
  { key: 'EDIT_ON_PROGRESS', label: 'Edit on Progress', nextStatus: 'COLOR_QUEUE', nextLabel: 'Color Queue' },
  { key: 'COLOR_QUEUE', label: 'Color Queue', nextStatus: 'COLOR_LAB', nextLabel: 'Color Lab' },
  { key: 'COLOR_LAB', label: 'Color Lab', nextStatus: 'COLOR_ON_PROGRESS', nextLabel: 'Color on Progress' },
  { key: 'COLOR_ON_PROGRESS', label: 'Color on Progress', nextStatus: 'EXPORT_QUEUE', nextLabel: 'Export Queue' },
  { key: 'EXPORT_QUEUE', label: 'Export Queue', nextStatus: 'EXPORTED', nextLabel: 'Exported' },
  { key: 'EXPORTED', label: 'Exported', nextStatus: 'CLIENT_REVIEW', nextLabel: 'Client Review' },
  { key: 'CLIENT_REVIEW', label: 'Client Review', nextStatus: 'RE_EDIT_ON_PROGRESS', nextLabel: 'Re-Edit' },
  { key: 'RE_EDIT_ON_PROGRESS', label: 'Re-Edit on Progress', nextStatus: 'FINALIZED', nextLabel: 'Finalized' },
  { key: 'FINALIZED', label: 'Finalized', nextStatus: null, nextLabel: null },
] as const;

export type Stage = typeof STAGES[number];

export interface DisplayRow extends VideoEditRow {
  isMerged: boolean;
  mergedIds?: string[];
  mergeKey?: string;
  canMerge?: boolean;
}

function makeMergeKey(row: VideoEditRow): string {
  return `${row.registeredDateTimeAD}||${row.eventName}||${row.subEventName || ''}`;
}

export function useVideoEditTracker() {
  const [rows, setRows] = useState<VideoEditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const pendingLocalEdit = useRef(false);

  const loadRows = useCallback(async () => {
    try {
      const data = await getVideoEditRows();
      setRows(data || []);
    } catch (err: any) {
      toast({ title: "Error loading video edit data", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await ensureVideoEditRows();
        await syncWithDeliverables();
        await loadRows();
      } catch (err: any) {
        console.error("[VIDEO-EDIT] Init error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const deliverablesChannel = supabase
      .channel('video-edit-deliverables-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_deliverables' },
        () => {
          setTimeout(async () => {
            try {
              await ensureVideoEditRows();
              await syncWithDeliverables();
              await loadRows();
            } catch (err) {
              console.error("[VIDEO-EDIT] Realtime sync error:", err);
            }
          }, 0);
        }
      )
      .subscribe();

    // Live updates from video_edit_tracker table (cross-system sync)
    const trackerChannel = supabase
      .channel('video-edit-tracker-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_edit_tracker' },
        () => {
          setTimeout(() => {
            if (!pendingLocalEdit.current) {
              loadRows();
            }
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliverablesChannel);
      supabase.removeChannel(trackerChannel);
    };
  }, [loadRows]);

  const withPriority = useCallback((input: VideoEditRow[]): VideoEditRow[] => {
    const sorted = [...input].sort((a, b) => {
      const dateA = a.eventDateAD || "9999";
      const dateB = b.eventDateAD || "9999";
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const regA = a.registeredDateTimeAD || "";
      const regB = b.registeredDateTimeAD || "";
      if (regA !== regB) return regA.localeCompare(regB);

      const evA = a.eventName || "";
      const evB = b.eventName || "";
      if (evA !== evB) return evA.localeCompare(evB);

      return getEditTypePriority(a.editType) - getEditTypePriority(b.editType);
    });
    return sorted.map((r, i) => ({ ...r, priority: String(i + 1) }));
  }, []);

  const today = getTodayStr();

  const rowsByStatus = useMemo(() => {
    const map: Record<string, VideoEditRow[]> = {};
    for (const stage of STAGES) {
      let filtered: VideoEditRow[];
      if (stage.key === 'QUEUE') {
        filtered = rows.filter(r =>
          (r.videoEditStatus || 'QUEUE').toUpperCase() === 'QUEUE' &&
          r.eventDateAD && r.eventDateAD <= today
        );
      } else {
        filtered = rows.filter(r =>
          (r.videoEditStatus || '').toUpperCase() === stage.key
        );
      }
      map[stage.key] = withPriority(filtered);
    }
    return map;
  }, [rows, withPriority, today]);

  // Build display rows with merge/split logic using DB force_split flag
  const displayRowsByStatus = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};

    for (const stage of STAGES) {
      const stageRows = rowsByStatus[stage.key] || [];
      const displayRows: DisplayRow[] = [];
      const processed = new Set<string>();

      // Group by merge key
      const byKey: Record<string, VideoEditRow[]> = {};
      for (const r of stageRows) {
        const key = makeMergeKey(r);
        if (!byKey[key]) byKey[key] = [];
        byKey[key].push(r);
      }

      // Find mergeable pairs per key (same subEventName)
      const mergeablePairs: Record<string, { fv: VideoEditRow; hl: VideoEditRow }> = {};
      for (const [key, group] of Object.entries(byKey)) {
        const fv = group.find(r => r.editType === 'Full Video');
        const hl = group.find(r => r.editType === 'Highlights');
        if (fv && hl) {
          mergeablePairs[key] = { fv, hl };
        }
      }

      for (const r of stageRows) {
        if (processed.has(r.id)) continue;
        const key = makeMergeKey(r);
        const pair = mergeablePairs[key];

        // Use force_split from DB: if either row has forceSplit=true, show split
        const isForceSplit = pair ? (pair.fv.forceSplit || pair.hl.forceSplit) : false;

        if (pair && !isForceSplit) {
          // Merge: create synthetic row from Full Video data
          processed.add(pair.fv.id);
          processed.add(pair.hl.id);
          const subLabel = pair.fv.subEventName ? `${pair.fv.subEventName}: ` : '';
          displayRows.push({
            ...pair.fv,
            editType: `${subLabel}Full Video + Highlights`,
            isMerged: true,
            mergedIds: [pair.fv.id, pair.hl.id],
            mergeKey: key,
          });
        } else if (pair && isForceSplit) {
          // Split: show individually with canMerge flag
          displayRows.push({
            ...r,
            isMerged: false,
            canMerge: true,
            mergeKey: key,
          });
        } else {
          displayRows.push({
            ...r,
            isMerged: false,
            canMerge: false,
          });
        }
      }

      // Re-number priority
      result[stage.key] = displayRows.map((r, i) => ({ ...r, priority: String(i + 1) }));
    }

    return result;
  }, [rowsByStatus]);

  const splitRow = useCallback(async (mergeKey: string) => {
    const allStageRows = Object.values(rowsByStatus).flat();
    const pairRows = allStageRows.filter(r => makeMergeKey(r) === mergeKey && (r.editType === 'Full Video' || r.editType === 'Highlights'));
    const ids = pairRows.map(r => r.id);

    try {
      await supabase
        .from("video_edit_tracker")
        .update({ force_split: true, updated_at: new Date().toISOString() })
        .in("id", ids);

      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      console.error("[VIDEO-EDIT] Split error:", err);
      loadRows();
    }
  }, [rowsByStatus, loadRows]);

  const mergeRow = useCallback(async (mergeKey: string) => {
    const allStageRows = Object.values(rowsByStatus).flat();
    const pairRows = allStageRows.filter(r => makeMergeKey(r) === mergeKey && (r.editType === 'Full Video' || r.editType === 'Highlights'));
    const ids = pairRows.map(r => r.id);

    try {
      await supabase
        .from("video_edit_tracker")
        .update({ force_split: false, updated_at: new Date().toISOString() })
        .in("id", ids);

      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      console.error("[VIDEO-EDIT] Merge error:", err);
      loadRows();
    }
  }, [rowsByStatus, loadRows]);

  const updateField = useCallback(async (id: string, field: string, value: string, mergedIds?: string[]) => {
    const ids = mergedIds || [id];
    try {
      await Promise.all(ids.map(i => apiUpdateField(i, field, value)));
      scheduleVideoEditPush();
      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const pushToStatus = useCallback(async (id: string, newStatus: string, mergedIds?: string[]) => {
    const ids = mergedIds || [id];
    try {
      await Promise.all(ids.map(i => apiPushToStatus(i, newStatus)));
      scheduleVideoEditPush();
      toast({ title: `Moved to ${STAGES.find(s => s.key === newStatus)?.label || newStatus}` });
      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  return {
    rowsByStatus: displayRowsByStatus,
    allRows: rows,
    isLoading,
    updateField,
    pushToStatus,
    refresh: loadRows,
    splitRow,
    mergeRow,
    STAGES,
  };
}
