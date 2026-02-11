import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Video, UserCog, Smartphone, Loader2, ChevronDown, ChevronUp, Circle, Zap } from "lucide-react";
import { useFreelancerAssignments } from "@/hooks/useFreelancerAssignments";
import { getFilteredFreelancersByRole, FreelancerField, AvailabilityConflict } from "@/lib/freelancer-assignment-api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FreelancerAssignmentSectionProps {
  registeredDateTimeAD: string;
}

interface FieldConfig {
  field: FreelancerField;
  label: string;
  icon: React.ElementType;
  /** Tailwind text color for the label icon */
  iconColor: string;
  /** Tailwind bg color for the field card accent stripe */
  accentBg: string;
  /** Tailwind border color for the trigger button */
  borderColor: string;
}

const MAIN_FIELDS: FieldConfig[][] = [
  [
    { field: 'photographerBride', label: 'Photographer Bride', icon: Camera, iconColor: 'text-amber-600', accentBg: 'bg-amber-500', borderColor: 'border-amber-200' },
    { field: 'photographerGroom', label: 'Photographer Groom', icon: Camera, iconColor: 'text-amber-600', accentBg: 'bg-amber-500', borderColor: 'border-amber-200' },
  ],
  [
    { field: 'videographerBride', label: 'Videographer Bride', icon: Video, iconColor: 'text-purple-600', accentBg: 'bg-purple-500', borderColor: 'border-purple-200' },
    { field: 'videographerGroom', label: 'Videographer Groom', icon: Video, iconColor: 'text-purple-600', accentBg: 'bg-purple-500', borderColor: 'border-purple-200' },
  ],
  [
    { field: 'extraPhotographer', label: 'Extra Photographer', icon: Camera, iconColor: 'text-orange-500', accentBg: 'bg-orange-400', borderColor: 'border-orange-200' },
    { field: 'extraVideographer', label: 'Extra Videographer', icon: Video, iconColor: 'text-fuchsia-500', accentBg: 'bg-fuchsia-400', borderColor: 'border-fuchsia-200' },
  ],
  [
    { field: 'assistant', label: 'Assistant', icon: UserCog, iconColor: 'text-emerald-600', accentBg: 'bg-emerald-500', borderColor: 'border-emerald-200' },
    { field: 'iphoneShooter', label: 'iPhone Shooter', icon: Smartphone, iconColor: 'text-lime-600', accentBg: 'bg-lime-500', borderColor: 'border-lime-200' },
  ],
];

const MORE_FIELDS: FieldConfig[][] = [
  [
    { field: 'droneOperator', label: 'Drone Operator', icon: Camera, iconColor: 'text-cyan-600', accentBg: 'bg-cyan-500', borderColor: 'border-cyan-200' },
    { field: 'fpvOperator', label: 'FPV Operator', icon: Zap, iconColor: 'text-sky-600', accentBg: 'bg-sky-500', borderColor: 'border-sky-200' },
  ],
];

const ALL_FIELDS: FieldConfig[] = [...MAIN_FIELDS.flat(), ...MORE_FIELDS.flat()];

const FreelancerAssignmentSection = ({ registeredDateTimeAD }: FreelancerAssignmentSectionProps) => {
  const { assignments, freelancers, isLoading, isUpdating, updateAssignment, checkAvailability } = useFreelancerAssignments(registeredDateTimeAD);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl shadow-sm">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-400 text-sm">Loading freelancer assignments...</span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <UserCog className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">No event details found</p>
        <p className="text-xs text-gray-400 mt-1">Event details must exist in the logistics sheet first</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <UserCog className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">Freelancer Assignments</h2>
      </div>
      {assignments.map((assignment) => (
        <EventAssignmentCard
          key={`${assignment.event}-${assignment.eventDateAD}`}
          assignment={assignment}
          freelancers={freelancers}
          isUpdating={isUpdating}
          onUpdate={updateAssignment}
          onCheckAvailability={checkAvailability}
        />
      ))}
    </div>
  );
};

