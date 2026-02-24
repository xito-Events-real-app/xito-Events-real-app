import { useState, useEffect, useMemo, useRef } from "react";
import { X, MapPin, Clock, Users, Sparkles, CalendarDays, ChevronRight } from "lucide-react";
import { getCurrentBSDate, getDaysInBSMonth, nepaliMonthsEnglish, bsToAD } from "@/lib/nepali-date";
import { AssignmentRow } from "./types";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";

const ROLE_LABELS: Record<string, string> = {
  photographer_bride: "PB",
  photographer_groom: "PG",
  videographer_bride: "VB",
  videographer_groom: "VG",
  extra_photographer: "EP",
  extra_videographer: "EV",
  assistant: "Asst",
  iphone_shooter: "iPhone",
  drone_operator: "Drone",
  fpv_operator: "FPV",
};

const ROLE_COLUMNS = Object.keys(ROLE_LABELS);

interface Props {
  assignments: AssignmentRow[];
  eventDetailsCache: Map<string, { events: EventDetail[] }>;
  contactDetailsCache: Map<string, ClientContactDetails>;
  freelancerName: string;
  onDismiss: () => void;
  onRequestDetails: (regKey: string) => void;
  onViewFullDetails?: (assignment: AssignmentRow) => void;
}

function getNextBSDay(bs: { year: number; month: number; day: number | string }) {
  const d = typeof bs.day === "string" ? 1 : bs.day;
  const daysInMonth = getDaysInBSMonth(bs.year, bs.month);
  if (d < daysInMonth) return { year: bs.year, month: bs.month, day: d + 1 };
  if (bs.month < 12) return { year: bs.year, month: bs.month + 1, day: 1 };
  return { year: bs.year + 1, month: 1, day: 1 };
}

function getCrewList(assignment: AssignmentRow, selfName: string): { role: string; name: string }[] {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const self = normalize(selfName);
  const crew: { role: string; name: string }[] = [];
  for (const col of ROLE_COLUMNS) {
    const val = ((assignment as any)[col] || "").toString();
    const names = val.split("\n").map((n: string) => n.trim()).filter(Boolean);
    for (const name of names) {
      if (normalize(name) !== self) {
        crew.push({ role: ROLE_LABELS[col] || col, name });
      }
    }
  }
  return crew;
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function getCountdownText(eventStartTime: string, isToday: boolean, bsYear: number, bsMonth: number, bsDay: number): string {
  if (!eventStartTime) return isToday ? "Today" : "Tomorrow";
  const startMins = parseTimeToMinutes(eventStartTime);
  if (startMins === null) return isToday ? "Today" : "Tomorrow";

  try {
    const adDate = bsToAD(bsYear, bsMonth, bsDay);
    if (!(adDate instanceof Date)) return isToday ? "Today" : "Tomorrow";
    const targetTime = new Date(adDate);
    targetTime.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
    const now = new Date();
    const diffMs = targetTime.getTime() - now.getTime();
    if (diffMs <= 0) return "Started";
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 0) return `Starts in ${diffH}h ${diffM}m`;
    return `Starts in ${diffM}m`;
  } catch {
    return isToday ? "Today" : "Tomorrow";
  }
}

