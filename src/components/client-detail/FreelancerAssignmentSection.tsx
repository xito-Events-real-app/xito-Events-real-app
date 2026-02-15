import { useState, useMemo, useCallback, useEffect } from "react";
import { Camera, Video, UserCog, Smartphone, Loader2, ChevronDown, ChevronUp, Circle, Zap, StickyNote, Eye, EyeOff } from "lucide-react";
import { useFreelancerAssignments } from "@/hooks/useFreelancerAssignments";
import { getFilteredFreelancersByRole, FreelancerField, AvailabilityConflict, CATEGORY_CODES } from "@/lib/freelancer-assignment-api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FreelancerAssignmentSectionProps {
  registeredDateTimeAD: string;
}

interface FieldConfig {
  field: FreelancerField;
  label: string;
  shortCode: string;
  icon: React.ElementType;
  iconColor: string;
  accentBg: string;
  borderColor: string;
}

const MAIN_FIELDS: FieldConfig[][] = [
  [
    { field: 'photographerBride', label: 'Photographer Bride', shortCode: 'PB', icon: Camera, iconColor: 'text-amber-600', accentBg: 'bg-amber-500', borderColor: 'border-amber-200' },
    { field: 'photographerGroom', label: 'Photographer Groom', shortCode: 'PG', icon: Camera, iconColor: 'text-amber-600', accentBg: 'bg-amber-500', borderColor: 'border-amber-200' },
  ],
  [
    { field: 'videographerBride', label: 'Videographer Bride', shortCode: 'VB', icon: Video, iconColor: 'text-purple-600', accentBg: 'bg-purple-500', borderColor: 'border-purple-200' },
    { field: 'videographerGroom', label: 'Videographer Groom', shortCode: 'VG', icon: Video, iconColor: 'text-purple-600', accentBg: 'bg-purple-500', borderColor: 'border-purple-200' },
  ],
  [
    { field: 'extraPhotographer', label: 'Extra Photographer', shortCode: 'EP', icon: Camera, iconColor: 'text-orange-500', accentBg: 'bg-orange-400', borderColor: 'border-orange-200' },
    { field: 'extraVideographer', label: 'Extra Videographer', shortCode: 'EV', icon: Video, iconColor: 'text-fuchsia-500', accentBg: 'bg-fuchsia-400', borderColor: 'border-fuchsia-200' },
  ],
  [
    { field: 'assistant', label: 'Assistant', shortCode: 'Asst', icon: UserCog, iconColor: 'text-emerald-600', accentBg: 'bg-emerald-500', borderColor: 'border-emerald-200' },
    { field: 'iphoneShooter', label: 'iPhone Shooter', shortCode: 'iPhone', icon: Smartphone, iconColor: 'text-lime-600', accentBg: 'bg-lime-500', borderColor: 'border-lime-200' },
  ],
];

const MORE_FIELDS: FieldConfig[][] = [
  [
    { field: 'droneOperator', label: 'Drone Operator', shortCode: 'Drone', icon: Camera, iconColor: 'text-cyan-600', accentBg: 'bg-cyan-500', borderColor: 'border-cyan-200' },
    { field: 'fpvOperator', label: 'FPV Operator', shortCode: 'FPV', icon: Zap, iconColor: 'text-sky-600', accentBg: 'bg-sky-500', borderColor: 'border-sky-200' },
  ],
];

const ALL_FIELDS: FieldConfig[] = [...MAIN_FIELDS.flat(), ...MORE_FIELDS.flat()];

// Short code color map for assigned freelancer badges
const CODE_COLORS: Record<string, string> = {
  PB: 'bg-amber-100 text-amber-700', PG: 'bg-amber-100 text-amber-700',
  VB: 'bg-purple-100 text-purple-700', VG: 'bg-purple-100 text-purple-700',
  EP: 'bg-orange-100 text-orange-700', EV: 'bg-fuchsia-100 text-fuchsia-700',
  Asst: 'bg-emerald-100 text-emerald-700', iPhone: 'bg-lime-100 text-lime-700',
  Drone: 'bg-cyan-100 text-cyan-700', FPV: 'bg-sky-100 text-sky-700',
};

interface FreelancerEventSetting {
  id?: string;
  registered_date_time_ad: string;
  event_name: string;
  freelancer_name: string;
  role_code: string;
  show_bride_details: boolean;
  show_groom_details: boolean;
  show_venue_details: boolean;
  show_parlour_details: boolean;
  personal_note: string;
}

