import { useState, useEffect, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";
import {
  getAllFreelancerAssignments,
  updateFreelancerAssignment,
  getFilteredFreelancersByRole,
  FreelancerAssignment,
  FreelancerField,
} from "@/lib/freelancer-assignment-api";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { QuickAddFreelancerDialog } from "./QuickAddFreelancerDialog";
import { useNavigate } from "react-router-dom";

const CREW_COLUMNS: { field: FreelancerField; label: string; short: string }[] = [
  { field: 'photographerBride', label: 'Photographer Bride', short: 'PB' },
  { field: 'photographerGroom', label: 'Photographer Groom', short: 'PG' },
  { field: 'videographerBride', label: 'Videographer Bride', short: 'VB' },
  { field: 'videographerGroom', label: 'Videographer Groom', short: 'VG' },
  { field: 'extraPhotographer', label: 'Extra Photographer', short: 'EP' },
  { field: 'extraVideographer', label: 'Extra Videographer', short: 'EV' },
  { field: 'assistant', label: 'Assistant', short: 'Asst' },
  { field: 'iphoneShooter', label: 'iPhone Shooter', short: 'iPhone' },
  { field: 'droneOperator', label: 'Drone Operator', short: 'Drone' },
  { field: 'fpvOperator', label: 'FPV Operator', short: 'FPV' },
];

export function AllClientsCrewTable() {
  const navigate = useNavigate();
  const currentBS = getCurrentBSDate();
  const [selectedYear, setSelectedYear] = useState(String(currentBS.year));
  const [selectedMonth, setSelectedMonth] = useState(String(currentBS.month));
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerData[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      toast.error("Failed to load crew data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRows = useMemo(() => {
    return assignments
      .filter(a => a.eventYear === selectedYear && a.eventMonth === selectedMonth)
      .sort((a, b) => {
        const dayA = parseInt(a.eventDay) || 0;
        const dayB = parseInt(b.eventDay) || 0;
        return dayA - dayB;
      });
  }, [assignments, selectedYear, selectedMonth]);

  const years = getBSYearsRange(-3, 3);

  const handleAssign = async (row: FreelancerAssignment, field: FreelancerField, freelancerName: string) => {
    try {
      await updateFreelancerAssignment(row.registeredDateTimeAD, row.event, row.eventDateAD, field, freelancerName);
      // Update local state
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
    // Refresh freelancers list
    try {
      const updated = await getFreelancers();
      setFreelancers(updated);
    } catch {}
    // Auto-assign if we have a row context
    if (quickAddState.row) {
      await handleAssign(quickAddState.row, quickAddState.field, name);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-gray-900">ALL CLIENTS</h2>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">{filteredRows.length} events</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white overflow-hidden flex-1">
        <ScrollArea className="w-full">
          <div className="min-w-[1200px]">
            {/* Header Row */}
            <div className="grid grid-cols-[50px_160px_140px_repeat(10,1fr)] border-b bg-gray-50 text-xs font-semibold text-gray-600 sticky top-0 z-10">
              <div className="px-2 py-2.5 border-r">Day</div>
              <div className="px-2 py-2.5 border-r">Client</div>
              <div className="px-2 py-2.5 border-r">Event</div>
              {CREW_COLUMNS.map(c => (
                <div key={c.field} className="px-1.5 py-2.5 border-r text-center">{c.short}</div>
              ))}
            </div>

            {/* Data Rows */}
            <ScrollArea className="max-h-[calc(100vh-280px)]">
              {filteredRows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No events for this month</div>
              ) : (
                filteredRows.map((row, idx) => (
                  <div key={`${row.registeredDateTimeAD}-${row.event}-${idx}`} className="grid grid-cols-[50px_160px_140px_repeat(10,1fr)] border-b hover:bg-gray-50/50 text-sm">
                    <div className="px-2 py-2 border-r font-semibold text-gray-700">{row.eventDay}</div>
                    <div className="px-2 py-2 border-r text-gray-900 truncate font-medium">{row.clientName}</div>
                    <div className="px-2 py-2 border-r text-gray-600 truncate">{row.event}</div>
                    {CREW_COLUMNS.map(col => (
                      <CrewCell
                        key={col.field}
                        value={row[col.field] as string}
                        field={col.field}
                        label={col.label}
                        freelancers={freelancers}
                        onAssign={(name) => handleAssign(row, col.field, name)}
                        onQuickAdd={() => setQuickAddState({ open: true, field: col.field, label: col.label, row })}
                        onNavigate={(name) => navigate(`/freelancer/${encodeURIComponent(name)}`)}
                      />
                    ))}
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </ScrollArea>
      </div>

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

function CrewCell({
  value,
  field,
  label,
  freelancers,
  onAssign,
  onQuickAdd,
  onNavigate,
}: {
  value: string;
  field: FreelancerField;
  label: string;
  freelancers: FreelancerData[];
  onAssign: (name: string) => void;
  onQuickAdd: () => void;
  onNavigate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => getFilteredFreelancersByRole(freelancers, field), [freelancers, field]);
  const hasValue = value && value.trim().length > 0;

  return (
    <div className="px-1 py-1.5 border-r">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full text-xs px-1.5 py-1 rounded text-center truncate transition-colors",
              hasValue
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
          >
            {hasValue ? value : "Assign"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label}...`} />
            <CommandList>
              <CommandEmpty>No freelancers found</CommandEmpty>
              <CommandGroup>
                {filtered.map(name => (
                  <CommandItem
                    key={name}
                    onSelect={() => { onAssign(name); setOpen(false); }}
                    className="text-sm"
                  >
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
  );
}
