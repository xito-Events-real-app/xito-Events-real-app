import { useState, useEffect, useCallback } from "react";
import { MapPin, ExternalLink, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventDetailsData, EventDetail } from "@/hooks/useEventDetails";
import { getMonthName } from "@/lib/nepali-months";
import { FreelancerAssignment, FreelancerField, CATEGORY_CODE_TO_FIELD, getFilteredFreelancersByRole } from "@/lib/freelancer-assignment-api";
import { FreelancerData } from "@/lib/freelancer-api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useFloatingYouTubePlayer, type FloatingYouTubeVideo } from "@/contexts/FloatingYouTubePlayerContext";
import { syncYouTubeLinksForClient } from "@/lib/youtube-link-sync";

interface ClientEventsData {
  events: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
}

interface DashboardEventDetailsProps {
  eventDetailsData: EventDetailsData | null;
  isLoading?: boolean;
  clientEvents?: ClientEventsData;
  freelancerAssignments?: FreelancerAssignment[];
  registeredDateTimeAD?: string;
  allFreelancers?: FreelancerData[];
  onAssignmentUpdate?: (eventName: string, eventDateAD: string, field: FreelancerField, value: string) => Promise<void>;
}

// Role config for display
const ROLE_CONFIG: { field: FreelancerField; label: string; code: string; color: string }[] = [
  { field: 'photographerBride', label: 'PB', code: 'PB', color: 'text-amber-600 bg-amber-50' },
  { field: 'videographerBride', label: 'VB', code: 'VB', color: 'text-purple-600 bg-purple-50' },
  { field: 'photographerGroom', label: 'PG', code: 'PG', color: 'text-amber-700 bg-amber-50' },
  { field: 'videographerGroom', label: 'VG', code: 'VG', color: 'text-purple-700 bg-purple-50' },
  { field: 'extraPhotographer', label: 'EP', code: 'EP', color: 'text-orange-600 bg-orange-50' },
  { field: 'extraVideographer', label: 'EV', code: 'EV', color: 'text-fuchsia-600 bg-fuchsia-50' },
  { field: 'assistant', label: 'Asst', code: 'Asst', color: 'text-emerald-600 bg-emerald-50' },
  { field: 'iphoneShooter', label: 'iPhone', code: 'iPhone', color: 'text-cyan-600 bg-cyan-50' },
  { field: 'droneOperator', label: 'Drone', code: 'Drone', color: 'text-sky-600 bg-sky-50' },
  { field: 'fpvOperator', label: 'FPV', code: 'FPV', color: 'text-teal-600 bg-teal-50' },
];

// Build basic events from client data when no detailed event data exists
function buildBasicEvents(clientData?: ClientEventsData): EventDetail[] {
  if (!clientData?.events) return [];
  
  const names = clientData.events.split('\n');
  const years = clientData.eventYear?.split('\n') || [];
  const months = clientData.eventMonth?.split('\n') || [];
  const days = clientData.eventDay?.split('\n') || [];
  
  return names
    .map((name, i) => ({
      eventIndex: i,
      eventName: name.trim(),
      eventYear: years[i]?.trim() || '',
      eventMonth: months[i]?.trim() || '',
      eventDay: days[i]?.trim() || '',
      eventDateAD: '',
      venueType: '', venueName: '', venueArea: '', venueCity: '', venueMap: '',
      eventStartTime: '', eventEndTime: '',
      brideStartTime: '', brideEndTime: '', groomStartTime: '', groomEndTime: '',
      parlourType: '', parlourName: '', parlourArea: '', parlourCity: '', parlourMap: '',
      parlourStartTime: '', parlourEndTime: '',
      doGroomComeInMehndi: '', guestCount: '',
      eventDemands: [], eventReferences: []
    }))
    .filter(e => e.eventName);
}

