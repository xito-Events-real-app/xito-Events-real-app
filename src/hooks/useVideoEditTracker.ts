import { useState, useEffect, useCallback, useMemo } from "react";
import {
  VideoEditRow,
  getVideoEditRows,
  updateVideoEditField as apiUpdateField,
  pushToLab as apiPushToLab,
  ensureVideoEditRows,
} from "@/lib/video-edit-api";
import { scheduleVideoEditPush } from "@/lib/video-edit-push-scheduler";
import { useToast } from "@/hooks/use-toast";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
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

  // On mount: ensure rows then load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await ensureVideoEditRows();
        await loadRows();
      } catch (err: any) {
        console.error("[VIDEO-EDIT] Init error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute priority: rank 1..N by event_date_ad ascending
  const withPriority = useCallback((input: VideoEditRow[]): VideoEditRow[] => {
    const sorted = [...input].sort((a, b) => {
      const da = a.eventDateAD || "9999";
      const db = b.eventDateAD || "9999";
      return da.localeCompare(db);
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
    // Optimistic update
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
