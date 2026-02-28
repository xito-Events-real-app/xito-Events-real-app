import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileRecord,
  getFileRecords,
  addFileRecord,
  updateFileRecord,
  deleteFileRecord,
  autoGenerateFileRows,
} from "@/lib/files-api";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";
import { toast } from "@/hooks/use-toast";

export function useFilesManagement(filters?: {
  clientName?: string;
  eventMonth?: string;
  eventYear?: string;
}) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getFileRecords(filters);
      setFiles(data);
    } catch (err: any) {
      toast({ title: "Error loading files", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filters?.clientName, filters?.eventMonth, filters?.eventYear]);

  useEffect(() => {
    loadFiles();

    const channel = (supabase as any)
      .channel("files_management_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, () => {
        loadFiles();
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [loadFiles]);

  const add = async (record: Partial<FileRecord>) => {
    const result = await addFileRecord({ ...record, synced_to_sheet: false });
    setFiles((prev) => [result, ...prev]);
    scheduleFilesPush();
    return result;
  };

  const update = async (id: string, updates: Partial<FileRecord>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    const result = await updateFileRecord(id, { ...updates, synced_to_sheet: false });
    scheduleFilesPush();
    return result;
  };

  const remove = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    await deleteFileRecord(id);
    scheduleFilesPush();
  };

  const generateRows = async (registeredDateTimeAD: string) => {
    try {
      setIsGenerating(true);
      const newRows = await autoGenerateFileRows(registeredDateTimeAD);
      if (newRows.length === 0) {
        toast({ title: "No crew assigned", description: "No freelancer assignments found for this client." });
      } else {
        toast({ title: `${newRows.length} rows generated`, description: "File rows created from crew assignments." });
        await loadFiles();
        scheduleFilesPush();
      }
      return newRows;
    } catch (err: any) {
      toast({ title: "Error generating rows", description: err.message, variant: "destructive" });
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  return { files, isLoading, isGenerating, add, update, remove, generateRows, refresh: loadFiles };
}
