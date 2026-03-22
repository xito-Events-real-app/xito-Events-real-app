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
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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

  const updateField = useCallback(async (id: string, field: string, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
      await apiUpdateField(id, field, value);
      scheduleVideoEditPush();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const pushToStatus = useCallback(async (id: string, newStatus: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, videoEditStatus: newStatus } : r));
    try {
      await apiPushToStatus(id, newStatus);
      scheduleVideoEditPush();
      toast({ title: `Moved to ${STAGES.find(s => s.key === newStatus)?.label || newStatus}` });
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  return { rowsByStatus, isLoading, updateField, pushToStatus, refresh: loadRows, STAGES };
}
