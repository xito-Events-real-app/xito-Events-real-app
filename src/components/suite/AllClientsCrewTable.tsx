import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getMemoryClients } from "@/lib/memory-cache";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, X, ChevronLeft, ChevronRight, Database, Trash2, Download, Upload, Cloud, ChevronDown, ChevronUp, Phone, MapPin, StickyNote, Pencil, Filter, ArrowUpDown, Settings } from "lucide-react";
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
} from "@/lib/freelancer-assignment-api";
import {
  loadAssignmentsFromCache,
  updateAssignmentInCache,
  updateCategoriesInCache,
  getUnsyncedCount,
  pushUnsyncedToSheets,
  rowToAssignment,
} from "@/lib/freelancer-assignment-cache";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { QuickAddFreelancerDialog } from "./QuickAddFreelancerDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CrewCategorySelector, CategoryBadges } from "@/components/shared/CrewCategorySelector";
import CrewScheduleEventSheet from "@/components/crew-schedule/CrewScheduleEventSheet";
import { Calendar as CalendarIcon } from "lucide-react";
import type { AssignmentRow } from "@/components/crew-schedule/types";
import type { EventDetail } from "@/hooks/useEventDetails";
import type { ClientContactDetails } from "@/lib/client-contact-api";
import { LaganDatesPicker } from "./LaganDatesPicker";
import { GaneshIcon } from "./GaneshIcon";

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

