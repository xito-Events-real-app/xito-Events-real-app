import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, RefreshCw, X, ChevronLeft, Database, Trash2, Download, Upload, UserCog } from "lucide-react";
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
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { QuickAddFreelancerDialog } from "./QuickAddFreelancerDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CrewCategorySelector } from "@/components/shared/CrewCategorySelector";

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

interface AllClientsCrewTableProps {
  onClose?: () => void;
}

export function AllClientsCrewTable({ onClose }: AllClientsCrewTableProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allAssignments, allFreelancers] = await Promise.all([
        getAllFreelancerAssignments(),
        getFreelancers(),
      ]);
      setAssignments(allAssignments);
      setFreelancers(allFreelancers);
      try { sessionStorage.setItem('crew_assignments_cache', JSON.stringify(allAssignments)); } catch {}
      try { sessionStorage.setItem('crew_freelancers_cache', JSON.stringify(allFreelancers)); } catch {}
    } catch (err) {
      toast.error("Failed to load crew data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleSync = useCallback(async (silent = false) => {
    if (isBusy.current) {
      if (!silent) toast.info("Another sync is already running, please wait");
      return;
    }
    isBusy.current = true;
    if (!silent) setSyncing(true);
    try {
      // Step 1: Sync EVENT DETAILS (populate new + remove stale against BOOKED CLIENTS)
      await supabase.functions.invoke('google-sheets', {
        body: { action: 'fullSyncEventDetails' }
      });
      // Step 2: Sync FREELANCERS (populate new + remove stale against EVENT DETAILS)
      const result = await fullSyncFreelancerAssignments();
      // Step 3: Sync CONTACT DETAILS (populate new + remove stale against BOOKED CLIENTS)
      await supabase.functions.invoke('google-sheets', {
        body: { action: 'fullSyncContactDetails' }
      });
      if (!silent) {
        toast.success(`Synced! ${result.copiedCount} new, ${result.updatedCount} updated`);
      }
      await loadData();
    } catch (err) {
      if (!silent) toast.error("Sync failed");
    } finally {
      isBusy.current = false;
      if (!silent) setSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    try {
      const cachedA = sessionStorage.getItem('crew_assignments_cache');
      const cachedF = sessionStorage.getItem('crew_freelancers_cache');
      if (cachedA) setAssignments(JSON.parse(cachedA));
      if (cachedF) setFreelancers(JSON.parse(cachedF));
      if (cachedA) setLoading(false);
    } catch {}
    loadData();
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      handleSync(true);
    }
    // Background full sync every 30 min, but skips if busy
    const interval = setInterval(() => handleSync(true), SYNC_INTERVAL);

    // Cache invalidation listeners -- lightweight only
    const handleClientChange = () => loadData();
    window.addEventListener('clients-invalidate', handleClientChange);
    window.addEventListener('booked-clients-invalidate', handleClientChange);

    return () => {
      clearInterval(interval);
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
      await updateFreelancerAssignment(row.registeredDateTimeAD, row.event, row.eventDateAD, field, freelancerName);
      setAssignments(prev => prev.map(a =>
        a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
          ? { ...a, [field]: freelancerName }
          : a
      ));
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

  const assignedCount = useMemo(() => {
    let count = 0;
    filteredRows.forEach(row => {
      CREW_COLUMNS.forEach(col => {
        if ((row[col.field] as string)?.trim()) count++;
      });
    });
    return count;
  }, [filteredRows]);

  const totalCells = filteredRows.length * CREW_COLUMNS.length;

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
          <h1 className="text-lg font-bold tracking-wide">ALL CLIENTS</h1>
        </div>
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
        <Button variant="ghost" size="sm" onClick={() => handleSync(false)} disabled={syncing || isBusy.current} className="gap-1.5 text-white hover:bg-white/20 hover:text-white ml-1">
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
                await updateRequiredCrewCategories(
                  row.registeredDateTimeAD,
                  row.event,
                  row.eventDateAD,
                  cats
                );
                updatedCount++;
              }
              await loadData();
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
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">{filteredRows.length} events</span>
            <span className="bg-emerald-500/80 px-3 py-1 rounded-full font-medium text-xs">{assignedCount}/{totalCells} assigned</span>
          </div>
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
                  const groupIdx = dayGroups.get(rowKey) ?? 0;
                  const dayBg = DAY_COLORS[groupIdx % DAY_COLORS.length];
                  return (
                    <div key={`${rowKey}-${idx}`} className={cn("rounded-xl border border-gray-200 p-3 shadow-sm", dayBg)}>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => setFilterDay(filterDay === row.eventDay ? null : row.eventDay)}
                          className={cn(
                            "inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 transition-all",
                            filterDay === row.eventDay
                              ? "bg-violet-600 text-white ring-2 ring-violet-400"
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
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CREW_COLUMNS.map(col => {
                          const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                          const isReq = reqCodes.length === 0 || reqCodes.includes(col.short);
                          const val = (row[col.field] as string)?.trim();
                          return (
                            <div key={col.field} className="flex items-center gap-1.5">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", GROUP_STYLES[col.group])}>
                                {col.short}
                              </span>
                              {!isReq ? (
                                <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                                  {val ? <span className="line-through opacity-60">{val}</span> : '—'}
                                </span>
                              ) : val ? (
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
                                      <FreelancerHoverInfo name={val} allAssignments={assignments} selectedYear={selectedYear} selectedMonth={selectedMonth} />
                                    </HoverCardContent>
                                  </HoverCard>
                                  <button
                                    onClick={() => handleAssign(row, col.field, '')}
                                    className="p-0.5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 shrink-0"
                                    title="Remove"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
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
                    const groupIdx = dayGroups.get(rowKey) ?? 0;
                    const dayBg = DAY_COLORS[groupIdx % DAY_COLORS.length];
                    return (
                      <tr
                        key={`${rowKey}-${idx}`}
                        className={cn("border-b border-gray-100 hover:bg-violet-50/40 transition-colors group", dayBg)}
                      >
                        <td className="px-3 py-2 border-r border-gray-100 text-center">
                          <button
                            onClick={() => setFilterDay(filterDay === row.eventDay ? null : row.eventDay)}
                            className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all",
                              filterDay === row.eventDay
                                ? "bg-violet-600 text-white ring-2 ring-violet-400"
                                : "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer"
                            )}
                          >
                            {row.eventDay}
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
                                      await updateRequiredCrewCategories(row.registeredDateTimeAD, row.event, row.eventDateAD, codes.join(','));
                                      setAssignments(prev => prev.map(a =>
                                        a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
                                          ? { ...a, requiredCategories: codes.join(',') }
                                          : a
                                      ));
                                    } catch { toast.error("Failed to update categories"); }
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </td>
                        {CREW_COLUMNS.map(col => {
                          const reqCodes = (row.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
                          const isRequired = reqCodes.length === 0 || reqCodes.includes(col.short);
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
                            />
                          );
                        })}
                      </tr>
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
    </div>
  );
}

/* ─── Shared Freelancer Hover Info ─── */
function FreelancerHoverInfo({ name, allAssignments, selectedYear, selectedMonth }: { name: string; allAssignments: FreelancerAssignment[]; selectedYear: string; selectedMonth: string }) {
  const navigate = useNavigate();
  const currentBS = getCurrentBSDate();

  const { monthEvents, upcomingEvents } = useMemo(() => {
    const upper = name.trim().toUpperCase();
    const monthEvts: { clientName: string; event: string; day: string; month: string; year: string }[] = [];

    for (const a of allAssignments) {
      for (const col of CREW_COLUMNS) {
        const cellVal = (a[col.field] as string)?.trim().toUpperCase();
        if (cellVal === upper) {
          // Filter to selected month/year only
          if (a.eventYear === selectedYear && a.eventMonth === selectedMonth) {
            monthEvts.push({ clientName: a.clientName, event: a.event, day: a.eventDay, month: a.eventMonth, year: a.eventYear });
          }
          break;
        }
      }
    }

    // Filter out past events
    const upcoming = monthEvts.filter(ev => {
      return !isBSDatePast(ev.year, ev.month, ev.day);
    });

    // Sort by day
    upcoming.sort((a, b) => (parseInt(a.day) || 0) - (parseInt(b.day) || 0));

    return { monthEvents: monthEvts, upcomingEvents: upcoming };
  }, [name, allAssignments, selectedYear, selectedMonth]);

  const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || selectedMonth;

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
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => getFilteredFreelancersByRole(freelancers, field), [freelancers, field]);
  const hasValue = value && value.trim().length > 0;
  const firstName = hasValue ? getFirstName(value) : "";

  if (!isRequired) {
    return (
      <td
        className="px-1 py-1.5 border-r border-gray-100 last:border-r-0"
        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
      >
        <div className="w-full text-[9px] px-1 py-1.5 rounded-md text-center bg-gray-900 text-gray-500 font-medium">
          {hasValue ? <span className="line-through opacity-60">{firstName}</span> : '—'}
        </div>
      </td>
    );
  }

  return (
    <td
      className="px-1 py-1.5 border-r border-gray-100 last:border-r-0"
      style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
    >
      {hasValue ? (
        <div className="relative">
          {/* HoverCard wraps a simple span — NOT the Popover */}
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <span
                className={cn(
                  "block w-full text-xs px-2 py-1.5 rounded-md text-center truncate border font-medium cursor-pointer transition-all",
                  PILL_STYLES[group]
                )}
                onClick={() => setOpen(true)}
              >
                {firstName}
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-3 z-[200]" side="bottom" avoidCollisions={true} collisionPadding={16}>
              <FreelancerHoverInfo name={value} allAssignments={allAssignments} selectedYear={selectedYear} selectedMonth={selectedMonth} />
            </HoverCardContent>
          </HoverCard>

          {/* Popover is separate, triggered by state */}
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
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full text-xs px-2 py-1.5 rounded-md text-center truncate transition-all border border-dashed border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50">
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
