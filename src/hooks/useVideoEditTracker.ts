import { useState, useEffect, useCallback, useMemo } from "react";
import {
  VideoEditRow,
  getVideoEditRows,
  updateVideoEditField as apiUpdateField,
  pushToStatus as apiPushToStatus,
  ensureVideoEditRows,
  syncWithDeliverables,
} from "@/lib/video-edit-api";
import { scheduleVideoEditPush } from "@/lib/video-edit-push-scheduler";
import { syncYouTubeLinks } from "@/lib/youtube-link-sync";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { pushEditorNotification } from "@/components/video-edit/EditorNotifications";

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

  const loadRows = useCallback(async () => {
    try {
      const data = await getVideoEditRows();
      setRows(data || []);
    } catch (err: any) {
      toast({ title: "Error loading video edit data", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const runYouTubeSync = useCallback(async (currentRows: VideoEditRow[]) => {
    try {
      const count = await syncYouTubeLinks(currentRows);
      if (count > 0) {
        console.log(`[YT-SYNC] Updated ${count} rows with YouTube links`);
        await loadRows();
      }
    } catch (err) {
      console.error("[YT-SYNC] Error:", err);
    }
  }, [loadRows]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await ensureVideoEditRows();
        await syncWithDeliverables();
        const data = await getVideoEditRows();
        setRows(data || []);
        // Run YouTube link sync in background after load
        runYouTubeSync(data || []);
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
            loadRows();
          }, 0);
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
          // Combine youtube links from both rows
          const fvLink = pair.fv.youtubeLink || '';
          const hlLink = pair.hl.youtubeLink || '';
          const combinedLinks = [fvLink, hlLink].filter(Boolean).join(',');
          displayRows.push({
            ...pair.fv,
            youtubeLink: combinedLinks,
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
      // Get the row to find editor for notifications
      const targetRow = rows.find(r => r.id === id || mergedIds?.includes(r.id));
      await Promise.all(ids.map(i => apiUpdateField(i, field, value)));
      scheduleVideoEditPush();

      // Push notification for editor assignment or urgency changes
      if (field === 'editor' && value) {
        pushEditorNotification(value, 'assignment', 'New assignment', `${targetRow?.clientName || 'A video'} - ${targetRow?.editType || ''} has been assigned to you`, id);
      } else if (field === 'urgency' && targetRow?.editor) {
        pushEditorNotification(targetRow.editor, 'urgency', 'Urgency updated', `${targetRow.clientName} - ${targetRow.editType} urgency set to ${value}`, id);
      }

      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows, rows]);

  const pushToStatus = useCallback(async (id: string, newStatus: string, mergedIds?: string[]) => {
    const ids = mergedIds || [id];
    const targetRow = rows.find(r => r.id === id || mergedIds?.includes(r.id));
    const stageLabel = STAGES.find(s => s.key === newStatus)?.label || newStatus;
    try {
      await Promise.all(ids.map(i => apiPushToStatus(i, newStatus)));
      scheduleVideoEditPush();
      toast({ title: `Moved to ${stageLabel}` });

      // Push notification to editor
      if (targetRow?.editor) {
        pushEditorNotification(targetRow.editor, 'status_change', `Moved to ${stageLabel}`, `${targetRow.clientName} - ${targetRow.editType} has been moved to ${stageLabel}`, id);
      }

      setTimeout(() => {
        loadRows();
      }, 0);
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows, rows]);

  const togglePlaying = useCallback(async (id: string, currentlyPlaying: boolean, mergedIds?: string[]) => {
    const ids = mergedIds || [id];
    const newIsPlaying = !currentlyPlaying;
    const now = new Date().toISOString();
    const historyEntry = `${newIsPlaying ? "RESUMED" : "PAUSED"} [${now}]`;

    try {
      // Fetch current stage_history for each row to append pause/resume events
      const { data: currentRows } = await supabase
        .from("video_edit_tracker")
        .select("id, stage_history")
        .in("id", ids);

      const updates = (currentRows || []).map((row) => {
        const existing = row.stage_history || "";
        const updated = existing ? `${existing}\n${historyEntry}` : historyEntry;
        return supabase
          .from("video_edit_tracker")
          .update({
            is_playing: newIsPlaying,
            playing_since: newIsPlaying ? now : null,
            stage_history: updated,
            updated_at: now,
          })
          .eq("id", row.id);
      });

      await Promise.all(updates);
      setTimeout(() => { loadRows(); }, 0);
    } catch (err: any) {
      toast({ title: "Toggle failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const updateDeadline = useCallback(async (id: string, deadline: string | null, mergedIds?: string[]) => {
    const ids = mergedIds || [id];
    try {
      await supabase
        .from("video_edit_tracker")
        .update({
          deadline: deadline,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      setTimeout(() => { loadRows(); }, 0);
    } catch (err: any) {
      toast({ title: "Deadline update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const manualYtSync = useCallback(async () => {
    toast({ title: "Syncing YouTube links..." });
    const count = await syncYouTubeLinks(rows);
    if (count > 0) {
      toast({ title: `Synced ${count} YouTube link${count > 1 ? 's' : ''}` });
      await loadRows();
    } else {
      toast({ title: "No new YouTube links found" });
    }
  }, [rows, loadRows, toast]);

  return {
    rowsByStatus: displayRowsByStatus,
    allRows: rows,
    isLoading,
    updateField,
    pushToStatus,
    refresh: loadRows,
    splitRow,
    mergeRow,
    togglePlaying,
    updateDeadline,
    syncYouTubeLinks: manualYtSync,
    STAGES,
  };
}
