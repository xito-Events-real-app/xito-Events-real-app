import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBSDate, nepaliMonthsEnglish, getDaysInBSMonth, bsToAD } from "@/lib/nepali-date";
import { ChevronLeft, ChevronRight, Calendar, Loader2, CalendarDays, List } from "lucide-react";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";
import { getFreelancers } from "@/lib/freelancer-api";
import { AssignmentRow } from "@/components/crew-schedule/types";
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

export default function CrewSchedule({ previewName }: { previewName?: string }) {
  const { freelancerName } = useParams<{ freelancerName: string }>();
  const decodedName = previewName || decodeURIComponent(freelancerName || "");
  const currentBS = getCurrentBSDate();

  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "upcoming">("calendar");
  const [freelancerPhones, setFreelancerPhones] = useState<Map<string, string>>(new Map());

  // Caches for lazy-loaded details
  const [eventDetailsCache, setEventDetailsCache] = useState<Map<string, { events: EventDetail[] }>>(new Map());
  const [contactDetailsCache, setContactDetailsCache] = useState<Map<string, ClientContactDetails>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  // Fetch all assignments + freelancer phone map
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const orFilter = ROLE_COLUMNS.map(col => `${col}.ilike.%${decodedName}%`).join(",");
      const [assignRes, flData] = await Promise.all([
        supabase
          .from("freelancer_assignments")
          .select("event_year, event_month, event_day, event, client_name, registered_date_time_ad, photographer_bride, photographer_groom, videographer_bride, videographer_groom, extra_photographer, extra_videographer, assistant, iphone_shooter, drone_operator, fpv_operator")
          .or(orFilter),
        getFreelancers(500).catch(() => []),
      ]);
      if (!assignRes.error && assignRes.data) {
        const target = decodedName.trim().toLowerCase();
        const exactFiltered = assignRes.data.filter(row =>
          ROLE_COLUMNS.some(col => {
            const val = ((row as any)[col] || '').toString();
            return val.split('\n').some((entry: string) => entry.trim().toLowerCase() === target);
          })
        );
        if (exactFiltered.length === 0) {
          const startsWithFiltered = assignRes.data.filter(row =>
            ROLE_COLUMNS.some(col => {
              const val = ((row as any)[col] || '').toString();
              return val.split('\n').some((entry: string) => entry.trim().toLowerCase().startsWith(target));
            })
          );
          setAssignments(startsWithFiltered as AssignmentRow[]);
        } else {
          setAssignments(exactFiltered as AssignmentRow[]);
        }
      }
      
      // Build name->phone map (lowercase keys)
      const phoneMap = new Map<string, string>();
      for (const fl of flData) {
        if (fl.name && (fl.contactNo || fl.whatsappNo)) {
          phoneMap.set(fl.name.trim().toLowerCase(), fl.contactNo || fl.whatsappNo);
        }
      }
      setFreelancerPhones(phoneMap);
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

  // Today's date info
  const bsMonth = nepaliMonthsEnglish[currentBS.month - 1] || "";
  const adFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

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

  const isDayPast = useCallback((day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < (currentBS.day as number)) return true;
    return false;
  }, [navYear, navMonth, currentBS]);

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return assignments.filter(a =>
      a.event_year === String(navYear) && a.event_month === String(navMonth) && a.event_day === String(selectedDay)
    );
  }, [assignments, navYear, navMonth, selectedDay]);

  const defaultCalendarEvents = useMemo(() => {
    const today = getCurrentBSDate();
    const tY = today.year, tM = today.month, tD = today.day as number;
    const todayEvents = assignments.filter(a =>
      a.event_year === String(tY) && a.event_month === String(tM) && a.event_day === String(tD)
    );
    if (todayEvents.length > 0) return { events: todayEvents, label: "Today's Events" };

    const upcoming = assignments
      .filter(a => {
        const y = parseInt(a.event_year || "0"), m = parseInt(a.event_month || "0"), d = parseInt(a.event_day || "0");
        return y > tY || (y === tY && m > tM) || (y === tY && m === tM && d > tD);
      })
      .sort((a, b) => {
        const ay = parseInt(a.event_year || "0"), am = parseInt(a.event_month || "0"), ad = parseInt(a.event_day || "0");
        const by = parseInt(b.event_year || "0"), bm = parseInt(b.event_month || "0"), bd = parseInt(b.event_day || "0");
        return ay !== by ? ay - by : am !== bm ? am - bm : ad - bd;
      });

    if (upcoming.length > 0) {
      const first = upcoming[0];
      const sameDay = upcoming.filter(a =>
        a.event_year === first.event_year && a.event_month === first.event_month && a.event_day === first.event_day
      );
      const nextMonth = nepaliMonthsEnglish[parseInt(first.event_month || "1") - 1] || "";
      return { events: sameDay, label: `Next Event — ${first.event_day} ${nextMonth}` };
    }
    return { events: [], label: "" };
  }, [assignments]);

  const calendarBottomEvents = selectedDay !== null ? selectedDayEvents : defaultCalendarEvents.events;
  const calendarBottomLabel = selectedDay !== null
    ? `${selectedDay} ${monthName} — ${selectedDayEvents.length} event${selectedDayEvents.length !== 1 ? "s" : ""}`
    : defaultCalendarEvents.label;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white flex flex-col">
      {/* Compact Header — 2 rows */}
      <div className="px-4 pt-4 pb-2 space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-violet-200 truncate">
            {getGreeting()}, <span className="font-semibold text-white">{decodedName}</span>
          </p>
          <span className="text-[10px] bg-white/10 text-violet-300 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
            {currentBS.day} {bsMonth} {currentBS.year} / {adFormatted}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.totalThisMonth} This Month
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.remainingThisMonth} Remaining
          </span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.totalRemaining} Upcoming
          </span>
        </div>
      </div>

      {/* Tab Bar — Top */}
      <div className="flex-shrink-0 px-4 pb-2 flex gap-2">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
            ${activeTab === "calendar" ? "bg-white/15 text-white font-bold" : "text-white/50"}`}
        >
          <CalendarDays className="w-4 h-4" />
          Booking Calendar
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
            ${activeTab === "upcoming" ? "bg-white/15 text-white font-bold" : "text-white/50"}`}
        >
          <List className="w-4 h-4" />
          Upcoming Events
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === "calendar" ? (
          <div className="space-y-4">
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

            {/* Events below calendar */}
            {calendarBottomEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {calendarBottomLabel}
                </p>
                {calendarBottomEvents.map((ev, i) => {
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
                      freelancerPhones={freelancerPhones}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <UpcomingEventsSection
            assignments={assignments}
            eventDetailsCache={eventDetailsCache}
            contactDetailsCache={contactDetailsCache}
            loadingKeys={loadingKeys}
            onRequestDetails={fetchDetailsForClient}
            freelancerPhones={freelancerPhones}
          />
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-violet-500 py-1 flex-shrink-0 bg-slate-900/95">Powered by Xito Business Suite</p>
    </div>
  );
}
