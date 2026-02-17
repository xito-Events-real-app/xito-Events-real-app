import { useState, useMemo, useCallback, useEffect } from "react";
import { Camera, Video, UserCog, Smartphone, Loader2, Circle, Zap, StickyNote, Phone, MapPin, Building2, Scissors, NotebookPen } from "lucide-react";
import { useFreelancerAssignments } from "@/hooks/useFreelancerAssignments";
import { getFilteredFreelancersByRole, FreelancerField, AvailabilityConflict } from "@/lib/freelancer-assignment-api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEventDetails } from "@/hooks/useEventDetails";

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

const CODE_COLORS: Record<string, string> = {
  PB: 'bg-amber-100 text-amber-700', PG: 'bg-amber-100 text-amber-700',
  VB: 'bg-purple-100 text-purple-700', VG: 'bg-purple-100 text-purple-700',
  EP: 'bg-orange-100 text-orange-700', EV: 'bg-fuchsia-100 text-fuchsia-700',
  Asst: 'bg-emerald-100 text-emerald-700', iPhone: 'bg-lime-100 text-lime-700',
  Drone: 'bg-cyan-100 text-cyan-700', FPV: 'bg-sky-100 text-sky-700',
};

const BRIDE_SIDE_CODES = new Set(['PB', 'VB']);
const GROOM_SIDE_CODES = new Set(['PG', 'VG']);

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
  show_bride_location: boolean;
  show_groom_location: boolean;
  personal_note: string;
}

const FreelancerAssignmentSection = ({ registeredDateTimeAD }: FreelancerAssignmentSectionProps) => {
  const { assignments, freelancers, isLoading, isUpdating, updateAssignment, checkAvailability } = useFreelancerAssignments(registeredDateTimeAD);
  const [settings, setSettings] = useState<Map<string, FreelancerEventSetting>>(new Map());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { data: eventDetailsData } = useEventDetails(registeredDateTimeAD);
  const eventDetails = eventDetailsData?.events || [];

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
    setSettings(prev => {
      const next = new Map(prev);
      next.set(key, { ...prev.get(key), ...setting });
      return next;
    });
    
    const { error } = await supabase
      .from('freelancer_event_settings')
      .upsert(setting as any, { onConflict: 'registered_date_time_ad,event_name,freelancer_name' });
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
      {assignments.map((assignment) => {
        const matchedEvent = eventDetails.find(ed => 
          ed.eventName?.toLowerCase() === assignment.event?.toLowerCase()
        );
        return (
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
            eventDemands={matchedEvent?.eventDemands || []}
          />
        );
      })}
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
  eventDemands: string[];
}