const FreelancerAssignmentSection = ({ registeredDateTimeAD }: FreelancerAssignmentSectionProps) => {
  const { assignments, freelancers, isLoading, isUpdating, updateAssignment, checkAvailability } = useFreelancerAssignments(registeredDateTimeAD);
  const [settings, setSettings] = useState<Map<string, FreelancerEventSetting>>(new Map());
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Fetch all settings for this client
  useEffect(() => {
    if (!registeredDateTimeAD || settingsLoaded) return;
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('freelancer_event_settings')
        .select('*')
        .eq('registered_date_time_ad', registeredDateTimeAD);
      if (data) {
        const map = new Map<string, FreelancerEventSetting>();
        for (const row of data) {
          const key = `${row.event_name}::${row.freelancer_name}`;
          map.set(key, row as FreelancerEventSetting);
        }
        setSettings(map);
      }
      setSettingsLoaded(true);
    };
    fetchSettings();
  }, [registeredDateTimeAD, settingsLoaded]);

  const upsertSetting = useCallback(async (setting: Omit<FreelancerEventSetting, 'id'>) => {
    const key = `${setting.event_name}::${setting.freelancer_name}`;
    // Optimistic update
    setSettings(prev => {
      const next = new Map(prev);
      next.set(key, { ...prev.get(key), ...setting });
      return next;
    });
    
    const { error } = await supabase
      .from('freelancer_event_settings')
      .upsert(setting, { onConflict: 'registered_date_time_ad,event_name,freelancer_name' });
    if (error) {
      console.error('Failed to save setting:', error);
      toast({ title: "Error", description: "Failed to save visibility setting", variant: "destructive" });
    }
  }, []);

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
          registeredDateTimeAD={registeredDateTimeAD}
          settings={settings}
          onUpsertSetting={upsertSetting}
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
  registeredDateTimeAD: string;
  settings: Map<string, FreelancerEventSetting>;
  onUpsertSetting: (setting: Omit<FreelancerEventSetting, 'id'>) => Promise<void>;
}

