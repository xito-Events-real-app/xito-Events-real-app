import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBSDate, nepaliMonthsEnglish, getDaysInBSMonth, bsToAD } from "@/lib/nepali-date";
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";
import { AssignmentRow } from "@/components/crew-schedule/types";
import TodayDateHeader from "@/components/crew-schedule/TodayDateHeader";
import EventDetailCard from "@/components/crew-schedule/EventDetailCard";
import UpcomingEventsSection from "@/components/crew-schedule/UpcomingEventsSection";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getWeekdayForBSDate(year: number, month: number, day: number): number {
  try {
    const adDate = bsToAD(year, month, day);
    if (adDate instanceof Date) return adDate.getDay();
  } catch {}
  return 0;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROLE_COLUMNS = [
  "photographer_bride", "photographer_groom",
  "videographer_bride", "videographer_groom",
  "extra_photographer", "extra_videographer",
  "assistant", "iphone_shooter",
  "drone_operator", "fpv_operator",
] as const;

export default function CrewSchedule() {
  const { freelancerName } = useParams<{ freelancerName: string }>();
  const decodedName = decodeURIComponent(freelancerName || "");
  const currentBS = getCurrentBSDate();

  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Caches for lazy-loaded details
  const [eventDetailsCache, setEventDetailsCache] = useState<Map<string, { events: EventDetail[] }>>(new Map());
  const [contactDetailsCache, setContactDetailsCache] = useState<Map<string, ClientContactDetails>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  // Fetch all assignments
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const orFilter = ROLE_COLUMNS.map(col => `${col}.ilike.%${decodedName}%`).join(",");
      const { data, error } = await supabase
        .from("freelancer_assignments")
        .select("event_year, event_month, event_day, event, client_name, registered_date_time_ad")
        .or(orFilter);
      if (!error && data) setAssignments(data as AssignmentRow[]);
      setLoading(false);
    }
    if (decodedName) fetch();
  }, [decodedName]);

  // Lazy fetch details for a registeredDateTimeAD
  const fetchDetailsForClient = useCallback(async (regKey: string) => {
    if (eventDetailsCache.has(regKey) || loadingKeys.has(regKey)) return;

    setLoadingKeys(prev => new Set(prev).add(regKey));
    try {
      const [eventRes, contactRes] = await Promise.all([
        supabase.functions.invoke("google-sheets", {
          body: { action: "getClientEventDetails", data: { registeredDateTimeAD: regKey } },
        }),
        supabase.functions.invoke("google-sheets", {
          body: { action: "getClientContactDetails", data: { registeredDateTimeAD: regKey } },
        }),
      ]);

      if (eventRes.data?.success && eventRes.data.data?.events) {
        setEventDetailsCache(prev => new Map(prev).set(regKey, { events: eventRes.data.data.events }));
      }
      if (contactRes.data?.success && contactRes.data.data) {
        setContactDetailsCache(prev => new Map(prev).set(regKey, contactRes.data.data));
      }
    } catch (err) {
      console.error("Failed to fetch details for", regKey, err);
    } finally {
      setLoadingKeys(prev => { const n = new Set(prev); n.delete(regKey); return n; });
    }
  }, [eventDetailsCache, loadingKeys]);

  // Booked days map
  const bookedDaysMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of assignments) {
      if (a.event_year === String(navYear) && a.event_month === String(navMonth)) {
        const day = parseInt(a.event_day || "0");
        if (day > 0) map.set(day, (map.get(day) || 0) + 1);
      }
    }
    return map;
  }, [assignments, navYear, navMonth]);

  // Stats
  const stats = useMemo(() => {
    const today = getCurrentBSDate();
    let totalThisMonth = 0, remainingThisMonth = 0, totalRemaining = 0;
    for (const a of assignments) {
      const y = parseInt(a.event_year || "0"), m = parseInt(a.event_month || "0"), d = parseInt(a.event_day || "0");
      if (y === navYear && m === navMonth) {
        totalThisMonth++;
        if (y > today.year || (y === today.year && m > today.month) || (y === today.year && m === today.month && d >= (today.day as number)))
          remainingThisMonth++;
      }
      if (y > today.year || (y === today.year && m > today.month) || (y === today.year && m === today.month && d >= (today.day as number)))
        totalRemaining++;
    }
    return { totalThisMonth, remainingThisMonth, totalRemaining };
  }, [assignments, navYear, navMonth]);

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getWeekdayForBSDate(navYear, navMonth, 1);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

  const handlePrevMonth = () => {
    if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); } else setNavMonth(m => m - 1);
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); } else setNavMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Check if a day is in the past
  const isDayPast = useCallback((day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < (currentBS.day as number)) return true;
    return false;
  }, [navYear, navMonth, currentBS]);

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return assignments.filter(a =>
      a.event_year === String(navYear) && a.event_month === String(navMonth) && a.event_day === String(selectedDay)
    );
  }, [assignments, navYear, navMonth, selectedDay]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Greeting */}
        <div className="text-center space-y-1">
          <p className="text-violet-300 text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-bold">Hi {decodedName} 👋</h1>
          <p className="text-violet-400 text-xs">Your event schedule</p>
        </div>

        {/* Today's Date */}
        <TodayDateHeader />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.totalThisMonth}</p>
            <p className="text-[10px] text-violet-300 mt-0.5">This Month</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.remainingThisMonth}</p>
            <p className="text-[10px] text-violet-300 mt-0.5">Remaining</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.totalRemaining}</p>
            <p className="text-[10px] text-violet-300 mt-0.5">Total Upcoming</p>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-bold">{monthName} {navYear}</p>
          <button onClick={handleNextMonth} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-violet-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const eventCount = bookedDaysMap.get(day) || 0;
              const isBooked = eventCount > 0;
              const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;
              const isSelected = selectedDay === day;
              const isPast = isDayPast(day);

              return (
                <button
                  key={day}
                  onClick={() => isBooked ? setSelectedDay(isSelected ? null : day) : undefined}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative
                    ${isPast ? "opacity-40" : ""}
                    ${isBooked
                      ? isSelected
                        ? "bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105 opacity-100"
                        : isPast
                          ? "bg-emerald-500/10 text-emerald-800/60"
                          : "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50"
                      : isToday
                        ? "bg-violet-500/30 text-violet-200 ring-1 ring-violet-400 opacity-100"
                        : "text-white/40"
                    }`}
                >
                  {day}
                  {isBooked && eventCount > 1 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-emerald-400 text-slate-900 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                      {eventCount}
                    </span>
                  )}
                  {isBooked && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isPast ? "bg-emerald-700/50" : "bg-emerald-400"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day detail - now with rich cards */}
        {selectedDay !== null && selectedDayEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {selectedDay} {monthName} — {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
            </p>
            {selectedDayEvents.map((ev, i) => {
              const cached = eventDetailsCache.get(ev.registered_date_time_ad);
              const contact = contactDetailsCache.get(ev.registered_date_time_ad);
              return (
                <EventDetailCard
                  key={`${ev.registered_date_time_ad}-${ev.event}-${i}`}
                  assignment={ev}
                  eventDetails={cached?.events}
                  contactDetails={contact}
                  isLoadingDetails={loadingKeys.has(ev.registered_date_time_ad)}
                  onRequestDetails={fetchDetailsForClient}
                />
              );
            })}
          </div>
        )}

        {/* Upcoming Events */}
        <UpcomingEventsSection
          assignments={assignments}
          eventDetailsCache={eventDetailsCache}
          contactDetailsCache={contactDetailsCache}
          loadingKeys={loadingKeys}
          onRequestDetails={fetchDetailsForClient}
        />

        {/* Footer */}
        <p className="text-center text-[10px] text-violet-500 pt-2">Powered by Xito Business Suite</p>
      </div>
    </div>
  );
}
