import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileRecord,
  FileMonthData,
  getFileRecords,
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
  const pendingLocalEdits = useRef(new Map<string, number>());

  // Load available months on mount
  useEffect(() => {
    getAvailableFileMonths()
      .then(setAvailableMonths)
      .catch((err) => toast({ title: "Error loading months", description: err.message, variant: "destructive" }));
  }, []);

  const loadFiles = useCallback(async ({ withLoading = true } = {}) => {
    if (!selectedMonth) { setFiles([]); setIsLoading(false); return; }
    try {
      if (withLoading) setIsLoading(true);
      const data = await getFileRecords({ eventMonth: selectedMonth.month, eventYear: selectedMonth.year });
      setFiles(data);
    } catch (err: any) {
      toast({ title: "Error loading files", description: err.message, variant: "destructive" });
    } finally {
      if (withLoading) setIsLoading(false);
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
      if (!cancelled) await loadFiles({ withLoading: true });
    };
    run();

    // Realtime subscription with in-memory patching
    const channel = (supabase as any)
      .channel(`files_mgmt_${selectedMonth.year}_${selectedMonth.month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, (payload: any) => {
        if (cancelled) return;

        setTimeout(() => {
          if (cancelled) return;
          const newRow = payload.new as FileRecord | undefined;
          const oldRow = payload.old as { id?: string } | undefined;
          const eventType = payload.eventType as string;

          // Guard: skip events from our own local edits
          const rowId = newRow?.id || oldRow?.id;
          if (rowId && pendingLocalEdits.current.has(rowId)) return;

          // Viewport filter: only process rows for current month
          if (newRow && (newRow.event_year !== selectedMonth.year || newRow.event_month !== selectedMonth.month)) {
            // If it's a DELETE of a row we have, still process it
            if (eventType !== 'DELETE') return;
          }

          if (eventType === 'INSERT' && newRow) {
            if (newRow.deleted_or_not) return;
            setFiles(prev => {
              if (prev.some(f => f.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            if (newRow.deleted_or_not) {
              setFiles(prev => prev.filter(f => f.id !== newRow.id));
            } else {
              setFiles(prev => {
                const exists = prev.some(f => f.id === newRow.id);
                if (exists) return prev.map(f => f.id === newRow.id ? { ...f, ...newRow } : f);
                return [...prev, newRow];
              });
            }
          } else if (eventType === 'DELETE' && oldRow?.id) {
            setFiles(prev => prev.filter(f => f.id !== oldRow.id));
          }
        }, 0);
      })
      .subscribe();

    return () => {
      cancelled = true;
      (supabase as any).removeChannel(channel);
    };
  }, [selectedMonth?.year, selectedMonth?.month]);

  const update = async (id: string, updates: Partial<FileRecord>) => {
    // Register local edit guard
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);

    // Optimistic state update
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    const result = await updateFileRecord(id, { ...updates, synced_to_sheet: false });
    scheduleFilesPush();
    return result;
  };

  const remove = async (id: string) => {
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);

    setFiles((prev) => prev.filter((f) => f.id !== id));
    await deleteFileRecord(id);
    scheduleFilesPush();
  };

  return { files, isLoading, isEnsuring, availableMonths, update, remove, refresh: loadFiles };
}
