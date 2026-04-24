import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PhotoEditRow,
  getPhotoEditRows,
  updatePhotoEditField as apiUpdateField,
  pushPhotoToStatus as apiPushToStatus,
  ensurePhotoEditRows,
  syncPhotoRowsWithDeliverables,
} from "@/lib/photo-edit-api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export const STAGES = [
  { key: 'QUEUE', label: 'Queue', nextStatus: 'EDIT_LAB', nextLabel: 'Edit Lab' },
  { key: 'EDIT_LAB', label: 'Edit Lab', nextStatus: 'EDIT_ON_PROGRESS', nextLabel: 'Edit on Progress' },
  { key: 'EDIT_ON_PROGRESS', label: 'Edit on Progress', nextStatus: 'EXPORTED', nextLabel: 'Exported' },
  { key: 'EXPORTED', label: 'Exported', nextStatus: 'CLIENT_REVIEW', nextLabel: 'Client Review' },
  { key: 'CLIENT_REVIEW', label: 'Client Review', nextStatus: 'RE_EDIT_ON_PROGRESS', nextLabel: 'Re-Edit' },
  { key: 'RE_EDIT_ON_PROGRESS', label: 'Re-Edit on Progress', nextStatus: 'FINALIZED', nextLabel: 'Finalized' },
  { key: 'FINALIZED', label: 'Finalized', nextStatus: null, nextLabel: null },
] as const;

export type Stage = typeof STAGES[number];

export interface DisplayRow extends PhotoEditRow {
  isMerged: boolean;
  mergedIds?: string[];
  mergeKey?: string;
  canMerge?: boolean;
}

export function usePhotoEditTracker() {
  const [rows, setRows] = useState<PhotoEditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadRows = useCallback(async () => {
    try {
      const data = await getPhotoEditRows();
      setRows(data || []);
    } catch (err: any) {
      toast({ title: "Error loading photo edit data", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await ensurePhotoEditRows();
        await syncPhotoRowsWithDeliverables();
        const data = await getPhotoEditRows();
        setRows(data || []);
      } catch (err) {
        console.error("[PHOTO-EDIT] Init error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const deliverablesChannel = supabase
      .channel('photo-edit-deliverables-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_deliverables' }, () => {
        setTimeout(async () => {
          try {
            await ensurePhotoEditRows();
            await syncPhotoRowsWithDeliverables();
            await loadRows();
          } catch (err) {
            console.error("[PHOTO-EDIT] Realtime sync error:", err);
          }
        }, 0);
      })
      .subscribe();

    const trackerChannel = supabase
      .channel('photo-edit-tracker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_edit_tracker' }, () => {
        setTimeout(() => loadRows(), 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deliverablesChannel);
      supabase.removeChannel(trackerChannel);
    };
  }, [loadRows]);

  const withPriority = useCallback((input: PhotoEditRow[]): PhotoEditRow[] => {
    const sorted = [...input].sort((a, b) => {
      const dateA = a.eventDateAD || "9999";
      const dateB = b.eventDateAD || "9999";
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const regA = a.registeredDateTimeAD || "";
      const regB = b.registeredDateTimeAD || "";
      if (regA !== regB) return regA.localeCompare(regB);

      const evA = a.eventName || "";
      const evB = b.eventName || "";
      return evA.localeCompare(evB);
    });
    return sorted.map((r, i) => ({ ...r, priority: String(i + 1) }));
  }, []);

  const today = getTodayStr();

  const rowsByStatus = useMemo(() => {
    const map: Record<string, PhotoEditRow[]> = {};
    for (const stage of STAGES) {
      let filtered: PhotoEditRow[];
      if (stage.key === 'QUEUE') {
        filtered = rows.filter(r => (r.photoEditStatus || 'QUEUE').toUpperCase() === 'QUEUE' && r.eventDateAD && r.eventDateAD <= today);
      } else {
        filtered = rows.filter(r => (r.photoEditStatus || '').toUpperCase() === stage.key);
      }
      map[stage.key] = withPriority(filtered);
    }
    return map;
  }, [rows, withPriority, today]);

  const displayRowsByStatus = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};
    for (const stage of STAGES) {
      result[stage.key] = (rowsByStatus[stage.key] || []).map((r, i) => ({ ...r, isMerged: false, canMerge: false, priority: String(i + 1) }));
    }
    return result;
  }, [rowsByStatus]);

  const updateField = useCallback(async (id: string, field: string, value: string, _mergedIds?: string[]) => {
    try {
      await apiUpdateField(id, field, value);
      setTimeout(() => loadRows(), 0);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const pushToStatus = useCallback(async (id: string, newStatus: string, _mergedIds?: string[]) => {
    const stageLabel = STAGES.find(s => s.key === newStatus)?.label || newStatus;
    try {
      await apiPushToStatus(id, newStatus);
      toast({ title: `Moved to ${stageLabel}` });
      setTimeout(() => loadRows(), 0);
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const togglePlaying = useCallback(async (id: string, currentlyPlaying: boolean, _mergedIds?: string[]) => {
    const newIsPlaying = !currentlyPlaying;
    const now = new Date().toISOString();
    const historyEntry = `${newIsPlaying ? "RESUMED" : "PAUSED"} [${now}]`;

    try {
      const { data: currentRows } = await supabase
        .from("photo_edit_tracker")
        .select("id, stage_history")
        .eq("id", id);

      const row = currentRows?.[0];
      const updated = row?.stage_history ? `${row.stage_history}\n${historyEntry}` : historyEntry;

      await supabase
        .from("photo_edit_tracker")
        .update({
          is_playing: newIsPlaying,
          playing_since: newIsPlaying ? now : null,
          stage_history: updated,
          updated_at: now,
        })
        .eq("id", id);

      setTimeout(() => loadRows(), 0);
    } catch (err: any) {
      toast({ title: "Toggle failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const updateDeadline = useCallback(async (id: string, deadline: string | null, _mergedIds?: string[]) => {
    try {
      await supabase.from("photo_edit_tracker").update({ deadline, updated_at: new Date().toISOString() }).eq("id", id);
      setTimeout(() => loadRows(), 0);
    } catch (err: any) {
      toast({ title: "Deadline update failed", description: err.message, variant: "destructive" });
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
    splitRow: async () => {},
    mergeRow: async () => {},
    togglePlaying,
    updateDeadline,
    syncYouTubeLinks: async () => {},
    STAGES,
  };
}
