import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileRecord } from "@/lib/files-api";

export interface DashboardStats {
  todayCopied: number;
  todayCopiedGB: number;
  totalCopied: number;
  totalCopiedGB: number;
  filesPending: number;
  doubleBackupDone: number;
  doubleBackupRemaining: number;
}

export interface ActivityItem {
  id: string;
  clientName: string;
  action: string;
  timestamp: string;
}

export interface InsightItem {
  type: "warning" | "info" | "success";
  message: string;
}

export type FilterMode = "all" | "today" | "copied" | "pending" | "backup_done" | "backup_remaining";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function useFilesDashboardData() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const refreshTimer = useRef<ReturnType<typeof setInterval>>();

  const fetchAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const { data, error } = await supabase
        .from("files_management")
        .select("*")
        .eq("deleted_or_not", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setFiles((data as FileRecord[]) || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    refreshTimer.current = setInterval(() => fetchAll(true), 60_000);
    const channel = supabase
      .channel("files_dashboard_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, () => {
        fetchAll(true);
      })
      .subscribe();
    return () => {
      clearInterval(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const stats = useMemo<DashboardStats>(() => {
    const todayFiles = files.filter(f => f.backup_1_recorded_at && isToday(f.backup_1_recorded_at));
    const todayCopied = todayFiles.length;
    const todayCopiedGB = todayFiles.reduce((sum, f) => sum + (Number(f.size_gb) || 0), 0);

    const copiedFiles = files.filter(f => !!f.final_generated_path);
    const totalCopied = copiedFiles.length;
    const totalCopiedGB = copiedFiles.reduce((sum, f) => sum + (Number(f.size_gb) || 0), 0);

    const filesPending = files.filter(f => !f.final_generated_path).length;

    const doubleBackupDone = files.filter(f => !!f.backup_2_path).length;
    const doubleBackupRemaining = files.filter(f => f.final_generated_path && !f.backup_2_path).length;

    return { todayCopied, todayCopiedGB, totalCopied, totalCopiedGB, filesPending, doubleBackupDone, doubleBackupRemaining };
  }, [files]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        (f.client_name || "").toLowerCase().includes(q) ||
        (f.event_name || "").toLowerCase().includes(q) ||
        (f.freelancer_name || "").toLowerCase().includes(q)
      );
    }
    switch (filterMode) {
      case "today":
        return result.filter(f => f.backup_1_recorded_at && isToday(f.backup_1_recorded_at));
      case "copied":
        return result.filter(f => !!f.final_generated_path);
      case "pending":
        return result.filter(f => !f.final_generated_path);
      case "backup_done":
        return result.filter(f => !!f.backup_2_path);
      case "backup_remaining":
        return result.filter(f => f.final_generated_path && !f.backup_2_path);
      default:
        return result;
    }
  }, [files, search, filterMode]);

  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const f of files) {
      if (f.backup_1_recorded_at) {
        items.push({
          id: f.id + "_b1",
          clientName: f.client_name || "Unknown",
          action: `${f.freelancer_name || "File"} copied to ${f.backup_1_device_name || "device"}`,
          timestamp: f.backup_1_recorded_at,
        });
      }
      if (f.backup_2_recorded_at) {
        items.push({
          id: f.id + "_b2",
          clientName: f.client_name || "Unknown",
          action: `Double backup to ${f.backup_2_device_name || "device"}`,
          timestamp: f.backup_2_recorded_at,
        });
      }
    }
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 30);
  }, [files]);

  const insights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];
    items.push({ type: "info", message: `${stats.todayCopied} files copied today (${stats.todayCopiedGB.toFixed(1)} GB)` });
    if (stats.filesPending > 0) items.push({ type: "warning", message: `${stats.filesPending} files pending copy` });
    if (stats.doubleBackupRemaining > 0) items.push({ type: "warning", message: `${stats.doubleBackupRemaining} files need double backup` });
    items.push({ type: "success", message: `${stats.doubleBackupDone} double backups completed` });
    return items;
  }, [stats]);

  return {
    files: filteredFiles,
    allFiles: files,
    stats,
    activityFeed,
    insights,
    isLoading,
    search,
    setSearch,
    filterMode,
    setFilterMode,
    lastUpdated,
    refresh: () => fetchAll(true),
  };
}