const EventAssignmentCard = ({ assignment, freelancers, isUpdating, onUpdate, onCheckAvailability, registeredDateTimeAD, settings, onUpsertSetting, eventDemands }: EventAssignmentCardProps) => {
  const [noteOpenFor, setNoteOpenFor] = useState<{ name: string; code: string } | null>(null);
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
      show_bride_details: false,
      show_groom_details: false,
      show_venue_details: false,
      show_parlour_details: false,
      show_bride_location: false,
      show_groom_location: false,
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
      show_bride_location: current.show_bride_location,
      show_groom_location: current.show_groom_location,
      personal_note: current.personal_note,
      [field]: value,
    });
  };

  const handleOpenNote = (freelancerName: string, roleCode: string) => {
    const setting = getSettingForFreelancer(freelancerName);
    setNoteText(setting.personal_note || '');
    setNoteOpenFor({ name: freelancerName, code: roleCode });
  };

  const handleSaveNote = () => {
    if (!noteOpenFor) return;
    const current = getSettingForFreelancer(noteOpenFor.name);
    onUpsertSetting({
      registered_date_time_ad: registeredDateTimeAD,
      event_name: assignment.event,
      freelancer_name: noteOpenFor.name,
      role_code: noteOpenFor.code,
      show_bride_details: current.show_bride_details,
      show_groom_details: current.show_groom_details,
      show_venue_details: current.show_venue_details,
      show_parlour_details: current.show_parlour_details,
      show_bride_location: current.show_bride_location,
      show_groom_location: current.show_groom_location,
      personal_note: noteText,
    });
    setNoteOpenFor(null);
    toast({ title: "Note saved", description: `Note saved for ${noteOpenFor.name}` });
  };

  const brideSide = assignedFreelancers.filter(f => BRIDE_SIDE_CODES.has(f.code));
  const groomSide = assignedFreelancers.filter(f => GROOM_SIDE_CODES.has(f.code));
  const otherCrew = assignedFreelancers.filter(f => !BRIDE_SIDE_CODES.has(f.code) && !GROOM_SIDE_CODES.has(f.code));

  const assignedCount = assignedFreelancers.length;
  const totalSlots = ALL_FIELDS.length;
  const eventName = assignment.event || '';

  const renderFreelancerRow = ({ field, code, name }: { field: FreelancerField; code: string; name: string }) => {
    const setting = getSettingForFreelancer(name);
    const hasNote = !!(setting.personal_note?.trim());
    const isBarun = name.toLowerCase().includes('barun');

    return (
      <div key={`${code}-${name}`} className={cn(
        "px-3 py-2 flex items-center gap-2 flex-wrap border-b border-gray-50 last:border-b-0",
        isBarun && "bg-sky-50/70 ring-1 ring-sky-200/60 ring-inset"
      )}>
        {/* Role badge + name */}
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0", CODE_COLORS[code] || 'bg-gray-100 text-gray-600')}>
          {code}
        </span>
        <span className={cn("text-sm font-medium text-gray-800 truncate min-w-[60px]", isBarun && "text-sky-700 font-semibold")}>
          {name}
        </span>

        {/* Toggles inline */}
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          <TooltipProvider delayDuration={200}>
            <VisibilityToggle
              label="BRIDE" icon={Phone} iconColor="text-rose-500"
              checked={setting.show_bride_details}
              onChange={(v) => handleToggle(name, code, 'show_bride_details', v)}
              checkedColor="data-[state=checked]:bg-rose-500"
              tooltip={`Bride (${eventName}) Contacts`}
            />
            <VisibilityToggle
              label="BRIDE" icon={MapPin} iconColor="text-rose-400"
              checked={setting.show_bride_location}
              onChange={(v) => handleToggle(name, code, 'show_bride_location', v)}
              checkedColor="data-[state=checked]:bg-rose-400"
              tooltip={`Bride (${eventName}) Location`}
            />
            <VisibilityToggle
              label="GROOM" icon={Phone} iconColor="text-sky-500"
              checked={setting.show_groom_details}
              onChange={(v) => handleToggle(name, code, 'show_groom_details', v)}
              checkedColor="data-[state=checked]:bg-sky-500"
              tooltip={`Groom (${eventName}) Contacts`}
            />
            <VisibilityToggle
              label="GROOM" icon={MapPin} iconColor="text-sky-400"
              checked={setting.show_groom_location}
              onChange={(v) => handleToggle(name, code, 'show_groom_location', v)}
              checkedColor="data-[state=checked]:bg-sky-400"
              tooltip={`Groom (${eventName}) Location`}
            />
            <VisibilityToggle
              label="VENUE" icon={Building2} iconColor="text-amber-500"
              checked={setting.show_venue_details}
              onChange={(v) => handleToggle(name, code, 'show_venue_details', v)}
              checkedColor="data-[state=checked]:bg-amber-500"
              tooltip={`Venue (${eventName}) Details`}
            />
            <VisibilityToggle
              label="PARLOUR" icon={Scissors} iconColor="text-purple-500"
              checked={setting.show_parlour_details}
              onChange={(v) => handleToggle(name, code, 'show_parlour_details', v)}
              checkedColor="data-[state=checked]:bg-purple-500"
              tooltip={`Parlour (${eventName}) Details`}
            />
          </TooltipProvider>

          {/* Note button */}
          <button
            onClick={() => handleOpenNote(name, code)}
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors",
              hasNote
                ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            )}
          >
            <NotebookPen className="w-3 h-3" />
            {hasNote ? "Note" : "+Note"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Event Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-xs">{assignment.event}</h3>
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

      {/* Mandatory Demands */}
      {eventDemands.length > 0 && (
        <div className="px-5 py-3 bg-cyan-50/50 border-b border-cyan-100/60">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Demands</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {eventDemands.map((d, i) => (
              <span key={i} className="text-[11px] font-medium bg-cyan-100 text-cyan-700 px-2.5 py-1 rounded-full">{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Freelancers - flat list, single row each */}
      {assignedFreelancers.length > 0 && (
        <div className="border-b border-gray-100">
          {brideSide.length > 0 && (
            <div className="mx-3 mt-3 mb-2 rounded-xl border border-rose-200/60 bg-rose-50/30 overflow-hidden">
              <div className="px-3 py-1 bg-rose-100/40 border-b border-rose-200/40">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Bride Side</span>
              </div>
              {brideSide.map(renderFreelancerRow)}
            </div>
          )}
          {groomSide.length > 0 && (
            <div className="mx-3 mt-2 mb-2 rounded-xl border border-sky-200/60 bg-sky-50/30 overflow-hidden">
              <div className="px-3 py-1 bg-sky-100/40 border-b border-sky-200/40">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Groom Side</span>
              </div>
              {groomSide.map(renderFreelancerRow)}
            </div>
          )}
          {otherCrew.length > 0 && (
            <div className="mx-3 mt-2 mb-3">
              {otherCrew.map(renderFreelancerRow)}
            </div>
          )}
        </div>
      )}

      {/* Unassigned Role Dropdowns with toggles */}
      {unassignedFields.length > 0 && (
        <div className="p-4 space-y-3">
          {unassignedFields.map((cfg) => {
            const val = (assignment[cfg.field] as string || '').trim();
            return (
              <UnassignedFreelancerRow
                key={cfg.field}
                config={cfg}
                value={val}
                freelancers={freelancers}
                eventDateAD={assignment.eventDateAD}
                clientName={assignment.clientName}
                excludedNames={getExcludedNames(cfg.field)}
                isUpdating={isUpdating === cfg.field}
                onChange={(v) => handleFieldChange(cfg.field, v)}
                onCheckAvailability={onCheckAvailability}
                eventName={eventName}
                registeredDateTimeAD={registeredDateTimeAD}
                settings={settings}
                onUpsertSetting={onUpsertSetting}
                getSettingForFreelancer={getSettingForFreelancer}
                handleToggle={handleToggle}
                handleOpenNote={handleOpenNote}
              />
            );
          })}
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={!!noteOpenFor} onOpenChange={(o) => { if (!o) setNoteOpenFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Note for {noteOpenFor?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {assignment.event} — {assignment.clientName}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a personal note for this freelancer..."
            className="min-h-[100px] text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNoteOpenFor(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Visibility toggle with label, icon, tooltip - full size
function VisibilityToggle({ label, icon: Icon, iconColor, checked, onChange, checkedColor, tooltip }: {
  label: string;
  icon: React.ElementType;
  iconColor: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  checkedColor: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          <span className={cn("text-xs font-bold uppercase", checked ? "text-gray-700" : "text-gray-400")}>{label}</span>
          <Icon className={cn("w-4 h-4", checked ? iconColor : "text-gray-300")} />
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            className={cn("h-6 w-11", checkedColor, "data-[state=unchecked]:bg-gray-200")}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// Unassigned freelancer row: dropdown + toggles in same row pattern
interface UnassignedFreelancerRowProps {
  config: FieldConfig;
  value: string;
  freelancers: ReturnType<typeof useFreelancerAssignments>['freelancers'];
  eventDateAD: string;
  clientName: string;
  excludedNames: Set<string>;
  isUpdating: boolean;
  onChange: (value: string) => void;
  onCheckAvailability: (name: string, dateAD: string) => Promise<AvailabilityConflict[]>;
  eventName: string;
  registeredDateTimeAD: string;
  settings: Map<string, FreelancerEventSetting>;
  onUpsertSetting: (setting: Omit<FreelancerEventSetting, 'id'>) => Promise<void>;
  getSettingForFreelancer: (name: string) => FreelancerEventSetting;
  handleToggle: (freelancerName: string, roleCode: string, field: keyof FreelancerEventSetting, value: boolean) => void;
  handleOpenNote: (freelancerName: string, roleCode: string) => void;
}

const UnassignedFreelancerRow = ({ config, value, freelancers, eventDateAD, clientName, excludedNames, isUpdating, onChange, onCheckAvailability, eventName, registeredDateTimeAD, settings, onUpsertSetting, getSettingForFreelancer, handleToggle, handleOpenNote }: UnassignedFreelancerRowProps) => {
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

  return (
    <div className="px-3 py-2.5 flex items-center gap-2 flex-wrap border border-gray-100 rounded-xl">
      {/* Role badge */}
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0", CODE_COLORS[config.shortCode] || 'bg-gray-100 text-gray-600')}>
        {config.shortCode}
      </span>

      {/* Dropdown */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-[140px] justify-between h-8 text-xs rounded-lg",
              "bg-gray-50/50 border-dashed border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600",
              isUpdating && "opacity-50"
            )}
            disabled={isUpdating}
          >
            <span className="truncate">Assign {config.label}...</span>
            {isUpdating && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 z-[9999] bg-white border border-gray-200 shadow-xl rounded-xl" align="start">
          <Command className="bg-white rounded-xl">
            <CommandInput placeholder="Search..." value={search} onValueChange={setSearch} className="text-gray-800 text-xs" />
            <CommandList className="max-h-48">
              <CommandEmpty className="text-gray-400 text-xs py-4 text-center">No freelancers found</CommandEmpty>
              <CommandGroup>
                {filteredNames.map((name) => {
                  const conflicts = availability[name];
                  const isBooked = !!conflicts;
                  return (
                    <CommandItem
                      key={name} value={name}
                      onSelect={() => { onChange(name); setOpen(false); setSearch(''); }}
                      className="text-gray-700 hover:bg-gray-50 cursor-pointer text-xs"
                    >
                      <Circle className={cn("h-2 w-2 mr-2 fill-current shrink-0", isBooked ? "text-red-400" : "text-emerald-400")} />
                      <span className="flex-1 truncate">{name}</span>
                      {isBooked && <span className="text-[10px] text-red-400 ml-1 truncate max-w-[80px]">{conflicts[0].clientName}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Toggles - same pattern as assigned rows, but disabled/dimmed since no one assigned yet */}
      <div className="flex items-center gap-3 flex-wrap ml-auto opacity-40 pointer-events-none">
        <TooltipProvider delayDuration={200}>
          <VisibilityToggle label="BRIDE" icon={Phone} iconColor="text-rose-500" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-rose-500" tooltip={`Bride (${eventName}) Contacts`} />
          <VisibilityToggle label="BRIDE" icon={MapPin} iconColor="text-rose-400" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-rose-400" tooltip={`Bride (${eventName}) Location`} />
          <VisibilityToggle label="GROOM" icon={Phone} iconColor="text-sky-500" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-sky-500" tooltip={`Groom (${eventName}) Contacts`} />
          <VisibilityToggle label="GROOM" icon={MapPin} iconColor="text-sky-400" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-sky-400" tooltip={`Groom (${eventName}) Location`} />
          <VisibilityToggle label="VENUE" icon={Building2} iconColor="text-amber-500" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-amber-500" tooltip={`Venue (${eventName}) Details`} />
          <VisibilityToggle label="PARLOUR" icon={Scissors} iconColor="text-purple-500" checked={false} onChange={() => {}} checkedColor="data-[state=checked]:bg-purple-500" tooltip={`Parlour (${eventName}) Details`} />
        </TooltipProvider>
      </div>
    </div>
  );
};


export default FreelancerAssignmentSection;
