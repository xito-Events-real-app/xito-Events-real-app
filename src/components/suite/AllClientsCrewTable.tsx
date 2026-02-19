import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, RefreshCw, X, ChevronLeft, Database, Trash2, Download, Upload, UserCog, Cloud, ExternalLink, ChevronDown, ChevronUp, Phone, MapPin, StickyNote, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange, isBSDatePast } from "@/lib/nepali-date";
import {
  getAllFreelancerAssignments,
  updateFreelancerAssignment,
  getFilteredFreelancersByRole,
  FreelancerAssignment,
  FreelancerField,
  fullSyncFreelancerAssignments,
  updateRequiredCrewCategories,
  CATEGORY_CODES,
} from "@/lib/freelancer-assignment-api";
import {
  loadAssignmentsFromCache,
  updateAssignmentInCache,
  updateCategoriesInCache,
  isCachePopulated,
  getUnsyncedCount,
  pushUnsyncedToSheets,
  populateCacheFromSheets,
} from "@/lib/freelancer-assignment-cache";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { QuickAddFreelancerDialog } from "./QuickAddFreelancerDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CrewCategorySelector } from "@/components/shared/CrewCategorySelector";
import CrewScheduleEventSheet from "@/components/crew-schedule/CrewScheduleEventSheet";
import { Calendar as CalendarIcon } from "lucide-react";
import type { AssignmentRow } from "@/components/crew-schedule/types";
import type { EventDetail } from "@/hooks/useEventDetails";

const CREW_COLUMNS: { field: FreelancerField; label: string; short: string; group: 'photo' | 'video' | 'assist' | 'tech'; size: 'wide' | 'narrow' }[] = [
  { field: 'photographerBride', label: 'Photographer Bride', short: 'PB', group: 'photo', size: 'wide' },
  { field: 'videographerBride', label: 'Videographer Bride', short: 'VB', group: 'video', size: 'wide' },
  { field: 'photographerGroom', label: 'Photographer Groom', short: 'PG', group: 'photo', size: 'wide' },
  { field: 'videographerGroom', label: 'Videographer Groom', short: 'VG', group: 'video', size: 'wide' },
  { field: 'extraPhotographer', label: 'Extra Photographer', short: 'EP', group: 'photo', size: 'wide' },
  { field: 'extraVideographer', label: 'Extra Videographer', short: 'EV', group: 'video', size: 'wide' },
  { field: 'assistant', label: 'Assistant', short: 'Asst', group: 'assist', size: 'wide' },
  { field: 'iphoneShooter', label: 'iPhone Shooter', short: 'iPhone', group: 'tech', size: 'wide' },
  { field: 'droneOperator', label: 'Drone Operator', short: 'Drone', group: 'tech', size: 'narrow' },
  { field: 'fpvOperator', label: 'FPV Operator', short: 'FPV', group: 'tech', size: 'narrow' },
];