export default function CrewWelcomePopup({ assignments, eventDetailsCache, freelancerName, onDismiss, onRequestDetails, onViewFullDetails }: Props) {
  const [, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBS = getCurrentBSDate();
  const todayDay = typeof currentBS.day === "string" ? 1 : currentBS.day;
  const tomorrow = getNextBSDay({ ...currentBS, day: todayDay });

  const todayEvents = useMemo(() =>
    assignments.filter(a =>
      a.event_year === String(currentBS.year) && a.event_month === String(currentBS.month) && a.event_day === String(todayDay)
    ), [assignments, currentBS.year, currentBS.month, todayDay]);

  const tomorrowEvents = useMemo(() =>
    assignments.filter(a =>
      a.event_year === String(tomorrow.year) && a.event_month === String(tomorrow.month) && a.event_day === String(tomorrow.day)
    ), [assignments, tomorrow]);

  // Request details for all relevant events
  useEffect(() => {
    [...todayEvents, ...tomorrowEvents].forEach(ev => onRequestDetails(ev.registered_date_time_ad));
  }, [todayEvents, tomorrowEvents, onRequestDetails]);

  // Countdown timer tick
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sound
  useEffect(() => {
    try {
      const audio = new Audio("/audio/meditation-music.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {});
      audioRef.current = audio;
      const timeout = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 4000);
      return () => { clearTimeout(timeout); audio.pause(); audio.currentTime = 0; };
    } catch {}
  }, []);

  const handleDismiss = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    onDismiss();
  };

  if (todayEvents.length === 0 && tomorrowEvents.length === 0) return null;

  const hasBoth = todayEvents.length > 0 && tomorrowEvents.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-[crew-poster-fade-in_0.6s_ease-out]" onClick={handleDismiss}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="relative flex-1 flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Today Section */}
        {todayEvents.length > 0 && (
          <div className={`${hasBoth ? "flex-1 min-h-[45vh]" : "flex-1"} bg-gradient-to-br from-rose-900/90 via-amber-900/80 to-orange-900/90 p-5 flex flex-col justify-center animate-[crew-poster-slide-up_0.7s_ease-out]`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <h2 className="text-lg font-black text-amber-200 uppercase tracking-wider">Today's Event</h2>
              {todayEvents.length > 1 && (
                <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">+{todayEvents.length - 1} more</span>
              )}
            </div>
            <EventPosterCard
              assignment={todayEvents[0]}
              eventDetailsCache={eventDetailsCache}
              freelancerName={freelancerName}
              isToday={true}
              onViewFullDetails={onViewFullDetails}
            />
          </div>
        )}

        {/* Tomorrow Section */}
        {tomorrowEvents.length > 0 && (
          <div className={`${hasBoth ? "flex-1 min-h-[45vh]" : "flex-1"} bg-gradient-to-br from-violet-900/90 via-indigo-900/80 to-blue-900/90 p-5 flex flex-col justify-center animate-[crew-poster-slide-up_0.9s_ease-out]`}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-5 h-5 text-blue-300 animate-pulse" />
              <h2 className="text-lg font-black text-blue-200 uppercase tracking-wider">Tomorrow's Event</h2>
              {tomorrowEvents.length > 1 && (
                <span className="text-[10px] bg-blue-400/30 text-blue-200 px-2 py-0.5 rounded-full font-bold">+{tomorrowEvents.length - 1} more</span>
              )}
            </div>
            <EventPosterCard
              assignment={tomorrowEvents[0]}
              eventDetailsCache={eventDetailsCache}
              freelancerName={freelancerName}
              isToday={false}
              onViewFullDetails={onViewFullDetails}
            />
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="relative z-10 mx-auto -mt-1 mb-6 px-8 py-3 bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl text-white font-bold text-sm flex items-center gap-2 hover:bg-white/25 transition-all active:scale-95 animate-[crew-poster-slide-up_1.1s_ease-out]"
      >
        <X className="w-4 h-4" />
        Got It
      </button>
    </div>
  );
}

function EventPosterCard({
  assignment,
  eventDetailsCache,
  freelancerName,
  isToday,
  onViewFullDetails,
}: {
  assignment: AssignmentRow;
  eventDetailsCache: Map<string, { events: EventDetail[] }>;
  freelancerName: string;
  isToday: boolean;
  onViewFullDetails?: (assignment: AssignmentRow) => void;
}) {
  const cached = eventDetailsCache.get(assignment.registered_date_time_ad);
  const matchingEvent = cached?.events.find(e =>
    e.eventName?.toLowerCase() === assignment.event?.toLowerCase()
  ) || cached?.events[0];

  const venue = matchingEvent?.venueName || "";
  const area = matchingEvent?.venueArea || matchingEvent?.venueCity || "";
  const startTime = matchingEvent?.eventStartTime || "";
  const endTime = matchingEvent?.eventEndTime || "";
  const timing = startTime ? (endTime ? `${startTime} — ${endTime}` : startTime) : "";

  const y = parseInt(assignment.event_year || "0");
  const m = parseInt(assignment.event_month || "0");
  const d = parseInt(assignment.event_day || "0");
  const countdown = getCountdownText(startTime, isToday, y, m, d);
  const crew = getCrewList(assignment, freelancerName);
  const monthName = nepaliMonthsEnglish[(m || 1) - 1] || "";

  return (
    <div className="space-y-3">
      {/* Event Name */}
      <div>
        <h3 className="text-2xl font-black text-white uppercase tracking-wide leading-tight">
          {assignment.event || "Event"}
        </h3>
        <p className="text-xs text-white/60 mt-0.5">
          {assignment.client_name} • {d} {monthName}
        </p>
      </div>

      {/* Venue */}
      {(venue || area) && (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" />
          <div>
            {venue && <p className="text-sm font-semibold text-white">{venue}</p>}
            {area && <p className="text-xs text-white/60">{area}</p>}
          </div>
        </div>
      )}

      {/* Timing + Countdown */}
      <div className="flex items-center gap-3 flex-wrap">
        {timing && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-white/70" />
            <span className="text-sm font-bold text-white">{timing}</span>
          </div>
        )}
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full animate-[crew-countdown-pulse_2s_ease-in-out_infinite] ${
          isToday ? "bg-amber-400/30 text-amber-200" : "bg-blue-400/30 text-blue-200"
        }`}>
          {countdown}
        </span>
      </div>

      {/* Crew */}
      {crew.length > 0 && (
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {crew.slice(0, 8).map((c, i) => (
              <span key={i} className="text-[10px] bg-white/15 text-white/90 px-2 py-0.5 rounded-full">
                <span className="font-bold">{c.role}:</span> {c.name}
              </span>
            ))}
            {crew.length > 8 && (
              <span className="text-[10px] text-white/50">+{crew.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator for missing details */}
      {!cached && (
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <div className="w-3 h-3 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          Loading details...
        </div>
      )}

      {/* View Full Details Button */}
      {onViewFullDetails && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewFullDetails(assignment); }}
          className="w-full py-4 mt-2 text-base font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-xl ring-2 ring-white/30 flex items-center justify-center gap-2 active:scale-95 transition-transform animate-[crew-button-flash_1.5s_ease-in-out_infinite]"
        >
          View Full Details
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
