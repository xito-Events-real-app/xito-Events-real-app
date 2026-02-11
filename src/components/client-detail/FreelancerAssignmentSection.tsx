import { useState, useMemo, useCallback } from "react";
import { Camera, Video, UserCog, Smartphone, Loader2, ChevronDown, ChevronUp, Circle } from "lucide-react";
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
  color: string;
}

const MAIN_FIELDS: FieldConfig[][] = [
  [
    { field: 'photographerBride', label: 'Photographer Bride', icon: Camera, color: 'text-amber-400' },
    { field: 'photographerGroom', label: 'Photographer Groom', icon: Camera, color: 'text-amber-400' },
  ],
  [
    { field: 'videographerBride', label: 'Videographer Bride', icon: Video, color: 'text-purple-400' },
    { field: 'videographerGroom', label: 'Videographer Groom', icon: Video, color: 'text-purple-400' },
  ],
  [
    { field: 'extraPhotographer', label: 'Extra Photographer', icon: Camera, color: 'text-amber-300' },
    { field: 'extraVideographer', label: 'Extra Videographer', icon: Video, color: 'text-purple-300' },
  ],
  [
    { field: 'assistant', label: 'Assistant', icon: UserCog, color: 'text-emerald-400' },
    { field: 'iphoneShooter', label: 'iPhone Shooter', icon: Smartphone, color: 'text-lime-400' },
  ],
];

const MORE_FIELDS: FieldConfig[][] = [
  [
    { field: 'droneOperator', label: 'Drone Operator', icon: Camera, color: 'text-cyan-400' },
    { field: 'fpvOperator', label: 'FPV Operator', icon: Camera, color: 'text-sky-400' },
  ],
];

const FreelancerAssignmentSection = ({ registeredDateTimeAD }: FreelancerAssignmentSectionProps) => {
  const { assignments, freelancers, isLoading, isUpdating, updateAssignment, checkAvailability } = useFreelancerAssignments(registeredDateTimeAD);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        <span className="ml-3 text-white/40">Loading freelancer assignments...</span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center text-white/40 py-12 bg-white/5 rounded-xl border border-dashed border-white/20">
        <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No event details found for freelancer assignments</p>
        <p className="text-sm mt-1">Event details must exist in the logistics sheet first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Freelancer Assignments</h2>
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

  const handleFieldChange = useCallback(async (field: FreelancerField, value: string) => {
    // Check availability first
    if (value.trim()) {
      const conflicts = await onCheckAvailability(value, assignment.eventDateAD);
      // Filter out same-client conflicts
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

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Event Header */}
      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{assignment.event}</h3>
          <span className="text-sm text-white/50">
            {assignment.eventDateAD || `${assignment.eventMonth} ${assignment.eventDay}, ${assignment.eventYear}`}
          </span>
        </div>
      </div>

      {/* Main Fields */}
      <div className="p-5 space-y-4">
        {MAIN_FIELDS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-4">
            {row.map((cfg) => (
              <FreelancerDropdown
                key={cfg.field}
                config={cfg}
                value={assignment[cfg.field] as string}
                freelancers={freelancers}
                eventDateAD={assignment.eventDateAD}
                clientName={assignment.clientName}
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
            <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5 gap-2">
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showMore ? 'Show Less' : 'See More'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {MORE_FIELDS.map((row, ri) => (
              <div key={ri} className="grid grid-cols-2 gap-4">
                {row.map((cfg) => (
                  <FreelancerDropdown
                    key={cfg.field}
                    config={cfg}
                    value={assignment[cfg.field] as string}
                    freelancers={freelancers}
                    eventDateAD={assignment.eventDateAD}
                    clientName={assignment.clientName}
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
  isUpdating: boolean;
  onChange: (value: string) => void;
  onCheckAvailability: (name: string, dateAD: string) => Promise<AvailabilityConflict[]>;
}

const FreelancerDropdown = ({ config, value, freelancers, eventDateAD, clientName, isUpdating, onChange, onCheckAvailability }: FreelancerDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<Record<string, AvailabilityConflict[]>>({});

  const filteredNames = useMemo(
    () => getFilteredFreelancersByRole(freelancers, config.field),
    [freelancers, config.field]
  );

  // Check availability when dropdown opens
  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && eventDateAD) {
      // Batch check availability for all options
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

  return (
    <div className="space-y-1.5">
      <label className={cn("text-xs font-medium flex items-center gap-1.5", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between h-9 text-sm bg-white/5 border-white/15 text-white hover:bg-white/10",
              isUpdating && "opacity-60"
            )}
            disabled={isUpdating}
          >
            <span className="truncate">{value || 'Select...'}</span>
            {isUpdating && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-[#1a1f2e] border border-white/20 shadow-lg" align="start">
          <Command className="bg-[#1a1f2e]">
            <CommandInput
              placeholder="Search freelancer..."
              value={search}
              onValueChange={setSearch}
              className="bg-[#1a1f2e] text-white placeholder:text-white/40"
            />
            <CommandList className="max-h-48 bg-[#1a1f2e]">
              <CommandEmpty className="text-white/50 text-sm py-4 text-center">No freelancers found</CommandEmpty>
              <CommandGroup className="bg-[#1a1f2e]">
                {/* Clear option */}
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onChange(''); setOpen(false); setSearch(''); }}
                    className="text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    Clear selection
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
                      className="text-white hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Circle className={cn(
                        "h-2.5 w-2.5 mr-2 fill-current",
                        isBooked ? "text-red-500" : "text-emerald-500"
                      )} />
                      <span className="flex-1 truncate">{name}</span>
                      {name === value && <span className="text-xs text-primary ml-1">✓</span>}
                      {isBooked && (
                        <span className="text-[10px] text-red-400 ml-1 truncate max-w-[100px]">
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
  );
};

export default FreelancerAssignmentSection;