const GROUP_STYLES = {
  photo: 'bg-amber-100 text-amber-800 border-amber-200',
  video: 'bg-purple-100 text-purple-800 border-purple-200',
  assist: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tech: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const SYNC_INTERVAL = 30 * 60 * 1000;

const DAY_COLORS = [
  "bg-white",
  "bg-blue-200/80",
  "bg-amber-200/70",
  "bg-emerald-200/70",
  "bg-purple-200/70",
  "bg-rose-200/70",
  "bg-cyan-200/70",
  "bg-orange-200/70",
];

const LazyCrewSchedule = lazy(() => import("@/pages/CrewSchedule"));
const PILL_STYLES = {
  photo: 'bg-amber-50 text-amber-700 border-amber-200',
  video: 'bg-purple-50 text-purple-700 border-purple-200',
  assist: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tech: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

function getFirstName(fullName: string): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

export interface CrewStats {
  totalEvents: number;
  assignedCount: number;
  requiredCells: number;
  remainingCount: number;
}

interface AllClientsCrewTableProps {
  onClose?: () => void;
  readOnly?: boolean;
  onStatsReady?: (stats: CrewStats) => void;
}

export function AllClientsCrewTable({ onClose, readOnly = false, onStatsReady }: AllClientsCrewTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const currentBS = getCurrentBSDate();
  const [selectedYear, setSelectedYear] = useState(String(currentBS.year));
  const [selectedMonth, setSelectedMonth] = useState(String(currentBS.month));
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasSyncedOnMount = useRef(false);
  const isBusy = useRef(false);
   const [quickAddState, setQuickAddState] = useState<{ open: boolean; field: FreelancerField; label: string; row: FreelancerAssignment | null }>({
    open: false, field: 'photographerBride', label: '', row: null
  });
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLockingSlots, setIsLockingSlots] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [showCrewPreview, setShowCrewPreview] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandCache, setExpandCache] = useState<Map<string, {
    eventDetail: any | null;
    contactDetail: any | null;
    settings: any[];
    loading: boolean;
  }>>(new Map());

  // Schedule auto-push to sheets after 3 seconds of inactivity
  const schedulePush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      setIsPushing(true);
      try {
        await pushUnsyncedToSheets();
        setPendingSyncs(0);
      } catch (err) {
        console.error('Auto-push failed:', err);
      } finally {
        setIsPushing(false);
      }
    }, 3000);
  }, []);

  const toggleExpand = useCallback(async (rowKey: string, row: FreelancerAssignment) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) { next.delete(rowKey); return next; }
      next.add(rowKey);
      return next;
    });

    const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
    if (expandCache.has(cacheKey)) return;

    setExpandCache(prev => new Map(prev).set(cacheKey, { eventDetail: null, contactDetail: null, settings: [], loading: true }));

    const [edRes, cdRes, settingsRes] = await Promise.all([
      supabase.from('event_details_cache')
        .select('venue_name,venue_type,venue_city,venue_area,venue_map,parlour_name,parlour_type,parlour_city,parlour_area,parlour_map,event_start_time,event_end_time,parlour_start_time,parlour_end_time')
        .eq('registered_date_time_ad', row.registeredDateTimeAD)
        .ilike('event_name', row.event)
        .maybeSingle(),
      supabase.from('contact_details_cache')
        .select('bride_full_name,bride_contact_number,bride_whatsapp_number,bride_home_city,bride_home_area,bride_home_map,groom_full_name,groom_contact_number,groom_whatsapp_number,groom_home_city,groom_home_area,groom_home_map')
        .eq('registered_date_time_ad', row.registeredDateTimeAD)
        .maybeSingle(),
      supabase.from('freelancer_event_settings')
        .select('show_bride_details,show_groom_details,show_venue_details,show_parlour_details,show_bride_location,show_groom_location,freelancer_name,role_code,personal_note')
        .eq('registered_date_time_ad', row.registeredDateTimeAD)
        .eq('event_name', row.event),
    ]);

    setExpandCache(prev => new Map(prev).set(cacheKey, {
      eventDetail: edRes.data || null,
      contactDetail: cdRes.data || null,
      settings: settingsRes.data || [],
      loading: false,
    }));
  }, [expandCache]);

  const loadData = useCallback(async (fromSheets = false) => {
    setLoading(true);
    try {
      if (fromSheets) {
        // Pull fresh data from Sheets into Supabase cache
        await populateCacheFromSheets();
      } else {
        // Check if cache has data; if not, populate from sheets
        const hasCache = await isCachePopulated();
        if (!hasCache) {
          await populateCacheFromSheets();
        }
      }
      // Always load from Supabase (fast)
      const [allAssignments, allFreelancers] = await Promise.all([
        loadAssignmentsFromCache(),
        getFreelancers(),
      ]);
      setAssignments(allAssignments);
      setFreelancers(allFreelancers);
      const count = await getUnsyncedCount();
      setPendingSyncs(count);
    } catch (err) {
      toast.error("Failed to load crew data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(true); // Pull from sheets
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const syncingRef = useRef(false);

  const handleSync = useCallback(async (silent = false) => {
    if (silent && syncingRef.current) return;
    syncingRef.current = true;
    if (!silent) setSyncing(true);
    try {
      // First push any pending local changes to sheets
      await pushUnsyncedToSheets();
      // Step 1: Sync EVENT DETAILS
      await supabase.functions.invoke('google-sheets', {
        body: { action: 'fullSyncEventDetails' }
      });
      // Step 2: Sync FREELANCERS
      const result = await fullSyncFreelancerAssignments();
      // Step 3: Sync CONTACT DETAILS
      await supabase.functions.invoke('google-sheets', {
        body: { action: 'fullSyncContactDetails' }
      });
      if (!silent) {
        toast.success(`Synced! ${result.copiedCount} new, ${result.updatedCount} updated`);
      }
      // Refresh Supabase cache from sheets
      await loadData(true);
    } catch (err) {
      if (!silent) toast.error("Sync failed");
    } finally {
      syncingRef.current = false;
      if (!silent) setSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      handleSync(true);
    }
    const interval = setInterval(() => handleSync(true), SYNC_INTERVAL);

    const handleClientChange = () => loadData();
    window.addEventListener('clients-invalidate', handleClientChange);
    window.addEventListener('booked-clients-invalidate', handleClientChange);

    return () => {
      clearInterval(interval);
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      window.removeEventListener('clients-invalidate', handleClientChange);
      window.removeEventListener('booked-clients-invalidate', handleClientChange);
    };
  }, [handleSync, loadData]);

  const filteredRows = useMemo(() => {
    let rows = assignments
      .filter(a => a.eventYear === selectedYear && a.eventMonth === selectedMonth)
      .sort((a, b) => (parseInt(a.eventDay) || 0) - (parseInt(b.eventDay) || 0));
    if (filterDay) rows = rows.filter(a => a.eventDay === filterDay);
    if (filterClient) rows = rows.filter(a => a.clientName === filterClient);
    return rows;
  }, [assignments, selectedYear, selectedMonth, filterDay, filterClient]);

  const handleDownloadBackup = useCallback(() => {
    if (filteredRows.length === 0) {
      toast.error("No data to download");
      return;
    }
    const csvHeaders = [
      'registeredDateTimeAD','clientName','event','eventDateAD',
      'eventYear','eventMonth','eventDay',
      'photographerBride','videographerBride','photographerGroom',
      'videographerGroom','extraPhotographer','extraVideographer',
      'assistant','iphoneShooter','droneOperator','fpvOperator'
    ];
    const csvRows = [
      csvHeaders.join(','),
      ...filteredRows.map(row =>
        csvHeaders.map(h => `"${((row[h as keyof FreelancerAssignment] as string) || '').replace(/"/g, '""')}"`).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || selectedMonth;
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `crew-backup-${selectedYear}-${monthName}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded backup for ${filteredRows.length} events`);
  }, [filteredRows, selectedYear, selectedMonth]);

  const handleUploadRestore = useCallback(async (file: File) => {
    isBusy.current = true;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV file is empty');
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const crewFields = [
        'photographerBride','videographerBride','photographerGroom',
        'videographerGroom','extraPhotographer','extraVideographer',
        'assistant','iphoneShooter','droneOperator','fpvOperator'
      ];
      const updates: { registeredDateTimeAD: string; event: string; assignments: Record<string, string> }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of lines[i]) {
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { vals.push(current); current = ''; continue; }
          current += ch;
        }
        vals.push(current);
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => { rowObj[h] = (vals[idx] || '').trim(); });
        if (!rowObj.registeredDateTimeAD || !rowObj.event) continue;
        const assignmentValues: Record<string, string> = {};
        crewFields.forEach(f => { assignmentValues[f] = rowObj[f] || ''; });
        updates.push({ registeredDateTimeAD: rowObj.registeredDateTimeAD, event: rowObj.event, assignments: assignmentValues });
      }
      if (updates.length === 0) throw new Error('No valid rows found in CSV');
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: { action: 'restoreFreelancerAssignments', data: { updates } }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Restore failed');
      toast.success(`Restored ${data.data?.matchedCount || 0} of ${updates.length} assignments`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore from backup');
    } finally {
      isBusy.current = false;
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [loadData]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, number>();
    let groupIdx = 0;
    let lastDay = "";
    filteredRows.forEach(row => {
      const day = row.eventDay;
      if (day !== lastDay) {
        if (lastDay !== "") groupIdx++;
        lastDay = day;
      }
      if (!map.has(`${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`)) {
        map.set(`${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`, groupIdx);
      }
    });
    return map;
  }, [filteredRows]);

  // Count how many rows share each eventDay (for multi-row border boxing)
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRows.forEach(row => {
      counts.set(row.eventDay, (counts.get(row.eventDay) || 0) + 1);
    });
    return counts;
  }, [filteredRows]);

  const years = getBSYearsRange(-3, 3);

  const handleAssign = async (row: FreelancerAssignment, field: FreelancerField, freelancerName: string) => {
    try {
      // Write to Supabase cache instantly
      await updateAssignmentInCache(row.registeredDateTimeAD, row.event, field, freelancerName, row.eventDateAD);
      setAssignments(prev => prev.map(a =>
        a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event
          ? { ...a, [field]: freelancerName }
          : a
      ));
      setPendingSyncs(prev => prev + 1);
      schedulePush(); // Auto-push after 3s of inactivity
      toast.success(freelancerName ? `Assigned ${freelancerName}` : 'Assignment cleared');
    } catch {
      toast.error("Failed to assign");
    }
  };

  const handleQuickAddSuccess = async (name: string) => {
    try {
      const updated = await getFreelancers();
      setFreelancers(updated);
    } catch {}
    if (quickAddState.row) {
      await handleAssign(quickAddState.row, quickAddState.field, name);
    }
  };

  const { assignedCount, requiredCells, remainingCount } = useMemo(() => {
    let assigned = 0;
    let required = 0;
    filteredRows.forEach(row => {
      const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
      CREW_COLUMNS.forEach(col => {
        const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
        if (isReq) {
          required++;
          if ((row[col.field] as string)?.trim()) assigned++;
        }
      });
    });
    return { assignedCount: assigned, requiredCells: required, remainingCount: required - assigned };
  }, [filteredRows]);

  // Report stats to parent dashboard
  useEffect(() => {
    if (onStatsReady) {
      onStatsReady({ totalEvents: filteredRows.length, assignedCount, requiredCells, remainingCount });
    }
  }, [filteredRows.length, assignedCount, requiredCells, remainingCount, onStatsReady]);

  // Dynamic column widths: compute based on max first-name length per column
  const columnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    for (const col of CREW_COLUMNS) {
      let maxLen = 0;
      for (const row of filteredRows) {
        const val = (row[col.field] as string)?.trim();
        if (val) {
          const firstName = getFirstName(val);
          maxLen = Math.max(maxLen, firstName.length);
        }
      }
      // ~8px per char + 24px padding, min 55px, max 130px
      const computed = maxLen > 0 ? Math.min(130, Math.max(55, maxLen * 8 + 24)) : 55;
      widths[col.field] = computed;
    }
    return widths;
  }, [filteredRows]);

  return (
    <div className="fixed inset-0 z-[100] bg-gray-200 flex flex-col">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0 shadow-lg">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h1 className="text-lg font-bold tracking-wide">{readOnly ? "FILE MANAGEMENT" : "ALL CLIENTS"}</h1>
        </div>
        <button
          onClick={() => setShowCrewPreview(true)}
          className="flex items-center gap-1 text-xs bg-white/15 px-2.5 py-1 rounded-full hover:bg-white/25 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Preview Crew Link
        </button>
        <div className="flex items-center gap-2 ml-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!readOnly && (
          <>
            <Button variant="ghost" size="sm" onClick={() => handleSync(false)} disabled={syncing} className="gap-1.5 text-white hover:bg-white/20 hover:text-white ml-1">
              <Database className={cn("w-3.5 h-3.5", syncing && "animate-pulse")} />
              {syncing ? "Syncing..." : "Sync Clients"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 text-white hover:bg-white/20 hover:text-white">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLockingSlots || filteredRows.length === 0}
              className="gap-1.5 text-white hover:bg-white/20 hover:text-white"
              onClick={async () => {
                setIsLockingSlots(true);
                try {
                  let updatedCount = 0;
                  for (const row of filteredRows) {
                    const filledCodes = CREW_COLUMNS
                      .filter(col => !!(row[col.field] as string)?.trim())
                      .map(col => col.short);
                    const cats = filledCodes.join(',');
                    await updateCategoriesInCache(
                      row.registeredDateTimeAD,
                      row.event,
                      cats,
                      row.eventDateAD
                    );
                    updatedCount++;
                  }
                  setPendingSyncs(prev => prev + updatedCount);
                  schedulePush();
                  setAssignments(prev => prev.map(a => {
                    const match = filteredRows.find(r => r.registeredDateTimeAD === a.registeredDateTimeAD && r.event === a.event);
                    if (!match) return a;
                    const filledCodes = CREW_COLUMNS
                      .filter(col => !!(match[col.field] as string)?.trim())
                      .map(col => col.short);
                    return { ...a, requiredCategories: filledCodes.join(',') };
                  }));
                  toast.success(`${updatedCount} event(s) locked — empty slots marked as Not Required`);
                } catch (err) {
                  console.error('Lock empty slots failed:', err);
                  toast.error("Failed to lock empty slots");
                } finally {
                  setIsLockingSlots(false);
                }
              }}
            >
              {isLockingSlots ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCog className="w-3.5 h-3.5" />}
              {isLockingSlots ? "Locking..." : "Lock Empty Slots"}
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">{filteredRows.length} events</span>
            <span className="bg-emerald-500/80 px-3 py-1 rounded-full font-medium text-xs">{assignedCount}/{requiredCells} assigned</span>
            {remainingCount > 0 && (
              <span className="bg-red-500/90 px-3 py-1 rounded-full font-medium text-xs animate-pulse">{remainingCount} remaining</span>
            )}
            {!readOnly && pendingSyncs > 0 && (
              <button
                onClick={async () => {
                  if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
                  setIsPushing(true);
                  try {
                    await pushUnsyncedToSheets();
                    setPendingSyncs(0);
                    toast.success("Changes saved to sheets");
                  } catch { toast.error("Failed to push to sheets"); }
                  finally { setIsPushing(false); }
                }}
                disabled={isPushing}
                className="bg-amber-500/80 hover:bg-amber-500 px-3 py-1 rounded-full font-medium text-xs transition-colors flex items-center gap-1"
              >
                {isPushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                {isPushing ? "Pushing..." : `${pendingSyncs} pending`}
              </button>
            )}
          </div>
          {!readOnly && (
            <>
              <button onClick={handleDownloadBackup} title="Download Backup CSV" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isRestoring} title="Upload & Restore from CSV" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50">
                {isRestoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadRestore(file);
                }}
              />
            </>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Filter Bar */}
      {(filterDay || filterClient) && (
        <div className="bg-violet-50 border-b border-violet-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-violet-700">Filtered by:</span>
          {filterDay && (
            <button onClick={() => setFilterDay(null)} className="inline-flex items-center gap-1 bg-violet-200 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-violet-300 transition-colors">
              Day {filterDay} <X className="w-3 h-3" />
            </button>
          )}
          {filterClient && (
            <button onClick={() => setFilterClient(null)} className="inline-flex items-center gap-1 bg-violet-200 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-violet-300 transition-colors">
              {filterClient} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => { setFilterDay(null); setFilterClient(null); }} className="text-xs text-violet-500 hover:text-violet-700 underline ml-2">
            Clear All
          </button>
        </div>
      )}

      {/* Table Container */}
      {(loading || syncing) && assignments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {syncing ? <Database className="w-10 h-10 animate-pulse text-violet-500" /> : <Loader2 className="w-10 h-10 animate-spin text-violet-500" />}
            <p className="text-sm text-gray-500">{syncing ? "Syncing booked clients..." : "Loading crew data..."}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {isMobile ? (
            /* ─── MOBILE CARD LAYOUT ─── */
            <div className="p-3 space-y-3">
              {filteredRows.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No events for this month</p>
                  <p className="text-sm mt-1">Try selecting a different year or month</p>
                </div>
              ) : (
                filteredRows.map((row, idx) => {
                  const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                  const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const cached = expandCache.get(cacheKey);
                  const groupIdx = dayGroups.get(rowKey) ?? 0;
                  const dayBg = DAY_COLORS[groupIdx % DAY_COLORS.length];
                  const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                  const hasUnassignedRequired = CREW_COLUMNS.some(col => {
                    const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
                    return isReq && !(row[col.field] as string)?.trim();
                  });
                  return (
                    <div key={`${rowKey}-${idx}`} className={cn("rounded-xl border border-gray-200 shadow-sm overflow-hidden", dayBg, hasUnassignedRequired && "border-red-300")}>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setFilterDay(filterDay === row.eventDay ? null : row.eventDay)}
                            className={cn(
                              "inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 transition-all",
                              filterDay === row.eventDay
                                ? "bg-violet-600 text-white ring-2 ring-violet-400"
                                : hasUnassignedRequired
                                  ? "bg-red-100 text-red-700 ring-2 ring-red-400 animate-pulse-red"
                                  : "bg-violet-100 text-violet-700"
                            )}
                          >
                            {row.eventDay}
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => setFilterClient(filterClient === row.clientName ? null : row.clientName)}
                              className={cn(
                                "font-bold block truncate text-sm transition-colors",
                                filterClient === row.clientName
                                  ? "text-violet-600 underline"
                                  : "text-gray-900 hover:text-violet-600"
                              )}
                            >
                              {row.clientName}
                            </button>
                            <p className="text-gray-500 truncate text-xs">
                              {row.event}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleExpand(rowKey, row)}
                            className={cn(
                              "p-1.5 rounded-full transition-colors shrink-0",
                              isExpanded ? "bg-violet-100 text-violet-600" : "text-gray-400 hover:text-violet-500 hover:bg-violet-50"
                            )}
                            title={isExpanded ? "Collapse details" : "Expand event details"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CREW_COLUMNS.map(col => {
                            const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                            const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
                            if (!isReq) return null;
                            const val = (row[col.field] as string)?.trim();
                            return (
                              <div key={col.field} className="flex items-center gap-1.5">
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", GROUP_STYLES[col.group])}>
                                  {col.short}
                                </span>
                                {val ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <HoverCard openDelay={200}>
                                      <HoverCardTrigger asChild>
                                        <button
                                          onClick={() => navigate(`/freelancer/${encodeURIComponent(val)}`)}
                                          className="text-xs text-gray-800 truncate hover:text-violet-600 transition-colors"
                                        >
                                          {val}
                                        </button>
                                      </HoverCardTrigger>
                                      <HoverCardContent className="w-72 p-3 z-[200]" side="bottom" avoidCollisions={true} collisionPadding={16}>
                                        <FreelancerHoverInfo name={val} allAssignments={assignments} selectedYear={selectedYear} selectedMonth={selectedMonth} freelancers={freelancers} />
                                      </HoverCardContent>
                                    </HoverCard>
                                    {!readOnly && (
                                      <button
                                        onClick={() => handleAssign(row, col.field, '')}
                                        className="p-0.5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 shrink-0"
                                        title="Remove"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : readOnly ? (
                                  <span className="text-[10px] text-gray-400 animate-pulse-red px-1">---</span>
                                ) : (
                                  <div className="animate-pulse-red rounded">
                                    <MobileCrewAssign
                                      field={col.field}
                                      label={col.label}
                                      freelancers={freelancers}
                                      onAssign={(name) => handleAssign(row, col.field, name)}
                                      onQuickAdd={() => setQuickAddState({ open: true, field: col.field, label: col.label, row })}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-violet-200 bg-slate-50 px-3 py-2.5">
                          <EventLogisticsPanel
                            eventDetail={cached?.eventDetail ?? null}
                            contactDetail={cached?.contactDetail ?? null}
                            settings={cached?.settings ?? []}
                            loading={cached?.loading ?? true}
                            row={row}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ─── DESKTOP TABLE LAYOUT ─── */
            <table className="w-full border-collapse min-w-[1400px]">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="bg-gray-800 text-white text-xs font-semibold px-3 py-2.5 text-left border-r border-gray-700 w-[50px]">Day</th>
                  <th className="bg-gray-800 text-white text-xs font-semibold px-3 py-2.5 text-left border-r border-gray-700 w-[180px]">Client</th>
                  <th className="bg-gray-800 text-white text-xs font-semibold px-3 py-2.5 text-left border-r border-gray-700 w-[140px]">Event</th>
                  {CREW_COLUMNS.map(col => (
                    <th
                      key={col.field}
                      className={cn("text-xs font-bold px-2 py-2.5 text-center border-r last:border-r-0", GROUP_STYLES[col.group])}
                      style={{ width: `${columnWidths[col.field]}px`, minWidth: `${columnWidths[col.field]}px` }}
                    >
                      {col.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium">No events for this month</p>
                      <p className="text-sm mt-1">Try selecting a different year or month</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                    const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
                    const isExpanded = expandedRows.has(rowKey);
                    const cached = expandCache.get(cacheKey);
                    const groupIdx = dayGroups.get(rowKey) ?? 0;
                    const dayBg = DAY_COLORS[groupIdx % DAY_COLORS.length];
                    const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                    const hasUnassignedRequired = CREW_COLUMNS.some(col => {
                      const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
                      return isReq && !(row[col.field] as string)?.trim();
                    });
                    return (
                      <React.Fragment key={`frag-${rowKey}-${idx}`}>
                        <tr
                          className={cn("border-b border-gray-100 hover:bg-violet-50/40 transition-colors group", dayBg, isExpanded && "border-b-0")}
                        >
                          <td className="px-3 py-2 border-r border-gray-100 text-center">
                            <button
                              onClick={() => setFilterDay(filterDay === row.eventDay ? null : row.eventDay)}
                              className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all",
                                filterDay === row.eventDay
                                  ? "bg-violet-600 text-white ring-2 ring-violet-400"
                                  : hasUnassignedRequired
                                    ? "bg-red-100 text-red-700 ring-2 ring-red-400 animate-pulse-red"
                                    : "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer"
                              )}
                            >
                              {row.eventDay}
                            </button>
                            <button
                              onClick={() => toggleExpand(rowKey, row)}
                              className={cn(
                                "mt-0.5 flex items-center justify-center w-full transition-colors",
                                isExpanded ? "text-violet-500" : "text-gray-300 hover:text-violet-500"
                              )}
                              title={isExpanded ? "Collapse details" : "Expand event details"}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-3 py-2 border-r border-gray-100">
                            <button
                              onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                  navigate(`/client-tracker/client/${encodeURIComponent(row.registeredDateTimeAD)}`);
                                } else {
                                  setFilterClient(filterClient === row.clientName ? null : row.clientName);
                                }
                              }}
                              className={cn(
                                "font-semibold text-sm text-left leading-tight transition-colors",
                                filterClient === row.clientName
                                  ? "text-violet-600 underline"
                                  : "text-gray-900 hover:text-violet-600"
                              )}
                            >
                              {row.clientName}
                            </button>
                          </td>
                          <td className="px-3 py-2 border-r border-gray-100 text-gray-600 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="block leading-tight flex-1">{row.event}</span>
                              {!readOnly && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      className="p-0.5 rounded hover:bg-violet-100 text-gray-400 hover:text-violet-600 shrink-0"
                                      title="Set required crew"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <UserCog className="w-3.5 h-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                                    <CrewCategorySelector
                                      selected={(row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean)}
                                      onChange={async (codes) => {
                                        try {
                                          await updateCategoriesInCache(row.registeredDateTimeAD, row.event, codes.join(','), row.eventDateAD);
                                          setAssignments(prev => prev.map(a =>
                                            a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event
                                              ? { ...a, requiredCategories: codes.join(',') }
                                              : a
                                          ));
                                          setPendingSyncs(prev => prev + 1);
                                          schedulePush();
                                        } catch { toast.error("Failed to update categories"); }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </td>
                          {CREW_COLUMNS.map((col, idx) => {
                            const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                            const isRequired = reqCodes.length === 0 || reqCodes.includes(col.short);
                            const nextCol = CREW_COLUMNS[idx + 1];
                            const isNextRequired = nextCol
                              ? (reqCodes.length === 0 || reqCodes.includes(nextCol.short))
                              : true;
                            return (
                              <CrewCell
                                key={col.field}
                                value={row[col.field] as string}
                                field={col.field}
                                label={col.label}
                                group={col.group}
                                colWidth={columnWidths[col.field]}
                                freelancers={freelancers}
                                allAssignments={assignments}
                                selectedYear={selectedYear}
                                selectedMonth={selectedMonth}
                                onAssign={(name) => handleAssign(row, col.field, name)}
                                onQuickAdd={() => setQuickAddState({ open: true, field: col.field, label: col.label, row })}
                                isRequired={isRequired}
                                isNextRequired={isNextRequired}
                                readOnly={readOnly}
                              />
                            );
                          })}
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-violet-200">
                            <td colSpan={13} className="bg-slate-50 px-4 py-3">
                              <EventLogisticsPanel
                                eventDetail={cached?.eventDetail ?? null}
                                contactDetail={cached?.contactDetail ?? null}
                                settings={cached?.settings ?? []}
                                loading={cached?.loading ?? true}
                                row={row}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      <QuickAddFreelancerDialog
        open={quickAddState.open}
        onOpenChange={(o) => setQuickAddState(s => ({ ...s, open: o }))}
        roleField={quickAddState.field}
        roleLabel={quickAddState.label}
        onSuccess={handleQuickAddSuccess}
      />

      <Dialog open={showCrewPreview} onOpenChange={setShowCrewPreview}>
        <DialogContent className="max-w-md h-[85vh] p-0 overflow-hidden rounded-2xl z-[200]">
          <div className="w-full h-full overflow-y-auto">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
              <LazyCrewSchedule previewName="Barun Koirala" />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Note Edit Popover ─── */
function NoteEditPopover({ name, registeredDateTimeAD, eventName, initialNote, onSave }: {
  name: string;
  registeredDateTimeAD: string;
  eventName: string;
  initialNote: string;
  onSave: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('freelancer_event_settings')
      .update({ personal_note: value })
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('event_name', eventName)
      .eq('freelancer_name', name);
    setSaving(false);
    setEditing(false);
    onSave(value);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">📝 {name}</p>
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full text-xs min-h-[80px] resize-none rounded border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setValue(initialNote); }}
              className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-2.5 h-2.5 animate-spin" />} Save
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{value}</p>
          <button onClick={() => setEditing(true)}
            className="text-[10px] text-amber-600 hover:underline flex items-center gap-1 mt-1">
            <Pencil className="w-2.5 h-2.5" /> Edit Note
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Event Logistics Panel ─── */
function EventLogisticsPanel({ eventDetail, contactDetail, settings: settingsProp, loading, row }: {
  eventDetail: any | null;
  contactDetail: any | null;
  settings: any[];
  loading: boolean;
  row: FreelancerAssignment;
}) {
  const [calendarFor, setCalendarFor] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState(settingsProp);

  useEffect(() => { setLocalSettings(settingsProp); }, [settingsProp]);

  const handleNoteSaved = (freelancerName: string, newNote: string) => {
    setLocalSettings(prev => prev.map((s: any) =>
      s.freelancer_name?.toLowerCase() === freelancerName.toLowerCase()
        ? { ...s, personal_note: newNote }
        : s
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 text-xs text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading details...
      </div>
    );
  }

  const showBride = localSettings.some((s: any) => s.show_bride_details);
  const showBrideLocation = localSettings.some((s: any) => s.show_bride_location);
  const showGroom = localSettings.some((s: any) => s.show_groom_details);
  const showGroomLocation = localSettings.some((s: any) => s.show_groom_location);
  const showVenue = localSettings.some((s: any) => s.show_venue_details);
  const showParlour = localSettings.some((s: any) => s.show_parlour_details);

  const cards: React.ReactNode[] = [];

  if (showBride || showBrideLocation) {
    cards.push(
      <div key="bride" className="border border-pink-200 rounded-lg p-2.5 bg-pink-50/50 min-w-[150px]">
        <div className="text-[10px] font-bold text-pink-600 uppercase tracking-wide mb-1.5">🌸 Bride</div>
        {showBride && contactDetail?.bride_full_name && (
          <p className="text-xs font-semibold text-gray-800 truncate">{contactDetail.bride_full_name}</p>
        )}
        {showBride && contactDetail?.bride_contact_number && (
          <a href={`tel:${contactDetail.bride_contact_number}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
            <Phone className="w-2.5 h-2.5" />{contactDetail.bride_contact_number}
          </a>
        )}
        {showBride && contactDetail?.bride_whatsapp_number && contactDetail.bride_whatsapp_number !== contactDetail.bride_contact_number && (
          <button onClick={() => openWhatsApp(contactDetail.bride_whatsapp_number)} className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
            <Phone className="w-2.5 h-2.5" />WA: {contactDetail.bride_whatsapp_number}
          </button>
        )}
        {showBrideLocation && (contactDetail?.bride_home_city || contactDetail?.bride_home_area) && (
          <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />{[contactDetail.bride_home_city, contactDetail.bride_home_area].filter(Boolean).join(', ')}
          </p>
        )}
        {showBrideLocation && contactDetail?.bride_home_map && (
          <a href={contactDetail.bride_home_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-0.5 block">Map →</a>
        )}
      </div>
    );
  }

  if (showGroom || showGroomLocation) {
    cards.push(
      <div key="groom" className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/50 min-w-[150px]">
        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1.5">🤵 Groom</div>
        {showGroom && contactDetail?.groom_full_name && (
          <p className="text-xs font-semibold text-gray-800 truncate">{contactDetail.groom_full_name}</p>
        )}
        {showGroom && contactDetail?.groom_contact_number && (
          <a href={`tel:${contactDetail.groom_contact_number}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
            <Phone className="w-2.5 h-2.5" />{contactDetail.groom_contact_number}
          </a>
        )}
        {showGroom && contactDetail?.groom_whatsapp_number && contactDetail.groom_whatsapp_number !== contactDetail.groom_contact_number && (
          <button onClick={() => openWhatsApp(contactDetail.groom_whatsapp_number)} className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
            <Phone className="w-2.5 h-2.5" />WA: {contactDetail.groom_whatsapp_number}
          </button>
        )}
        {showGroomLocation && (contactDetail?.groom_home_city || contactDetail?.groom_home_area) && (
          <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />{[contactDetail.groom_home_city, contactDetail.groom_home_area].filter(Boolean).join(', ')}
          </p>
        )}
        {showGroomLocation && contactDetail?.groom_home_map && (
          <a href={contactDetail.groom_home_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-0.5 block">Map →</a>
        )}
      </div>
    );
  }

  if (showVenue) {
    cards.push(
      <div key="venue" className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50 min-w-[160px]">
        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">📍 Venue</div>
        {/* Venue name + Area on same line */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {eventDetail?.venue_name && (
            <span className="text-xs font-semibold text-gray-800">{eventDetail.venue_name}</span>
          )}
          {eventDetail?.venue_area && (
            <span className="text-xs font-black text-amber-800 uppercase tracking-wide">· {eventDetail.venue_area}</span>
          )}
        </div>
        {eventDetail?.venue_city && (
          <p className="text-[10px] text-gray-500 mt-0.5">{eventDetail.venue_city}</p>
        )}
        {eventDetail?.venue_map && (
          <a href={eventDetail.venue_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-0.5 block">Map →</a>
        )}
        {/* Start time BIG */}
        {eventDetail?.event_start_time && (
          <div className="mt-1.5">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Starts at</p>
            <p className="text-base font-black text-violet-700 leading-tight">{eventDetail.event_start_time}</p>
          </div>
        )}
        {eventDetail?.event_end_time && (
          <p className="text-[10px] text-gray-400 mt-0.5">Ends at {eventDetail.event_end_time}</p>
        )}
      </div>
    );
  }

  if (showParlour) {
    cards.push(
      <div key="parlour" className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/50 min-w-[160px]">
        <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-1.5">💄 Parlour</div>
        {/* Parlour name + Area on same line */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {eventDetail?.parlour_name && (
            <span className="text-xs font-semibold text-gray-800">{eventDetail.parlour_name}</span>
          )}
          {eventDetail?.parlour_area && (
            <span className="text-xs font-black text-purple-800 uppercase tracking-wide">· {eventDetail.parlour_area}</span>
          )}
        </div>
        {eventDetail?.parlour_city && (
          <p className="text-[10px] text-gray-500 mt-0.5">{eventDetail.parlour_city}</p>
        )}
        {eventDetail?.parlour_map && (
          <a href={eventDetail.parlour_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-0.5 block">Map →</a>
        )}
        {/* Start time BIG */}
        {eventDetail?.parlour_start_time && (
          <div className="mt-1.5">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Starts at</p>
            <p className="text-base font-black text-purple-700 leading-tight">{eventDetail.parlour_start_time}</p>
          </div>
        )}
        {eventDetail?.parlour_end_time && (
          <p className="text-[10px] text-gray-400 mt-0.5">Ends at {eventDetail.parlour_end_time}</p>
        )}
      </div>
    );
  }

  // Inline crew cards — same row as logistics cards
  for (const col of CREW_COLUMNS) {
    const name = (row[col.field] as string)?.trim();
    if (!name) continue;
    const setting = localSettings.find((s: any) =>
      s.freelancer_name?.trim().toLowerCase() === name.toLowerCase()
    );
    const note = setting?.personal_note?.trim() || '';
    cards.push(
      <div key={`crew-${col.field}-${name}`} className="border border-gray-200 rounded-lg p-2.5 bg-white min-w-[120px] max-w-[160px]">
        <span className="text-[10px] font-bold text-gray-400 uppercase">{col.short}</span>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
          <button
            onClick={() => setCalendarFor(name)}
            className="shrink-0 p-1 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
            title={`${name} — event details`}
          >
            <CalendarIcon className="w-3 h-3" />
          </button>
        </div>
        {note && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 bg-yellow-50 border border-yellow-100 rounded px-1.5 py-0.5 w-full text-left hover:bg-yellow-100 transition-colors overflow-hidden">
                <StickyNote className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate block">{note}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 z-[300]" align="start" side="bottom">
              <NoteEditPopover
                name={name}
                registeredDateTimeAD={row.registeredDateTimeAD}
                eventName={row.event}
                initialNote={note}
                onSave={(newNote) => handleNoteSaved(name, newNote)}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-1">No details configured for this event's freelancers.</p>
    );
  }

  // Map row → AssignmentRow for CrewScheduleEventSheet
  const mappedAssignment: AssignmentRow = {
    event_year: row.eventYear || null,
    event_month: row.eventMonth || null,
    event_day: row.eventDay || null,
    event: row.event || '',
    client_name: row.clientName || null,
    registered_date_time_ad: row.registeredDateTimeAD,
    photographer_bride: row.photographerBride || null,
    photographer_groom: row.photographerGroom || null,
    videographer_bride: row.videographerBride || null,
    videographer_groom: row.videographerGroom || null,
    extra_photographer: row.extraPhotographer || null,
    extra_videographer: row.extraVideographer || null,
    assistant: row.assistant || null,
    iphone_shooter: row.iphoneShooter || null,
    drone_operator: row.droneOperator || null,
    fpv_operator: row.fpvOperator || null,
  };

  // Map eventDetail cache row → EventDetail shape for the sheet
  const mappedEventDetail: EventDetail | undefined = eventDetail ? {
    eventIndex: eventDetail.event_index ?? 0,
    eventName: eventDetail.event_name || '',
    eventYear: eventDetail.event_year || '',
    eventMonth: eventDetail.event_month || '',
    eventDay: eventDetail.event_day || '',
    eventDateAD: eventDetail.event_date_ad || '',
    venueType: eventDetail.venue_type || '',
    venueName: eventDetail.venue_name || '',
    venueCity: eventDetail.venue_city || '',
    venueArea: eventDetail.venue_area || '',
    venueMap: eventDetail.venue_map || '',
    eventStartTime: eventDetail.event_start_time || '',
    eventEndTime: eventDetail.event_end_time || '',
    parlourType: eventDetail.parlour_type || '',
    parlourName: eventDetail.parlour_name || '',
    parlourCity: eventDetail.parlour_city || '',
    parlourArea: eventDetail.parlour_area || '',
    parlourMap: eventDetail.parlour_map || '',
    parlourStartTime: eventDetail.parlour_start_time || '',
    parlourEndTime: eventDetail.parlour_end_time || '',
    doGroomComeInMehndi: eventDetail.do_groom_come_in_mehndi || '',
    guestCount: eventDetail.guest_count || '',
    eventDemands: [],
    eventReferences: [],
  } : undefined;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {cards}
      </div>
      {calendarFor && (
        <CrewScheduleEventSheet
          open={!!calendarFor}
          onOpenChange={(open) => { if (!open) setCalendarFor(null); }}
          assignment={mappedAssignment}
          eventDetail={mappedEventDetail}
          contactDetails={contactDetail}
          freelancerName={calendarFor}
        />
      )}
    </div>
  );
}

/* ─── Shared Freelancer Hover Info ─── */
function FreelancerHoverInfo({ name, allAssignments, selectedYear, selectedMonth, freelancers }: { name: string; allAssignments: FreelancerAssignment[]; selectedYear: string; selectedMonth: string; freelancers: FreelancerData[] }) {
  const navigate = useNavigate();
  const currentBS = getCurrentBSDate();

  const { monthEvents, upcomingEvents } = useMemo(() => {
    const upper = name.trim().toUpperCase();
    const monthEvts: { clientName: string; event: string; day: string; month: string; year: string }[] = [];

    for (const a of allAssignments) {
      for (const col of CREW_COLUMNS) {
        const cellVal = (a[col.field] as string)?.trim().toUpperCase();
        if (cellVal === upper) {
          if (a.eventYear === selectedYear && a.eventMonth === selectedMonth) {
            monthEvts.push({ clientName: a.clientName, event: a.event, day: a.eventDay, month: a.eventMonth, year: a.eventYear });
          }
          break;
        }
      }
    }

    const upcoming = monthEvts.filter(ev => {
      return !isBSDatePast(ev.year, ev.month, ev.day);
    });

    upcoming.sort((a, b) => (parseInt(a.day) || 0) - (parseInt(b.day) || 0));

    return { monthEvents: monthEvts, upcomingEvents: upcoming };
  }, [name, allAssignments, selectedYear, selectedMonth]);

  const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || selectedMonth;

  const handleSendToWhatsApp = () => {
    const scheduleUrl = `https://wtnclienttracker.lovable.app/crew-schedule/${encodeURIComponent(name.trim())}`;
    const message = `Hi! Check your upcoming event schedule here:\n${scheduleUrl}`;
    
    // Look up freelancer by name (case-insensitive)
    const match = freelancers.find(f => f.name.trim().toLowerCase() === name.trim().toLowerCase());
    const phone = match?.whatsappNo || match?.contactNo;
    
    if (!phone) {
      toast.error(`No phone number found for ${name}`);
      return;
    }
    
    openWhatsApp(phone, message);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => navigate(`/freelancer/${encodeURIComponent(name.trim())}`)}
        className="font-semibold text-sm text-gray-900 hover:text-violet-600 transition-colors"
      >
        {name}
      </button>
      <p className="text-xs font-bold text-violet-600">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''} in {monthName}</p>
      {upcomingEvents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Upcoming</p>
          <div className="space-y-2">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="text-xs border-l-2 border-violet-300 pl-2">
                <p className="font-bold text-violet-700">{ev.day} {nepaliMonthsEnglish[parseInt(ev.month) - 1] || ev.month}</p>
                <p className="text-gray-800">{ev.clientName}</p>
                <p className="text-gray-500">{ev.event}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {upcomingEvents.length === 0 && monthEvents.length > 0 && (
        <p className="text-xs text-gray-400 italic">All events have passed</p>
      )}
      <button
        onClick={handleSendToWhatsApp}
        className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.529-1.474A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.768-6.152-2.063l-.43-.338-2.809.914.94-2.76-.37-.462A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Send Schedule to WhatsApp
      </button>
    </div>
  );
}

/* ─── Desktop Crew Cell: HoverCard and Popover SEPARATED ─── */
function CrewCell({
  value,
  field,
  label,
  group,
  colWidth,
  freelancers,
  allAssignments,
  selectedYear,
  selectedMonth,
  onAssign,
  onQuickAdd,
  isRequired = true,
  isNextRequired = true,
  readOnly = false,
}: {
  value: string;
  field: FreelancerField;
  label: string;
  group: 'photo' | 'video' | 'assist' | 'tech';
  colWidth: number;
  freelancers: FreelancerData[];
  allAssignments: FreelancerAssignment[];
  selectedYear: string;
  selectedMonth: string;
  onAssign: (name: string) => void;
  onQuickAdd: () => void;
  isRequired?: boolean;
  isNextRequired?: boolean;
  readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => getFilteredFreelancersByRole(freelancers, field), [freelancers, field]);
  const hasValue = value && value.trim().length > 0;
  const firstName = hasValue ? getFirstName(value) : "";

  if (!isRequired) {
    return (
      <td
        className={cn("py-1.5 bg-white", isNextRequired && "border-r border-gray-100")}
        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
      />
    );
  }

  return (
    <td
      className="px-1 py-1.5 border-r border-gray-100 last:border-r-0"
      style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
    >
      {hasValue ? (
        <div className="relative">
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <span
                className={cn(
                  "block w-full text-xs px-2 py-1.5 rounded-md text-center truncate border font-medium transition-all",
                  PILL_STYLES[group],
                  !readOnly && "cursor-pointer"
                )}
                onClick={() => !readOnly && setOpen(true)}
              >
                {firstName}
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-3 z-[200]" side="bottom" avoidCollisions={true} collisionPadding={16}>
              <FreelancerHoverInfo name={value} allAssignments={allAssignments} selectedYear={selectedYear} selectedMonth={selectedMonth} freelancers={freelancers} />
            </HoverCardContent>
          </HoverCard>

          {!readOnly && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <span className="absolute inset-0 opacity-0 pointer-events-none" />
              </PopoverTrigger>
              <PopoverContent className="z-[200] w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${label}...`} />
                  <CommandList>
                    <CommandEmpty>No freelancers found</CommandEmpty>
                    <CommandGroup heading="Actions">
                      <CommandItem onSelect={() => { onAssign(''); setOpen(false); }} className="text-red-500 font-medium">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Clear Assignment
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      {filtered.map(name => (
                        <CommandItem key={name} onSelect={() => { onAssign(name); setOpen(false); }} className="text-sm">
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={() => { setOpen(false); onQuickAdd(); }} className="text-emerald-600 font-medium">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add New Freelancer
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      ) : readOnly ? (
        <span className="block w-full text-xs px-2 py-1.5 rounded-md text-center border border-dashed border-red-400 text-red-400 animate-pulse-red">
          ---
        </span>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full text-xs px-2 py-1.5 rounded-md text-center truncate transition-all border border-dashed border-red-400 text-red-400 hover:border-red-500 hover:text-red-600 hover:bg-red-50 animate-pulse-red">
              <Plus className="w-3 h-3 mx-auto" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="z-[200] w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search ${label}...`} />
              <CommandList>
                <CommandEmpty>No freelancers found</CommandEmpty>
                <CommandGroup>
                  {filtered.map(name => (
                    <CommandItem key={name} onSelect={() => { onAssign(name); setOpen(false); }} className="text-sm">
                      {name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => { setOpen(false); onQuickAdd(); }} className="text-emerald-600 font-medium">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add New Freelancer
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </td>
  );
}

/* ─── Mobile Crew Assign Popover ─── */
function MobileCrewAssign({
  field,
  label,
  freelancers,
  onAssign,
  onQuickAdd,
}: {
  field: FreelancerField;
  label: string;
  freelancers: FreelancerData[];
  onAssign: (name: string) => void;
  onQuickAdd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => getFilteredFreelancersByRole(freelancers, field), [freelancers, field]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-[10px] text-gray-400 hover:text-violet-500 px-1">
          <Plus className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[200] w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label}...`} />
          <CommandList>
            <CommandEmpty>No freelancers found</CommandEmpty>
            <CommandGroup>
              {filtered.map(name => (
                <CommandItem key={name} onSelect={() => { onAssign(name); setOpen(false); }} className="text-sm">
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => { setOpen(false); onQuickAdd(); }} className="text-emerald-600 font-medium">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add New
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
