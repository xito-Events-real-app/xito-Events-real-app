import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, RefreshCw, X, ChevronLeft, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";
// NEPALI_MONTHS no longer needed for filter
import {
  getAllFreelancerAssignments,
  updateFreelancerAssignment,
  getFilteredFreelancersByRole,
  FreelancerAssignment,
  FreelancerField,
  fullSyncFreelancerAssignments,
} from "@/lib/freelancer-assignment-api";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { QuickAddFreelancerDialog } from "./QuickAddFreelancerDialog";
import { useNavigate } from "react-router-dom";

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

const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

const DAY_COLORS = [
  "bg-white",
  "bg-blue-50/60",
  "bg-amber-50/50",
  "bg-emerald-50/50",
  "bg-purple-50/50",
  "bg-rose-50/50",
  "bg-cyan-50/50",
  "bg-orange-50/50",
];

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
  const hasSyncedOnMount = useRef(false);
  const [quickAddState, setQuickAddState] = useState<{ open: boolean; field: FreelancerField; label: string; row: FreelancerAssignment | null }>({
    open: false, field: 'photographerBride', label: '', row: null
  });

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

  const handleSync = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const result = await fullSyncFreelancerAssignments();
      if (!silent) {
        toast.success(`Synced! ${result.copiedCount} new, ${result.updatedCount} updated`);
      }
      await loadData();
    } catch (err) {
      if (!silent) toast.error("Sync failed");
    } finally {
      if (!silent) setSyncing(false);
    }
  }, [loadData]);

  // Instant load from cache, then fresh fetch, then background sync
  useEffect(() => {
    // 1. Load from cache instantly
    try {
      const cachedA = sessionStorage.getItem('crew_assignments_cache');
      const cachedF = sessionStorage.getItem('crew_freelancers_cache');
      if (cachedA) setAssignments(JSON.parse(cachedA));
      if (cachedF) setFreelancers(JSON.parse(cachedF));
      if (cachedA) setLoading(false);
    } catch {}

    // 2. Fresh data fetch
    loadData();

    // 3. Background sync (non-blocking, won't show loading)
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      handleSync(true).then(() => loadData());
    }

    // 4. Auto-sync every 30 mins
    const interval = setInterval(() => handleSync(true).then(() => loadData()), SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [handleSync, loadData]);

  // Fix filter: convert month number to month name for comparison
  const filteredRows = useMemo(() => {
    return assignments
      .filter(a => {
        const yearMatch = a.eventYear === selectedYear;
        const monthMatch = a.eventMonth === selectedMonth;
        return yearMatch && monthMatch;
      })
      .sort((a, b) => {
        const dayA = parseInt(a.eventDay) || 0;
        const dayB = parseInt(b.eventDay) || 0;
        return dayA - dayB;
      });
  }, [assignments, selectedYear, selectedMonth]);

  // Compute day groups for same-day background coloring
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

  const years = getBSYearsRange(-3, 3);

  const handleAssign = async (row: FreelancerAssignment, field: FreelancerField, freelancerName: string) => {
    try {
      await updateFreelancerAssignment(row.registeredDateTimeAD, row.event, row.eventDateAD, field, freelancerName);
      setAssignments(prev => prev.map(a =>
        a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
          ? { ...a, [field]: freelancerName }
          : a
      ));
      toast.success(`Assigned ${freelancerName}`);
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

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="gap-1.5 text-white hover:bg-white/20 hover:text-white ml-1"
        >
          <Database className={cn("w-3.5 h-3.5", syncing && "animate-pulse")} />
          {syncing ? "Syncing..." : "Sync Clients"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="gap-1.5 text-white hover:bg-white/20 hover:text-white"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">
              {filteredRows.length} events
            </span>
            <span className="bg-emerald-500/80 px-3 py-1 rounded-full font-medium text-xs">
              {assignedCount}/{totalCells} assigned
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

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
                      {/* Card Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-bold text-sm shrink-0">
                          {row.eventDay}
                        </span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/client/${encodeURIComponent(row.registeredDateTimeAD)}`)}
                            className="text-sm font-bold text-gray-900 hover:text-violet-600 transition-colors truncate block"
                          >
                            {row.clientName}
                          </button>
                          <p className="text-xs text-gray-500 truncate">{row.event}</p>
                        </div>
                      </div>

                      {/* Crew Grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {CREW_COLUMNS.map(col => {
                          const val = (row[col.field] as string)?.trim();
                          return (
                            <div key={col.field} className="flex items-center gap-1.5">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", GROUP_STYLES[col.group])}>
                                {col.short}
                              </span>
                              {val ? (
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  <span className="text-xs text-gray-800 truncate">{val}</span>
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
                      className={cn(
                        "text-xs font-bold px-2 py-2.5 text-center border-r last:border-r-0",
                        GROUP_STYLES[col.group],
                        col.size === 'wide' ? 'min-w-[120px]' : 'min-w-[70px]'
                      )}
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
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm">
                            {row.eventDay}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-100">
                          <button
                            onClick={() => navigate(`/client/${encodeURIComponent(row.registeredDateTimeAD)}`)}
                            className="text-sm font-semibold text-gray-900 hover:text-violet-600 transition-colors truncate block max-w-[170px]"
                          >
                            {row.clientName}
                          </button>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-100 text-sm text-gray-600 truncate max-w-[140px]">
                          {row.event}
                        </td>
                        {CREW_COLUMNS.map(col => (
                          <CrewCell
                            key={col.field}
                            value={row[col.field] as string}
                            field={col.field}
                            label={col.label}
                            group={col.group}
                            size={col.size}
                            freelancers={freelancers}
                            allAssignments={assignments}
                            onAssign={(name) => handleAssign(row, col.field, name)}
                            onQuickAdd={() => setQuickAddState({ open: true, field: col.field, label: col.label, row })}
                          />
                        ))}
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

/* ─── Individual Crew Cell with Hover Card ─── */

const PILL_STYLES = {
  photo: 'bg-amber-50 text-amber-700 border-amber-200',
  video: 'bg-purple-50 text-purple-700 border-purple-200',
  assist: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tech: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const first = fullName.trim().split(/\s+/)[0];
  return first.length > 8 ? first.substring(0, 8) : first;
}

function CrewCell({
  value,
  field,
  label,
  group,
  size,
  freelancers,
  allAssignments,
  onAssign,
  onQuickAdd,
}: {
  value: string;
  field: FreelancerField;
  label: string;
  group: 'photo' | 'video' | 'assist' | 'tech';
  size: 'wide' | 'narrow';
  freelancers: FreelancerData[];
  allAssignments: FreelancerAssignment[];
  onAssign: (name: string) => void;
  onQuickAdd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => getFilteredFreelancersByRole(freelancers, field), [freelancers, field]);
  const hasValue = value && value.trim().length > 0;

  // Find upcoming events for this freelancer
  const upcomingEvents = useMemo(() => {
    if (!hasValue) return [];
    const name = value.trim().toUpperCase();
    const events: { clientName: string; event: string; day: string; month: string }[] = [];
    for (const a of allAssignments) {
      for (const col of CREW_COLUMNS) {
        const cellVal = (a[col.field] as string)?.trim().toUpperCase();
        if (cellVal === name) {
          events.push({ clientName: a.clientName, event: a.event, day: a.eventDay, month: a.eventMonth });
          break;
        }
      }
      if (events.length >= 5) break;
    }
    return events;
  }, [hasValue, value, allAssignments]);

  const shortName = hasValue ? getShortName(value) : "";

  return (
    <td className={cn("px-1 py-1.5 border-r border-gray-100 last:border-r-0", size === 'wide' ? 'min-w-[120px]' : 'min-w-[70px]')}>
      {hasValue ? (
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "w-full text-xs px-2 py-1.5 rounded-md text-center truncate transition-all border font-medium cursor-pointer",
                    PILL_STYLES[group]
                  )}
                >
                  {shortName}
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[200] w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${label}...`} />
                  <CommandList>
                    <CommandEmpty>No freelancers found</CommandEmpty>
                    {hasValue && (
                      <CommandGroup heading="Actions">
                        <CommandItem onSelect={() => { onAssign(''); setOpen(false); }} className="text-red-500 font-medium">
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Clear Assignment
                        </CommandItem>
                      </CommandGroup>
                    )}
                    {hasValue && <CommandSeparator />}
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
          </HoverCardTrigger>
          <HoverCardContent className="w-64 p-3" side="top">
            <div className="space-y-2">
              <p className="font-semibold text-sm text-gray-900">{value}</p>
              {upcomingEvents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Upcoming Events</p>
                  <div className="space-y-1">
                    {upcomingEvents.map((ev, i) => (
                      <div key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="truncate">{ev.clientName} — {ev.event} ({ev.day} {ev.month})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-full text-xs px-2 py-1.5 rounded-md text-center truncate transition-all border border-dashed border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50"
            >
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

/* ─── Mobile Crew Assign Popover (compact "+" button) ─── */
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
