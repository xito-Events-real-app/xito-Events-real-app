import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileRecord,
  FileMonthData,
  getFileRecords,
  addFileRecord,
  updateFileRecord,
  deleteFileRecord,
  getAvailableFileMonths,
  ensureFileRowsForMonth,
} from "@/lib/files-api";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";
import { toast } from "@/hooks/use-toast";

export function useFilesManagement(selectedMonth: { year: string; month: string } | null) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<FileMonthData[]>([]);
  const lastLocalUpdate = useRef<number>(0);

  // Load available months on mount
  useEffect(() => {
    getAvailableFileMonths()
      .then(setAvailableMonths)
      .catch((err) => toast({ title: "Error loading months", description: err.message, variant: "destructive" }));
  }, []);

  const loadFiles = useCallback(async () => {
    if (!selectedMonth) { setFiles([]); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const data = await getFileRecords({ eventMonth: selectedMonth.month, eventYear: selectedMonth.year });
      setFiles(data);
    } catch (err: any) {
      toast({ title: "Error loading files", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth?.year, selectedMonth?.month]);

  // When month changes: ensure rows exist, then load
  useEffect(() => {
    if (!selectedMonth) { setFiles([]); setIsLoading(false); return; }

    let cancelled = false;
    const run = async () => {
      setIsEnsuring(true);
      try {
        await ensureFileRowsForMonth(selectedMonth.year, selectedMonth.month);
      } catch (err: any) {
        console.error("ensureFileRowsForMonth error:", err);
      } finally {
        if (!cancelled) setIsEnsuring(false);
      }
      if (!cancelled) await loadFiles();
    };
    run();

    // Realtime subscription with debounce to prevent duplicate ensure calls
    let realtimeTimer: ReturnType<typeof setTimeout>;
    const channel = (supabase as any)
      .channel(`files_mgmt_${selectedMonth.year}_${selectedMonth.month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, () => {
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(() => {
          if (!cancelled && Date.now() - lastLocalUpdate.current > 2000) loadFiles();
        }, 500);
      })
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(realtimeTimer);
      (supabase as any).removeChannel(channel);
    };
  }, [selectedMonth?.year, selectedMonth?.month]);

  const update = async (id: string, updates: Partial<FileRecord>) => {
    lastLocalUpdate.current = Date.now();
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    const result = await updateFileRecord(id, { ...updates, synced_to_sheet: false });
    scheduleFilesPush();
    return result;
  };

  const remove = async (id: string) => {
    lastLocalUpdate.current = Date.now();
    setFiles((prev) => prev.filter((f) => f.id !== id));
    await deleteFileRecord(id);
    scheduleFilesPush();
  };

  return { files, isLoading, isEnsuring, availableMonths, update, remove, refresh: loadFiles };
}
