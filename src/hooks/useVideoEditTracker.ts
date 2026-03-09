import { useState, useEffect, useCallback, useMemo } from "react";
import {
  VideoEditRow,
  getVideoEditRows,
  updateVideoEditField as apiUpdateField,
  pushToLab as apiPushToLab,
  generateVideoEditRows as apiGenerate,
} from "@/lib/video-edit-api";
import { useToast } from "@/hooks/use-toast";

export function useVideoEditTracker() {
  const [rows, setRows] = useState<VideoEditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getVideoEditRows();
      setRows(data || []);
    } catch (err: any) {
      toast({ title: "Error loading video edit data", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadRows(); }, [loadRows]);

  // Compute priority: rank 1..N by event_date_ad ascending
  const withPriority = useCallback((input: VideoEditRow[]): VideoEditRow[] => {
    const sorted = [...input].sort((a, b) => {
      const da = a.eventDateAD || "9999";
      const db = b.eventDateAD || "9999";
      return da.localeCompare(db);
    });
    return sorted.map((r, i) => ({ ...r, priority: String(i + 1) }));
  }, []);

  const queueRows = useMemo(() => {
    const filtered = rows.filter(r => (r.videoEditStatus || "QUEUE").toUpperCase() === "QUEUE");
    return withPriority(filtered);
  }, [rows, withPriority]);

  const labRows = useMemo(() => {
    const filtered = rows.filter(r => (r.videoEditStatus || "").toUpperCase() === "LAB");
    return withPriority(filtered);
  }, [rows, withPriority]);

  const updateField = useCallback(async (rowNumber: number, field: string, value: string) => {
    // Optimistic update
    setRows(prev => prev.map(r => r.rowNumber === rowNumber ? { ...r, [field]: value } : r));
    try {
      await apiUpdateField(rowNumber, field, value);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const pushToLab = useCallback(async (rowNumber: number) => {
    setRows(prev => prev.map(r => r.rowNumber === rowNumber ? { ...r, videoEditStatus: "LAB" } : r));
    try {
      await apiPushToLab(rowNumber);
      toast({ title: "Pushed to Lab" });
    } catch (err: any) {
      toast({ title: "Push failed", description: err.message, variant: "destructive" });
      loadRows();
    }
  }, [toast, loadRows]);

  const generateRows = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await apiGenerate();
      toast({ title: `Generated ${result.generatedCount} rows` });
      await loadRows();
    } catch (err: any) {
      toast({ title: "Generate failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [toast, loadRows]);

  return { queueRows, labRows, isLoading, isGenerating, updateField, pushToLab, generateRows, refresh: loadRows };
}