interface EventAssignmentCardProps {
  assignment: ReturnType<typeof useFreelancerAssignments>['assignments'][0];
  freelancers: ReturnType<typeof useFreelancerAssignments>['freelancers'];
  isUpdating: string | null;
  onUpdate: (eventName: string, eventDateAD: string, field: FreelancerField, value: string) => Promise<void>;
  onCheckAvailability: (name: string, dateAD: string) => Promise<AvailabilityConflict[]>;
}

const EventAssignmentCard = ({ assignment, freelancers, isUpdating, onUpdate, onCheckAvailability }: EventAssignmentCardProps) => {
  const [showMore, setShowMore] = useState(false);

  const assignedByField = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cfg of ALL_FIELDS) {
      const val = (assignment[cfg.field] as string || '').trim();
      if (val) map[cfg.field] = val;
    }
    return map;
  }, [assignment]);

  const handleFieldChange = useCallback(async (field: FreelancerField, value: string) => {
    if (value.trim()) {
      const conflicts = await onCheckAvailability(value, assignment.eventDateAD);
      const realConflicts = conflicts.filter(c => c.clientName.trim().toLowerCase() !== assignment.clientName.trim().toLowerCase());
      if (realConflicts.length > 0) {
        toast({
          title: "⚠️ Double Booking Warning",
          description: `${value} is already assigned on this date for: ${realConflicts.map(c => `${c.clientName} (${c.role})`).join(', ')}`,
          variant: "destructive",
        });
      }
    }
    await onUpdate(assignment.event, assignment.eventDateAD, field, value);
  }, [assignment, onUpdate, onCheckAvailability]);

  const getExcludedNames = useCallback((currentField: FreelancerField) => {
    const excluded = new Set<string>();
    for (const [f, name] of Object.entries(assignedByField)) {
      if (f !== currentField && name) {
        excluded.add(name.toLowerCase());
      }
    }
    return excluded;
  }, [assignedByField]);

  const assignedCount = Object.keys(assignedByField).length;
  const totalSlots = ALL_FIELDS.length;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Event Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">{assignment.event}</h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {assignedCount}/{totalSlots} assigned
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {assignment.eventDateAD || `${assignment.eventMonth} ${assignment.eventDay}, ${assignment.eventYear}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Fields */}
      <div className="p-5 space-y-3">
        {MAIN_FIELDS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-3">
            {row.map((cfg) => (
              <FreelancerDropdown
                key={cfg.field}
                config={cfg}
                value={assignment[cfg.field] as string}
                freelancers={freelancers}
                eventDateAD={assignment.eventDateAD}
                clientName={assignment.clientName}
                excludedNames={getExcludedNames(cfg.field)}
                isUpdating={isUpdating === cfg.field}
                onChange={(v) => handleFieldChange(cfg.field, v)}
                onCheckAvailability={onCheckAvailability}
              />
            ))}
          </div>
        ))}

        {/* See More */}
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 gap-2 text-xs h-8 mt-1">
              {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showMore ? 'Show Less' : 'More Roles'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {MORE_FIELDS.map((row, ri) => (
              <div key={ri} className="grid grid-cols-2 gap-3">
                {row.map((cfg) => (
                  <FreelancerDropdown
                    key={cfg.field}
                    config={cfg}
                    value={assignment[cfg.field] as string}
                    freelancers={freelancers}
                    eventDateAD={assignment.eventDateAD}
                    clientName={assignment.clientName}
                    excludedNames={getExcludedNames(cfg.field)}
                    isUpdating={isUpdating === cfg.field}
                    onChange={(v) => handleFieldChange(cfg.field, v)}
                    onCheckAvailability={onCheckAvailability}
                  />
                ))}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

interface FreelancerDropdownProps {
  config: FieldConfig;
  value: string;
  freelancers: ReturnType<typeof useFreelancerAssignments>['freelancers'];
  eventDateAD: string;
  clientName: string;
  excludedNames: Set<string>;
  isUpdating: boolean;
  onChange: (value: string) => void;
  onCheckAvailability: (name: string, dateAD: string) => Promise<AvailabilityConflict[]>;
}

const FreelancerDropdown = ({ config, value, freelancers, eventDateAD, clientName, excludedNames, isUpdating, onChange, onCheckAvailability }: FreelancerDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<Record<string, AvailabilityConflict[]>>({});

  const filteredNames = useMemo(
    () => getFilteredFreelancersByRole(freelancers, config.field).filter(
      name => !excludedNames.has(name.toLowerCase())
    ),
    [freelancers, config.field, excludedNames]
  );

  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && eventDateAD) {
      const checks: Record<string, AvailabilityConflict[]> = {};
      const promises = filteredNames.map(async (name) => {
        const conflicts = await onCheckAvailability(name, eventDateAD);
        const real = conflicts.filter(c => c.clientName.trim().toLowerCase() !== clientName.trim().toLowerCase());
        if (real.length > 0) checks[name] = real;
      });
      await Promise.all(promises);
      setAvailability(checks);
    }
  }, [eventDateAD, clientName, filteredNames, onCheckAvailability]);

  const Icon = config.icon;
  const hasValue = !!value?.trim();

  return (
    <div className="relative">
      {/* Color accent card */}
      <div className={cn(
        "rounded-xl border overflow-hidden transition-all",
        hasValue ? "border-gray-200 shadow-sm" : "border-gray-100",
      )}>
        {/* Top accent stripe */}
        <div className={cn("h-1", config.accentBg)} />

        <div className="px-3 py-2.5">
          <label className={cn("text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2", config.iconColor)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </label>

          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between h-8 text-xs rounded-lg",
                  hasValue
                    ? "bg-gray-50 border-gray-200 text-gray-800 font-medium hover:bg-gray-100"
                    : "bg-gray-50/50 border-dashed border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600",
                  isUpdating && "opacity-50"
                )}
                disabled={isUpdating}
              >
                <span className="truncate">
                  {value ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/freelancer/${encodeURIComponent(value)}`;
                      }}
                      className="hover:text-emerald-600 transition-colors"
                    >
                      {value}
                    </button>
                  ) : 'Assign...'}
                </span>
                {isUpdating && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white border border-gray-200 shadow-xl rounded-xl" align="start">
              <Command className="bg-white rounded-xl">
                <CommandInput
                  placeholder="Search freelancer..."
                  value={search}
                  onValueChange={setSearch}
                  className="text-gray-800 text-xs placeholder:text-gray-400"
                />
                <CommandList className="max-h-48">
                  <CommandEmpty className="text-gray-400 text-xs py-4 text-center">No freelancers found</CommandEmpty>
                  <CommandGroup>
                    {value && (
                      <CommandItem
                        value="__clear__"
                        onSelect={() => { onChange(''); setOpen(false); setSearch(''); }}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 cursor-pointer text-xs"
                      >
                        ✕ Clear selection
                      </CommandItem>
                    )}
                    {filteredNames.map((name) => {
                      const conflicts = availability[name];
                      const isBooked = !!conflicts;
                      return (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={() => { onChange(name); setOpen(false); setSearch(''); }}
                          className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer text-xs"
                        >
                          <Circle className={cn(
                            "h-2 w-2 mr-2 fill-current shrink-0",
                            isBooked ? "text-red-400" : "text-emerald-400"
                          )} />
                          <span className="flex-1 truncate">{name}</span>
                          {name === value && <span className="text-[10px] text-indigo-500 font-bold ml-1">✓</span>}
                          {isBooked && (
                            <span className="text-[10px] text-red-400 ml-1 truncate max-w-[80px]">
                              {conflicts[0].clientName}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default FreelancerAssignmentSection;