function formatTime(time: string): string {
  if (!time) return '';
  if (time.includes('AM') || time.includes('PM')) return time;
  const match = time.match(/(\d{1,2}):?(\d{2})?/);
  if (match) {
    let hours = parseInt(match[1]);
    const mins = match[2] || '00';
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins} ${isPM ? 'PM' : 'AM'}`;
  }
  return time;
}

function findAssignment(assignments: FreelancerAssignment[] | undefined, event: EventDetail): FreelancerAssignment | undefined {
  if (!assignments?.length) return undefined;
  return assignments.find(a => {
    const nameMatch = a.event?.trim().toLowerCase() === event.eventName?.trim().toLowerCase();
    const monthMatch = String(a.eventMonth)?.trim() === String(event.eventMonth)?.trim();
    const dayMatch = String(a.eventDay)?.trim() === String(event.eventDay)?.trim();
    return nameMatch && monthMatch && dayMatch;
  });
}

// Inline freelancer assignment combobox
function FreelancerAssignPopover({
  role,
  freelancers,
  onSelect,
}: {
  role: typeof ROLE_CONFIG[0];
  freelancers: string[];
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-dashed ${role.color} opacity-60 hover:opacity-100 transition-opacity`}>
          {role.label}
          <Plus className="h-2.5 w-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Assign ${role.label}...`} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No freelancers found</CommandEmpty>
            {freelancers.map(name => (
              <CommandItem
                key={name}
                onSelect={() => {
                  onSelect(name);
                  setOpen(false);
                }}
              >
                {name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const DashboardEventDetails = ({ eventDetailsData, isLoading, clientEvents, freelancerAssignments, registeredDateTimeAD, allFreelancers, onAssignmentUpdate }: DashboardEventDetailsProps) => {
  const navigate = useNavigate();
  const [ytLinks, setYtLinks] = useState<Record<string, FloatingYouTubeVideo>>({});
  const { open: openFloatingPlayer } = useFloatingYouTubePlayer();

  const fetchYtLinks = useCallback(async () => {
    if (!registeredDateTimeAD) return;
    const { data } = await supabase
      .from("video_edit_tracker")
      .select("event_name, sub_event_name, edit_type, youtube_link, editor, colorist, edit_started_at, video_edit_status, updated_at, event_date_ad, stage_history")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .neq("youtube_link", "")
      .eq("deleted", false);
    if (!data) return;
    const map: Record<string, FloatingYouTubeVideo> = {};
    for (const row of data) {
      const eventKey = (row.event_name || "").trim().toUpperCase();
      const isFullVideo = (row.edit_type || "").toUpperCase().includes("FULL");
      const link = row.youtube_link || "";
      const vidMatch = link.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (!vidMatch) continue;
      if (!map[eventKey] || isFullVideo) {
        map[eventKey] = {
          videoId: vidMatch[1],
          title: `${row.event_name || ""} ${row.edit_type || ""}`.trim(),
          editor: row.editor || undefined,
          colorist: row.colorist || undefined,
          editStartedAt: row.edit_started_at || undefined,
          videoEditStatus: row.video_edit_status || undefined,
          updatedAt: row.updated_at || undefined,
          eventDateAD: row.event_date_ad || undefined,
          editType: row.edit_type || undefined,
          stageHistory: row.stage_history || undefined,
        };
      }
    }
    setYtLinks(map);
  }, [registeredDateTimeAD]);

  // Fetch YouTube links + run background sync for missing links
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    fetchYtLinks().then(async () => {
      // Check if any EXPORTED+ rows are missing youtube_link — if so, run background sync
      const { data: allRows } = await supabase
        .from("video_edit_tracker")
        .select("video_edit_status, youtube_link")
        .eq("registered_date_time_ad", registeredDateTimeAD)
        .eq("deleted", false);
      if (!allRows) return;
      const SYNC_STAGES = ["EXPORTED", "CLIENT_REVIEW", "RE_EDIT_ON_PROGRESS", "FINALIZED"];
      const needsSync = allRows.some(r =>
        SYNC_STAGES.includes((r.video_edit_status || "").toUpperCase()) && !r.youtube_link
      );
      if (needsSync) {
        const updated = await syncYouTubeLinksForClient(registeredDateTimeAD);
        if (updated > 0) fetchYtLinks(); // Re-fetch to show newly synced icons
      }
    });
  }, [registeredDateTimeAD, fetchYtLinks]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 mt-4 animate-pulse">
        <div className="h-5 bg-slate-700 rounded w-28 mb-3" />
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="w-1/4 h-12 bg-slate-700 rounded" />
            <div className="w-3/4 h-12 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const logisticsEvents = eventDetailsData?.events || [];
  const basicEvents = buildBasicEvents(clientEvents);
  
  const events = basicEvents.length > 0
    ? basicEvents.map((basic, i) => {
        const match = logisticsEvents.find(
          le => le.eventName?.trim().toLowerCase() === basic.eventName?.trim().toLowerCase()
            && String(le.eventMonth)?.trim() === String(basic.eventMonth)?.trim()
            && String(le.eventDay)?.trim() === String(basic.eventDay)?.trim()
        );
        return match ? { ...match, eventIndex: i } : basic;
      })
    : logisticsEvents;

  if (!events.length) return null;

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 mt-4 border border-slate-700/50">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
        Event Details
      </h3>

      <div className="space-y-3">
        {events.map((event, idx) => {
          const monthName = getMonthName(parseInt(event.eventMonth) || 0);
          const venueLocation = [event.venueName, event.venueArea, event.venueCity].filter(Boolean).join(', ');
          const venueTimeRange = event.eventStartTime && event.eventEndTime
            ? `${formatTime(event.eventStartTime)} - ${formatTime(event.eventEndTime)}`
            : event.eventStartTime ? formatTime(event.eventStartTime) : '';
          const parlourLocation = [event.parlourName, event.parlourArea, event.parlourCity].filter(Boolean).join(', ');
          const parlourTimeRange = event.parlourStartTime && event.parlourEndTime
            ? `${formatTime(event.parlourStartTime)} - ${formatTime(event.parlourEndTime)}`
            : event.parlourStartTime ? formatTime(event.parlourStartTime) : '';

          const assignment = findAssignment(freelancerAssignments, event);
          
          // Parse required categories
          const requiredCodes = assignment?.requiredCategories
            ? assignment.requiredCategories.split(',').map(c => c.trim()).filter(Boolean)
            : [];
          
          // Determine which roles to show: assigned + required-but-unassigned
          const assignedRoles = ROLE_CONFIG.filter(r => assignment?.[r.field] && String(assignment[r.field]).trim());
          const unassignedRequiredRoles = requiredCodes.length > 0
            ? ROLE_CONFIG.filter(r => 
                requiredCodes.includes(r.code) && 
                (!assignment?.[r.field] || !String(assignment[r.field]).trim())
              )
            : [];
          
          const hasCrewInfo = assignedRoles.length > 0 || unassignedRequiredRoles.length > 0;

          return (
            <div 
              key={event.eventIndex} 
              className="flex gap-4 border-b border-slate-700/30 pb-3 last:border-0 last:pb-0"
            >
              {/* LEFT - Event Name/Date + YouTube */}
              <div className="w-1/5 min-w-[100px]">
                <div className="text-sm font-bold uppercase text-emerald-400">
                  {monthName} {event.eventDay}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {(() => {
                    const eventKey = (event.eventName || "").trim().toUpperCase();
                    const yt = ytLinks[eventKey];
                    if (!yt) return null;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openFloatingPlayer(yt);
                        }}
                        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 transition-colors group"
                        title="Watch Full Video"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </button>
                    );
                  })()}
                  <span className="text-xs text-white/70">
                    {event.eventName || 'Event'}
                  </span>
                </div>
              </div>

              {/* MIDDLE - Venue & Parlour */}
              <div className={`${hasCrewInfo ? 'w-2/5' : 'w-4/5'} space-y-1.5`}>
                {/* Venue */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-amber-400">Venue:</span>
                  {venueLocation ? (
                    <>
                      <span className="text-sm font-semibold text-white">{event.venueName}</span>
                      {(event.venueArea || event.venueCity) && (
                        <span className="text-xs text-white/70">
                          {[event.venueArea, event.venueCity].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {event.venueMap && (
                        <a href={event.venueMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300">
                          <MapPin className="h-3 w-3" />
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {venueTimeRange && <span className="text-xs font-medium text-emerald-400">{venueTimeRange}</span>}
                      {event.guestCount && <span className="text-xs font-medium text-amber-400">({event.guestCount})</span>}
                    </>
                  ) : (
                    <span className="text-xs text-white/40 italic">Not set</span>
                  )}
                </div>

                {/* Parlour */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-purple-400">Parlour:</span>
                  {parlourLocation ? (
                    <>
                      <span className="text-sm font-semibold text-white">{event.parlourName}</span>
                      {(event.parlourArea || event.parlourCity) && (
                        <span className="text-xs text-white/70">
                          {[event.parlourArea, event.parlourCity].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {event.parlourMap && (
                        <a href={event.parlourMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300">
                          <MapPin className="h-3 w-3" />
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {parlourTimeRange && <span className="text-xs font-medium text-emerald-400">{parlourTimeRange}</span>}
                    </>
                  ) : (
                    <span className="text-xs text-white/40 italic">Not set</span>
                  )}
                </div>
              </div>

              {/* RIGHT - Crew: Assigned + Unassigned Required */}
              {hasCrewInfo && (
                <div className="w-2/5 space-y-1">
                  {/* Already assigned */}
                  {assignedRoles.map(role => (
                    <div key={role.field} className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${role.color}`}>
                        {role.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/freelancer/${encodeURIComponent(String(assignment![role.field]))}`);
                        }}
                        className="text-xs text-white/90 truncate hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {String(assignment![role.field])}
                      </button>
                    </div>
                  ))}
                  {/* Unassigned but required */}
                  {unassignedRequiredRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {unassignedRequiredRoles.map(role => {
                        if (!onAssignmentUpdate || !allFreelancers) {
                          return (
                            <span key={role.field} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-dashed ${role.color} opacity-50`}>
                              {role.label}
                            </span>
                          );
                        }
                        const filtered = getFilteredFreelancersByRole(allFreelancers, role.field);
                        return (
                          <FreelancerAssignPopover
                            key={role.field}
                            role={role}
                            freelancers={filtered}
                            onSelect={(name) => {
                              onAssignmentUpdate(
                                event.eventName,
                                event.eventDateAD || '',
                                role.field,
                                name
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DashboardEventDetails;
