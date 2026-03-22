import { useState, useEffect, useCallback, useMemo } from "react";
import {
  VideoEditRow,
  getVideoEditRows,
  updateVideoEditField as apiUpdateField,
  pushToLab as apiPushToLab,
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

  // On mount: ensure rows, sync cleanup, then load
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

  // Realtime subscription on client_deliverables for live sync
  useEffect(() => {
    const channel = supabase
      .channel('video-edit-deliverables-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_deliverables' },
        () => {
          // Wrap in setTimeout to avoid React 18 "Should have a queue" error
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

  // Compute priority with multi-level sort: eventDateAD → regDate → eventName → editType
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

  const queueRows = useMemo(() => {
    const filtered = rows.filter(r =>
      (r.videoEditStatus || "QUEUE").toUpperCase() === "QUEUE" &&
      r.eventDateAD && r.eventDateAD <= today
    );
    return withPriority(filtered);
  }, [rows, withPriority, today]);

  const labRows = useMemo(() => {
    const filtered = rows.filter(r =>
      (r.videoEditStatus || "").toUpperCase() === "LAB"
    );
    return withPriority(filtered);
  }, [rows, withPriority]);

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

  const pushToLab = useCallback(async (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, videoEditStatus: "LAB" } : r));
    try {
      await apiPushToLab(id);
      scheduleVideoEditPush();
      toast({ title: "Pushed to Lab" });
    } catch (err: any) {
      toast({ title: "Push failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  return { queueRows, labRows, isLoading, updateField, pushToLab, refresh: loadRows };
}