const EventAssignmentCard = ({ assignment, freelancers, isUpdating, onUpdate, onCheckAvailability, registeredDateTimeAD, settings, onUpsertSetting }: EventAssignmentCardProps) => {
  const [showMore, setShowMore] = useState(false);
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const requiredCodes = (assignment.requiredCategories || '').split(',').map(c => c.trim()).filter(Boolean);
  const hasFilter = requiredCodes.length > 0;

  const CODE_TO_FIELD: Record<string, string> = {
    PB: 'photographerBride', PG: 'photographerGroom',
    VB: 'videographerBride', VG: 'videographerGroom',
    EP: 'extraPhotographer', EV: 'extraVideographer',
    Asst: 'assistant', iPhone: 'iphoneShooter',
    Drone: 'droneOperator', FPV: 'fpvOperator',
  };
  const FIELD_TO_CODE: Record<string, string> = Object.fromEntries(
    Object.entries(CODE_TO_FIELD).map(([code, field]) => [field, code])
  );

  const isFieldRequired = (field: string) => {
    if (!hasFilter) return true;
    const code = FIELD_TO_CODE[field];
    return code ? requiredCodes.includes(code) : true;
  };

  const filterFields = (rows: FieldConfig[][]) => {
    if (!hasFilter) return rows;
    return rows.map(row => row.filter(cfg => isFieldRequired(cfg.field))).filter(row => row.length > 0);
  };

  const filteredMain = filterFields(MAIN_FIELDS);
  const filteredMore = filterFields(MORE_FIELDS);

  // Build assigned freelancers list
  const assignedFreelancers = useMemo(() => {
    const list: { field: FreelancerField; code: string; name: string }[] = [];
    for (const cfg of ALL_FIELDS) {
      const val = (assignment[cfg.field] as string || '').trim();
      if (val) {
        list.push({ field: cfg.field, code: cfg.shortCode, name: val });
      }
    }
    return list;
  }, [assignment]);

  // Build unassigned fields
  const unassignedFields = useMemo(() => {
    return ALL_FIELDS.filter(cfg => {
      const val = (assignment[cfg.field] as string || '').trim();
      return !val && isFieldRequired(cfg.field);
    });
  }, [assignment, requiredCodes]);

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

  const getSettingForFreelancer = (freelancerName: string): FreelancerEventSetting => {
    const key = `${assignment.event}::${freelancerName}`;
    return settings.get(key) || {
      registered_date_time_ad: registeredDateTimeAD,
      event_name: assignment.event,
      freelancer_name: freelancerName,
      role_code: '',
      show_bride_details: true,
      show_groom_details: true,
      show_venue_details: true,
      show_parlour_details: true,
      personal_note: '',
    };
  };

  const handleToggle = (freelancerName: string, roleCode: string, field: keyof FreelancerEventSetting, value: boolean) => {
    const current = getSettingForFreelancer(freelancerName);
    onUpsertSetting({
      registered_date_time_ad: registeredDateTimeAD,
      event_name: assignment.event,
      freelancer_name: freelancerName,
      role_code: roleCode,
      show_bride_details: current.show_bride_details,
      show_groom_details: current.show_groom_details,
      show_venue_details: current.show_venue_details,
      show_parlour_details: current.show_parlour_details,
      personal_note: current.personal_note,
      [field]: value,
    });
  };

  const handleOpenNote = (freelancerName: string) => {
    const setting = getSettingForFreelancer(freelancerName);
    setNoteText(setting.personal_note || '');
    setNoteOpenFor(freelancerName);
  };

  const handleSaveNote = (freelancerName: string, roleCode: string) => {
    const current = getSettingForFreelancer(freelancerName);
    onUpsertSetting({
      registered_date_time_ad: registeredDateTimeAD,
      event_name: assignment.event,
      freelancer_name: freelancerName,
      role_code: roleCode,
      show_bride_details: current.show_bride_details,
      show_groom_details: current.show_groom_details,
      show_venue_details: current.show_venue_details,
      show_parlour_details: current.show_parlour_details,
      personal_note: noteText,
    });
    setNoteOpenFor(null);
    toast({ title: "Note saved", description: `Note saved for ${freelancerName}` });
  };

  const assignedCount = assignedFreelancers.length;
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

      {/* Assigned Freelancers with Toggles */}
      {assignedFreelancers.length > 0 && (
        <div className="border-b border-gray-100">
          {assignedFreelancers.map(({ field, code, name }) => {
            const setting = getSettingForFreelancer(name);
            const hasNote = !!(setting.personal_note?.trim());
            const isNoteOpen = noteOpenFor === name;

            return (
              <div key={`${code}-${name}`} className="border-b border-gray-50 last:border-b-0">
                <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
                  {/* Role badge + name */}
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0", CODE_COLORS[code] || 'bg-gray-100 text-gray-600')}>
                    {code}
                  </span>
                  <span className="text-sm font-medium text-gray-800 min-w-0 truncate">{name}</span>
                  
                  <div className="flex-1" />
                  
                  {/* Visibility toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <VisibilityToggle
                      label="Bride"
                      checked={setting.show_bride_details}
                      onChange={(v) => handleToggle(name, code, 'show_bride_details', v)}
                    />
                    <VisibilityToggle
                      label="Groom"
                      checked={setting.show_groom_details}
                      onChange={(v) => handleToggle(name, code, 'show_groom_details', v)}
                    />
                    <VisibilityToggle
                      label="Venue"
                      checked={setting.show_venue_details}
                      onChange={(v) => handleToggle(name, code, 'show_venue_details', v)}
                    />
                    <VisibilityToggle
                      label="Parlour"
                      checked={setting.show_parlour_details}
                      onChange={(v) => handleToggle(name, code, 'show_parlour_details', v)}
                    />
                  </div>

                  {/* Add Note button */}
                  <button
                    onClick={() => isNoteOpen ? setNoteOpenFor(null) : handleOpenNote(name)}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors shrink-0",
                      hasNote
                        ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                  >
                    <StickyNote className="w-3 h-3" />
                    {hasNote ? "Note" : "+Note"}
                  </button>
                </div>

                {/* Inline note editor */}
                {isNoteOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write a personal note for this freelancer on this event..."
                      className="text-xs min-h-[60px] bg-gray-50 border-gray-200"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setNoteOpenFor(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveNote(name, code)}>
                        Save Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned Role Dropdowns */}
      {unassignedFields.length > 0 && (
        <div className="p-5 space-y-3">
          {/* Group unassigned fields into rows of 2 */}
          {Array.from({ length: Math.ceil(unassignedFields.length / 2) }, (_, i) => {
            const row = unassignedFields.slice(i * 2, i * 2 + 2);
            return (
              <div key={i} className="grid grid-cols-2 gap-3">
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
            );
          })}
        </div>
      )}
    </div>
  );
};

// Small visibility toggle with label
function VisibilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn("text-[9px] font-medium", checked ? "text-gray-500" : "text-gray-300")}>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-7 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-200"
      />
    </div>
  );
}

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
      <div className={cn(
        "rounded-xl border overflow-hidden transition-all",
        hasValue ? "border-gray-200 shadow-sm" : "border-gray-100",
      )}>
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