type SortMode = 'default' | 'maxEvents' | 'minEvents' | 'drone' | 'freelancerMax' | 'freelancerMin' | 'unassignedFirst';
type FreelancerGroupData = { name: string; thisMonth: number; lastMonth: number; nextMonth: number; allTime: number; rows: FreelancerAssignment[] };


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
  const isBusy = useRef(false);
   const [quickAddState, setQuickAddState] = useState<{ open: boolean; field: FreelancerField; label: string; row: FreelancerAssignment | null }>({
    open: false, field: 'photographerBride', label: '', row: null
  });
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterFreelancer, setFilterFreelancer] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
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
  const [laganDays, setLaganDays] = useState<Set<number>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [freelancerExpandedGroups, setFreelancerExpandedGroups] = useState<Set<string>>(new Set());

  // Load lagan dates for selected month/year
  useEffect(() => {
    const loadLagan = async () => {
      const bsYear = parseInt(selectedYear);
      const bsMonth = parseInt(selectedMonth);
      const { data } = await (supabase as any)
        .from("lagan_dates")
        .select("bs_day")
        .eq("bs_year", bsYear)
        .eq("bs_month", bsMonth);
      if (data) {
        setLaganDays(new Set(data.map((r: any) => r.bs_day)));
      }
    };
    loadLagan();
  }, [selectedYear, selectedMonth]);

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




  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allAssignments, allFreelancers] = await Promise.all([
        loadAssignmentsFromCache(),
        getFreelancers(),
      ]);
      
      // Filter out assignments for clients who are no longer actively BOOKED
      const uniqueRegDates = [...new Set(allAssignments.map(a => a.registeredDateTimeAD))];
      const { getCurrentStatus } = await import('@/lib/sheets-api');
      
      // Batch-fetch status for all referenced clients
      const activeRegDates = new Set<string>();
      for (let i = 0; i < uniqueRegDates.length; i += 500) {
        const batch = uniqueRegDates.slice(i, i + 500);
        const { data } = await supabase
          .from('clients_cache')
          .select('registered_date_time_ad, status_log, sheet_source')
          .in('registered_date_time_ad', batch);
        for (const c of data || []) {
          if (c.sheet_source !== 'booked') {
            activeRegDates.add(c.registered_date_time_ad);
            continue;
          }
          const status = getCurrentStatus(c.status_log || '').toUpperCase();
          if (status.includes('BOOKED') && !status.includes('SOMEWHERE ELSE')) {
            activeRegDates.add(c.registered_date_time_ad);
          }
        }
      }
      
      const filteredAssignments = allAssignments.filter(a => activeRegDates.has(a.registeredDateTimeAD));
      setAssignments(filteredAssignments);
      setFreelancers(allFreelancers);
      const count = await getUnsyncedCount();
      setPendingSyncs(count);
    } catch (err) {
      toast.error("Failed to load crew data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Track local update timestamps for anti-flicker guard
  const localUpdateTimestamps = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadData();

    const handleClientChange = () => loadData();
    window.addEventListener('clients-invalidate', handleClientChange);
    window.addEventListener('booked-clients-invalidate', handleClientChange);

    // Realtime subscription for multi-device instant sync
    const channel = supabase
      .channel('crew-assignments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'freelancer_assignments' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const row = payload.new as any;
            // Anti-flicker: skip if this was a local update within last 2s
            const updatedAt = row.updated_at;
            if (updatedAt && localUpdateTimestamps.current.has(updatedAt)) {
              return;
            }
            const mapped = rowToAssignment(row);
            if (payload.eventType === 'UPDATE') {
              setAssignments(prev => prev.map(a => a.id === mapped.id ? mapped : a));
            } else {
              setAssignments(prev => {
                if (prev.some(a => a.id === mapped.id)) return prev;
                return [...prev, mapped];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any)?.id;
            if (oldId) {
              setAssignments(prev => prev.filter(a => a.id !== oldId));
            }
          }
          // Also refresh pending sync count
          getUnsyncedCount().then(c => setPendingSyncs(c));
        }
      )
      .subscribe();

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      window.removeEventListener('clients-invalidate', handleClientChange);
      window.removeEventListener('booked-clients-invalidate', handleClientChange);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const filteredRows = useMemo(() => {
    let rows = assignments
      .filter(a => a.eventYear === selectedYear && a.eventMonth === selectedMonth)
      .sort((a, b) => (parseInt(a.eventDay) || 0) - (parseInt(b.eventDay) || 0));
    if (filterDay) rows = rows.filter(a => a.eventDay === filterDay);
    if (filterClient) rows = rows.filter(a => a.clientName === filterClient);
    if (filterFreelancer) {
      const upper = filterFreelancer.trim().toUpperCase();
      rows = rows.filter(a => CREW_COLUMNS.some(col => (a[col.field] as string)?.trim().toUpperCase() === upper));
    }
    return rows;
  }, [assignments, selectedYear, selectedMonth, filterDay, filterClient, filterFreelancer]);

  const upcomingRows = useMemo(() =>
    filteredRows.filter(row => !row.eventDay || row.eventDay.includes('**') || !isBSDatePast(row.eventYear, row.eventMonth, row.eventDay)),
    [filteredRows]
  );

  const completedRows = useMemo(() =>
    filteredRows.filter(row => row.eventDay && !row.eventDay.includes('**') && isBSDatePast(row.eventYear, row.eventMonth, row.eventDay)),
    [filteredRows]
  );

  const allExpanded = useMemo(() =>
    filteredRows.length > 0 && filteredRows.every(row => {
      const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
      return expandedRows.has(rowKey);
    }),
    [filteredRows, expandedRows]
  );

  const handleToggleExpandAll = useCallback(async () => {
    if (allExpanded) { setExpandedRows(new Set()); return; }
    const newKeys = new Set<string>();
    for (const row of filteredRows) {
      newKeys.add(`${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`);
    }
    setExpandedRows(newKeys);
    const toFetch = filteredRows.filter(row => !expandCache.has(`${row.registeredDateTimeAD}__${row.event}`));
    setExpandCache(prev => {
      const next = new Map(prev);
      for (const row of toFetch) {
        next.set(`${row.registeredDateTimeAD}__${row.event}`, { eventDetail: null, contactDetail: null, settings: [], loading: true });
      }
      return next;
    });
    await Promise.all(toFetch.map(async (row) => {
      const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
      const [edRes, cdRes, settingsRes] = await Promise.all([
        supabase.from('event_details_cache').select('venue_name,venue_type,venue_city,venue_area,venue_map,parlour_name,parlour_type,parlour_city,parlour_area,parlour_map,event_start_time,event_end_time,parlour_start_time,parlour_end_time').eq('registered_date_time_ad', row.registeredDateTimeAD).ilike('event_name', row.event).maybeSingle(),
        supabase.from('contact_details_cache').select('bride_full_name,bride_contact_number,bride_whatsapp_number,bride_home_city,bride_home_area,bride_home_map,groom_full_name,groom_contact_number,groom_whatsapp_number,groom_home_city,groom_home_area,groom_home_map').eq('registered_date_time_ad', row.registeredDateTimeAD).maybeSingle(),
        supabase.from('freelancer_event_settings').select('show_bride_details,show_groom_details,show_venue_details,show_parlour_details,show_bride_location,show_groom_location,freelancer_name,role_code,personal_note').eq('registered_date_time_ad', row.registeredDateTimeAD).eq('event_name', row.event),
      ]);
      setExpandCache(prev => new Map(prev).set(cacheKey, { eventDetail: edRes.data || null, contactDetail: cdRes.data || null, settings: settingsRes.data || [], loading: false }));
    }));
  }, [allExpanded, filteredRows, expandCache]);

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
      // Register timestamp for anti-flicker guard
      const ts = new Date().toISOString();
      localUpdateTimestamps.current.add(ts);
      setTimeout(() => localUpdateTimestamps.current.delete(ts), 2000);

      // Write to Supabase cache instantly
      await updateAssignmentInCache(row.registeredDateTimeAD, row.event, field, freelancerName, row.eventDateAD);
      setAssignments(prev => prev.map(a =>
        a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
          ? { ...a, [field]: freelancerName }
          : a
      ));
      setPendingSyncs(prev => prev + 1);
      schedulePush(); // Auto-push after 3s of inactivity

      // Cascade: sync files_management with updated assignment
      import("@/lib/files-api").then(({ syncFilesWithAssignments }) => {
        syncFilesWithAssignments(row.registeredDateTimeAD, row.event).catch(err =>
          console.warn('[CASCADE] Files sync failed:', err)
        );
      });

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

  const columnStats = useMemo(() => {
    const stats: Record<string, { total: number; assigned: number; remaining: number }> = {};
    for (const col of CREW_COLUMNS) {
      let total = 0;
      let assigned = 0;
      for (const row of filteredRows) {
        const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
        const isRequired = reqCodes.length === 0 || reqCodes.includes(col.short);
        if (!isRequired) continue;
        total++;
        if ((row[col.field] as string)?.trim()) assigned++;
      }
      stats[col.field] = { total, assigned, remaining: Math.max(0, total - assigned) };
    }
    return stats;
  }, [filteredRows]);

  // ─── Sort mode: compute displayUpcoming, displayCompleted, freelancerGroups ───
  const isFreelancerMode = sortMode === 'freelancerMax' || sortMode === 'freelancerMin';

  const sortedFilteredRows = useMemo(() => {
    if (sortMode === 'default') return filteredRows;
    if (sortMode === 'drone') return filteredRows.filter(r => (r.droneOperator || '').trim()).sort((a, b) => (parseInt(a.eventDay) || 0) - (parseInt(b.eventDay) || 0));
    if (sortMode === 'maxEvents' || sortMode === 'minEvents') {
      const dayCntMap = new Map<string, number>();
      filteredRows.forEach(r => dayCntMap.set(r.eventDay, (dayCntMap.get(r.eventDay) || 0) + 1));
      const sorted = [...filteredRows].sort((a, b) => {
        const cntA = dayCntMap.get(a.eventDay) || 0;
        const cntB = dayCntMap.get(b.eventDay) || 0;
        const dir = sortMode === 'maxEvents' ? -1 : 1;
        if (cntA !== cntB) return (cntA - cntB) * dir;
        return (parseInt(a.eventDay) || 0) - (parseInt(b.eventDay) || 0);
      });
      return sorted;
    }
    if (sortMode === 'unassignedFirst') {
      return [...filteredRows].sort((a, b) => {
        const emptyA = CREW_COLUMNS.filter(col => {
          const reqCodes = (a.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
          const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
          return isReq && !(a[col.field] as string)?.trim();
        }).length;
        const emptyB = CREW_COLUMNS.filter(col => {
          const reqCodes = (b.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
          const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
          return isReq && !(b[col.field] as string)?.trim();
        }).length;
        return emptyB - emptyA;
      });
    }
    return filteredRows;
  }, [filteredRows, sortMode]);

  const displayUpcoming = useMemo(() =>
    sortMode === 'default'
      ? upcomingRows
      : sortedFilteredRows.filter(row => !row.eventDay || row.eventDay.includes('**') || !isBSDatePast(row.eventYear, row.eventMonth, row.eventDay)),
    [sortMode, upcomingRows, sortedFilteredRows]
  );

  const displayCompleted = useMemo(() =>
    sortMode === 'default'
      ? completedRows
      : sortedFilteredRows.filter(row => row.eventDay && !row.eventDay.includes('**') && isBSDatePast(row.eventYear, row.eventMonth, row.eventDay)),
    [sortMode, completedRows, sortedFilteredRows]
  );

  const freelancerGroups = useMemo<FreelancerGroupData[]>(() => {
    if (!isFreelancerMode) return [];
    const curMonth = parseInt(selectedMonth);
    const curYear = parseInt(selectedYear);
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
    const nextYear = curMonth === 12 ? curYear + 1 : curYear;

    const nameMap = new Map<string, FreelancerAssignment[]>();
    filteredRows.forEach(row => {
      CREW_COLUMNS.forEach(col => {
        const val = (row[col.field] as string)?.trim();
        if (val) {
          const upper = val.toUpperCase();
          if (!nameMap.has(upper)) nameMap.set(upper, []);
          // Avoid duplicates
          const existing = nameMap.get(upper)!;
          if (!existing.some(e => e.registeredDateTimeAD === row.registeredDateTimeAD && e.event === row.event && e.eventDateAD === row.eventDateAD)) {
            existing.push(row);
          }
        }
      });
    });

    const groups: FreelancerGroupData[] = [];
    nameMap.forEach((rows, upperName) => {
      // Find original casing
      const displayName = rows.length > 0
        ? CREW_COLUMNS.reduce<string>((found, col) => {
            if (found) return found;
            for (const r of rows) { const v = (r[col.field] as string)?.trim(); if (v && v.toUpperCase() === upperName) return v; }
            return found;
          }, '') || upperName
        : upperName;

      // Count across all assignments for stats
      const countInMonth = (y: number, m: number) => {
        let cnt = 0;
        const yStr = String(y);
        const mStr = String(m);
        assignments.forEach(a => {
          if (a.eventYear !== yStr || a.eventMonth !== mStr) return;
          CREW_COLUMNS.forEach(col => {
            if ((a[col.field] as string)?.trim().toUpperCase() === upperName) cnt++;
          });
        });
        return cnt;
      };

      groups.push({
        name: displayName,
        thisMonth: countInMonth(curYear, curMonth),
        lastMonth: countInMonth(prevYear, prevMonth),
        nextMonth: countInMonth(nextYear, nextMonth),
        allTime: assignments.filter(a => CREW_COLUMNS.some(col => (a[col.field] as string)?.trim().toUpperCase() === upperName)).length,
        rows,
      });
    });

    groups.sort((a, b) => sortMode === 'freelancerMax' ? b.thisMonth - a.thisMonth : a.thisMonth - b.thisMonth);
    return groups;
  }, [isFreelancerMode, filteredRows, assignments, selectedYear, selectedMonth, sortMode]);

  // ─── Render helpers ───
  const renderDesktopEventRow = useCallback((row: FreelancerAssignment, idx: number, rowsList: FreelancerAssignment[], isCompleted = false) => {
    const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
    const groupIdx = dayGroups.get(rowKey) ?? 0;
    const dayColor = DAY_COLORS[groupIdx % DAY_COLORS.length];
    const isExpanded = expandedRows.has(rowKey);
    const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
    const cached = expandCache.get(cacheKey);
    const isLagan = laganDays.has(parseInt(row.eventDay));
    const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);

    // Date group thick border for maxEvents / minEvents
    const showThickBorder = (sortMode === 'maxEvents' || sortMode === 'minEvents') && idx > 0 && rowsList[idx - 1]?.eventDay !== row.eventDay;

    return (
      <React.Fragment key={`desk-${rowKey}`}>
        {showThickBorder && (
          <tr><td colSpan={13} className="h-1 bg-violet-400" /></tr>
        )}
        <tr className={cn(dayColor, isCompleted && "opacity-60", "hover:brightness-95 transition-all border-b border-gray-200")}>
          <td className="px-3 py-2 text-xs font-black text-gray-700 border-r border-gray-200 text-center whitespace-nowrap">
            <button onClick={() => setFilterDay(filterDay === row.eventDay ? null : row.eventDay)} className="hover:text-violet-600 transition-colors flex items-center gap-1 justify-center w-full">
              {isLagan && <GaneshIcon size={14} />}
              {row.eventDay}
            </button>
          </td>
          <td className="px-2 py-2 border-r border-gray-200">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <button
                  onClick={() => toggleExpand(rowKey, row)}
                  className="text-sm font-bold text-gray-800 hover:text-violet-600 transition-colors truncate max-w-[170px] block text-left"
                >
                  {row.clientName}
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 p-3 z-[200]" side="right" avoidCollisions>
                <ClientHoverPreview registeredDateTimeAD={row.registeredDateTimeAD} clientName={row.clientName} onOpenFull={() => navigate(`/client/${row.registeredDateTimeAD}`)} />
              </HoverCardContent>
            </HoverCard>
          </td>
          <td className="px-2 py-2 border-r border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate">{row.event}</span>
              {!readOnly && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="shrink-0 p-0.5 hover:bg-gray-100 rounded transition-colors ml-auto">
                      <Settings className="w-3 h-3 text-gray-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="end" side="bottom">
                    <CrewCategorySelector
                      selected={(row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean)}
                      onChange={(codes) => {
                        const cats = codes.join(',');
                        setAssignments(prev => prev.map(a =>
                          a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
                            ? { ...a, requiredCategories: cats }
                            : a
                        ));
                        import('@/lib/freelancer-assignment-api').then(({ updateRequiredCrewCategories }) => {
                          updateRequiredCrewCategories(row.registeredDateTimeAD, row.event, row.eventDateAD, cats);
                        });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </td>
          {CREW_COLUMNS.map((col, cIdx) => {
            const isRequired = reqCodes.length === 0 || reqCodes.includes(col.short);
            const nextCol = CREW_COLUMNS[cIdx + 1];
            const nextReqCodes = nextCol ? (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean) : [];
            const isNextRequired = nextCol ? (nextReqCodes.length === 0 || nextReqCodes.includes(nextCol.short)) : true;
            return (
              <CrewCell
                key={col.field}
                value={(row[col.field] as string) || ''}
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
                onFilterFreelancer={setFilterFreelancer}
              />
            );
          })}
        </tr>
        {isExpanded && cached && (
          <tr>
            <td colSpan={13} className="bg-gray-50/80 px-3 py-2 border-b border-gray-300">
              <EventLogisticsPanel eventDetail={cached.eventDetail} contactDetail={cached.contactDetail} settings={cached.settings} loading={cached.loading} row={row} />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  }, [dayGroups, expandedRows, expandCache, laganDays, filterDay, readOnly, freelancers, assignments, selectedYear, selectedMonth, columnWidths, sortMode, navigate, handleAssign, toggleExpand, setFilterDay, setFilterFreelancer, setQuickAddState, setAssignments]);

  const renderMobileEventCard = useCallback((row: FreelancerAssignment, idx: number, rowsList: FreelancerAssignment[], isCompleted = false) => {
    const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
    const isExpanded = expandedRows.has(rowKey);
    const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
    const cached = expandCache.get(cacheKey);
    const isLagan = laganDays.has(parseInt(row.eventDay));
    const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
    const showThickBorder = (sortMode === 'maxEvents' || sortMode === 'minEvents') && idx > 0 && rowsList[idx - 1]?.eventDay !== row.eventDay;

    return (
      <React.Fragment key={`mob-${rowKey}`}>
        {showThickBorder && <div className="h-1 bg-violet-400 rounded-full my-2" />}
        <div className={cn("rounded-xl border-2 p-3 shadow-sm transition-all", isCompleted ? "opacity-60 border-gray-200 bg-gray-50" : "border-violet-200 bg-white")}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => toggleExpand(rowKey, row)} className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-black text-violet-600 shrink-0 flex items-center gap-1">
                {isLagan && <GaneshIcon size={12} />}
                {row.eventDay}
              </span>
              <span className="text-sm font-bold text-gray-800 truncate">{row.clientName}</span>
            </button>
            <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold shrink-0">{row.event}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CREW_COLUMNS.map(col => {
              const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
              if (!isReq) return null;
              const val = (row[col.field] as string)?.trim();
              return (
                <div key={col.field} className="flex items-center gap-0.5">
                  {val ? (
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <span className={cn("text-[10px] px-2 py-1 rounded-full font-semibold border", PILL_STYLES[col.group])}>
                          {col.short}: {getFirstName(val)}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 p-3 z-[200]" side="bottom">
                        <FreelancerHoverInfo name={val} allAssignments={assignments} selectedYear={selectedYear} selectedMonth={selectedMonth} freelancers={freelancers} onFilterFreelancer={setFilterFreelancer} />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full border border-dashed border-red-300 text-red-400 animate-pulse-red">
                      {col.short}: ---
                    </span>
                  )}
                  {!readOnly && !val && (
                    <MobileCrewAssign
                      field={col.field}
                      label={col.label}
                      freelancers={freelancers}
                      onAssign={(name) => handleAssign(row, col.field, name)}
                      onQuickAdd={() => setQuickAddState({ open: true, field: col.field, label: col.label, row })}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {isExpanded && cached && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <EventLogisticsPanel eventDetail={cached.eventDetail} contactDetail={cached.contactDetail} settings={cached.settings} loading={cached.loading} row={row} />
            </div>
          )}
        </div>
      </React.Fragment>
    );
  }, [expandedRows, expandCache, laganDays, readOnly, freelancers, assignments, selectedYear, selectedMonth, sortMode, handleAssign, toggleExpand, setFilterFreelancer, setQuickAddState]);

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
        <div className="flex items-center gap-1 ml-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              const m = parseInt(selectedMonth);
              if (m <= 1) { setSelectedMonth("12"); setSelectedYear(String(parseInt(selectedYear) - 1)); }
              else setSelectedMonth(String(m - 1));
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              const m = parseInt(selectedMonth);
              if (m >= 12) { setSelectedMonth("1"); setSelectedYear(String(parseInt(selectedYear) + 1)); }
              else setSelectedMonth(String(m + 1));
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!readOnly && (
          <>
            <LaganDatesPicker
              bsYear={parseInt(selectedYear)}
              bsMonth={parseInt(selectedMonth)}
              laganDays={laganDays}
              onLaganDaysChange={setLaganDays}
            />
            {laganDays.size > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from(laganDays).sort((a, b) => a - b).map(day => (
                  <button
                    key={day}
                    onClick={() => setFilterDay(filterDay === String(day) ? null : String(day))}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer",
                      filterDay === String(day)
                        ? "bg-orange-600 text-white ring-2 ring-orange-300 scale-110"
                        : "bg-orange-400/80 text-white hover:bg-orange-500"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-auto h-8 bg-white/15 border-white/30 text-white text-xs gap-1.5 [&>svg]:text-white px-2.5">
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="maxEvents">Max Events</SelectItem>
                <SelectItem value="minEvents">Min Events</SelectItem>
                <SelectItem value="drone">Drone</SelectItem>
                <SelectItem value="freelancerMax">Freelancer Max</SelectItem>
                <SelectItem value="freelancerMin">Freelancer Min</SelectItem>
                <SelectItem value="unassignedFirst">Unassigned First</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-white hover:bg-white/20 hover:text-white"
              onClick={handleToggleExpandAll}
              disabled={filteredRows.length === 0}
            >
              {allExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {allExpanded ? "Collapse All" : "Expand All"}
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
      {(filterDay || filterClient || filterFreelancer) && (
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
          {filterFreelancer && (
            <button onClick={() => setFilterFreelancer(null)} className="inline-flex items-center gap-1 bg-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-amber-300 transition-colors">
              👤 {filterFreelancer} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => { setFilterDay(null); setFilterClient(null); setFilterFreelancer(null); }} className="text-xs text-violet-500 hover:text-violet-700 underline ml-2">
            Clear All
          </button>
        </div>
      )}

      {/* Table Container */}
      {loading && assignments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500">Loading crew data...</p>
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
              ) : isFreelancerMode ? (
                freelancerGroups.length === 0 ? (
                  <div className="text-center py-20 text-gray-400"><p className="text-lg font-medium">No freelancer assignments found</p></div>
                ) : (
                  freelancerGroups.map(group => {
                    const isGroupOpen = freelancerExpandedGroups.has(group.name);
                    return (
                      <div key={`fl-m-${group.name}`}>
                        <button
                          onClick={() => setFreelancerExpandedGroups(prev => { const n = new Set(prev); n.has(group.name) ? n.delete(group.name) : n.add(group.name); return n; })}
                          className="w-full bg-gradient-to-r from-violet-100 via-purple-50 to-indigo-100 rounded-xl border-2 border-violet-300 p-3 mb-2 hover:from-violet-200 hover:to-indigo-200 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            {isGroupOpen ? <ChevronUp className="w-4 h-4 text-violet-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-violet-600 shrink-0" />}
                            <span className="font-bold text-violet-900 text-sm">{group.name}</span>
                          </div>
                          <div className="flex gap-2 text-[10px] mt-2 flex-wrap">
                            <span className="bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-semibold">This: {group.thisMonth}</span>
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Last: {group.lastMonth}</span>
                            <span className="bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">Next: {group.nextMonth}</span>
                            <span className="bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">All: {group.allTime}</span>
                          </div>
                        </button>
                        {isGroupOpen && (
                          <div className="space-y-2 ml-2 mb-3">
                            {group.rows.map((row, rIdx) => renderMobileEventCard(row, rIdx, group.rows))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                <>
                  {displayUpcoming.length > 0 && displayCompleted.length > 0 && sortMode === 'default' && (
                    <div className="flex items-center gap-2 px-1 pb-1">
                      <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Upcoming Events</span>
                      <span className="text-xs text-gray-400">({displayUpcoming.length})</span>
                    </div>
                  )}
                  {displayUpcoming.map((row, idx) => renderMobileEventCard(row, idx, displayUpcoming))}
                  {sortMode === 'default' && displayCompleted.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 py-2 px-1">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Events ({displayCompleted.length})</span>
                        <div className="flex-1 h-px bg-gray-300" />
                      </div>
                      {displayCompleted.map((row, idx) => renderMobileEventCard(row, idx, displayCompleted, true))}
                    </>
                  )}
                </>
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
                  {CREW_COLUMNS.map(col => {
                    const s = columnStats[col.field];
                    return (
                      <th
                        key={col.field}
                        className={cn("text-xs font-bold px-1 py-2.5 text-center border-r last:border-r-0", GROUP_STYLES[col.group])}
                        style={{ width: `${columnWidths[col.field]}px`, minWidth: `${columnWidths[col.field]}px` }}
                      >
                        <span className="relative flex items-center justify-center whitespace-nowrap" style={{ height: '36px' }}>
                          <span className="absolute top-0 left-0 font-black text-sm leading-none">{s?.remaining ?? 0}</span>
                          <span className="font-bold text-[11px]">{col.short}</span>
                          <span className="absolute bottom-0 right-0 text-[8px] opacity-60 leading-none">{s?.assigned ?? 0}/{s?.total ?? 0}</span>
                        </span>
                      </th>
                    );
                  })}
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
                ) : isFreelancerMode ? (
                  freelancerGroups.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-20 text-gray-400"><p className="text-lg font-medium">No freelancer assignments found</p></td></tr>
                  ) : (
                    <>
                      {freelancerGroups.map(group => {
                        const isGroupOpen = freelancerExpandedGroups.has(group.name);
                        return (
                          <React.Fragment key={`fl-${group.name}`}>
                            <tr
                              className="bg-gradient-to-r from-violet-100 via-purple-50 to-indigo-100 border-b-2 border-violet-300 cursor-pointer hover:from-violet-200 hover:to-indigo-200 transition-all"
                              onClick={() => setFreelancerExpandedGroups(prev => { const n = new Set(prev); n.has(group.name) ? n.delete(group.name) : n.add(group.name); return n; })}
                            >
                              <td colSpan={13} className="px-4 py-3">
                                <div className="flex items-center gap-4">
                                  {isGroupOpen ? <ChevronUp className="w-4 h-4 text-violet-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-violet-600 shrink-0" />}
                                  <span className="font-bold text-violet-900 text-base">{group.name}</span>
                                  <div className="flex gap-3 text-xs ml-auto flex-wrap">
                                    <span className="bg-violet-200 text-violet-800 px-2.5 py-1 rounded-full font-semibold">This Month: {group.thisMonth}</span>
                                    <span className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">Last Month: {group.lastMonth}</span>
                                    <span className="bg-blue-200 text-blue-700 px-2.5 py-1 rounded-full">Next Month: {group.nextMonth}</span>
                                    <span className="bg-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">All Time: {group.allTime}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isGroupOpen && group.rows.map((row, rIdx) => renderDesktopEventRow(row, rIdx, group.rows))}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )
                ) : (
                  <>
                    {displayUpcoming.length > 0 && displayCompleted.length > 0 && sortMode === 'default' && (
                      <tr><td colSpan={13} className="bg-violet-50 border-y border-violet-200 px-4 py-1.5"><span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Upcoming Events ({displayUpcoming.length})</span></td></tr>
                    )}
                    {displayUpcoming.map((row, idx) => renderDesktopEventRow(row, idx, displayUpcoming))}
                    {sortMode === 'default' && displayCompleted.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={13} className="bg-gray-100 border-y border-gray-300 px-4 py-2.5">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Events ({displayCompleted.length})</span>
                          </td>
                        </tr>
                        {displayCompleted.map((row, idx) => renderDesktopEventRow(row, idx, displayCompleted, true))}
                      </>
                    )}
                  </>
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

    </div>
  );
}

/* ─── Client Hover Preview ─── */
function ClientHoverPreview({ registeredDateTimeAD, clientName, onOpenFull }: {
  registeredDateTimeAD: string;
  clientName: string;
  onOpenFull: () => void;
}) {
  const clients = getMemoryClients() || [];
  const client = clients.find(c => c.registeredDateTimeAD === registeredDateTimeAD);

  if (!client) {
    return <div className="p-3 text-xs text-gray-400 text-center">Loading…</div>;
  }

  // Derive current status from statusLog
  const deriveStatus = (statusLog?: string) => {
    if (!statusLog) return 'UNTOUCHED';
    const lines = statusLog.split('\n').filter(Boolean);
    if (!lines.length) return 'UNTOUCHED';
    const last = lines[lines.length - 1];
    return last.split(/[\s\[–-]/)[0].trim() || 'UNTOUCHED';
  };
  const status = deriveStatus(client.statusLog);
  const handler = client.clientHandler || '—';
  const contact = client.contactNo || client.whatsappNo || '—';
  const events = client.events || '—';
  const location = client.clientLocation || client.eventCity || '—';
  const inquiryDate = client.inquiryDateBS || client.inquiryDateAD || '—';
  const comments = client.comments || '';
  const lastComment = comments.split('\n').filter(Boolean).slice(-1)[0] || '';

  const statusColors: Record<string, string> = {
    BOOKED: 'bg-emerald-100 text-emerald-800',
    'ADVANCE PENDING': 'bg-blue-100 text-blue-800',
    'QUOTATION SENT': 'bg-violet-100 text-violet-800',
    COLD: 'bg-slate-100 text-slate-700',
    LOST: 'bg-red-100 text-red-700',
    UNTOUCHED: 'bg-gray-100 text-gray-600',
  };
  const statusCls = statusColors[status] || 'bg-amber-100 text-amber-800';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm text-gray-900 leading-tight">{clientName}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{inquiryDate}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusCls}`}>
          {status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <div>
          <p className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">Handler</p>
          <p className="text-gray-800 font-semibold">{handler}</p>
        </div>
        <div>
          <p className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">Contact</p>
          <p className="text-gray-800">{contact}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">Events</p>
          <p className="text-gray-800 truncate">{events}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">Location</p>
          <p className="text-gray-800">{location}</p>
        </div>
        {lastComment && (
          <div className="col-span-2">
            <p className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">Last Note</p>
            <p className="text-gray-700 italic text-[10px] line-clamp-2 leading-relaxed">{lastComment}</p>
          </div>
        )}
      </div>
      <button
        onClick={onOpenFull}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        <ChevronRight className="w-3 h-3" />
        Open Client Page
      </button>
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

  // Memoize mapped data BEFORE any early returns (React hooks rule)
  const mappedAssignment = useMemo<AssignmentRow>(() => ({
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
  }), [row]);

  const mappedEventDetail = useMemo<EventDetail | undefined>(() => {
    if (!eventDetail) return undefined;
    return {
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
    };
  }, [eventDetail]);

  const mappedContactDetails = useMemo(() => {
    if (!contactDetail) return null;
    return {
      brideFullName: contactDetail.bride_full_name || '',
      brideContactNumber: contactDetail.bride_contact_number || '',
      brideWhatsappNumber: contactDetail.bride_whatsapp_number || '',
      brideHomeCity: contactDetail.bride_home_city || '',
      brideHomeArea: contactDetail.bride_home_area || '',
      brideHomeMap: contactDetail.bride_home_map || '',
      brideHomeLandmark: contactDetail.bride_home_landmark || '',
      brideBackupNumber: contactDetail.bride_backup_number || '',
      brideBackupRelation: contactDetail.bride_backup_relation || '',
      brideBackupNumber2: contactDetail.bride_backup_number2 || '',
      brideBackupRelation2: contactDetail.bride_backup_relation2 || '',
      brideInstagram: contactDetail.bride_instagram || '',
      groomFullName: contactDetail.groom_full_name || '',
      groomContactNumber: contactDetail.groom_contact_number || '',
      groomWhatsappNumber: contactDetail.groom_whatsapp_number || '',
      groomHomeCity: contactDetail.groom_home_city || '',
      groomHomeArea: contactDetail.groom_home_area || '',
      groomHomeMap: contactDetail.groom_home_map || '',
      groomHomeLandmark: contactDetail.groom_home_landmark || '',
      groomBackupNumber: contactDetail.groom_backup_number || '',
      groomBackupRelation: contactDetail.groom_backup_relation || '',
      groomBackupNumber2: contactDetail.groom_backup_number2 || '',
      groomBackupRelation2: contactDetail.groom_backup_relation2 || '',
      groomInstagram: contactDetail.groom_instagram || '',
    } as ClientContactDetails;
  }, [contactDetail]);

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
            onClick={(e) => { e.stopPropagation(); setCalendarFor(name); }}
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
          contactDetails={mappedContactDetails}
          freelancerName={calendarFor}
        />
      )}
    </div>
  );
}

/* ─── Shared Freelancer Hover Info ─── */
function FreelancerHoverInfo({ name, allAssignments, selectedYear, selectedMonth, freelancers, onFilterFreelancer }: { name: string; allAssignments: FreelancerAssignment[]; selectedYear: string; selectedMonth: string; freelancers: FreelancerData[]; onFilterFreelancer?: (name: string) => void }) {
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
      {onFilterFreelancer && (
        <button
          onClick={() => onFilterFreelancer(name.trim())}
          className="w-full mt-2 flex items-center justify-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          Show only {getFirstName(name)}'s rows
        </button>
      )}
      <button
        onClick={handleSendToWhatsApp}
        className="w-full mt-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
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
  onFilterFreelancer,
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
  onFilterFreelancer?: (name: string) => void;
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
              <FreelancerHoverInfo name={value} allAssignments={allAssignments} selectedYear={selectedYear} selectedMonth={selectedMonth} freelancers={freelancers} onFilterFreelancer={onFilterFreelancer} />
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
