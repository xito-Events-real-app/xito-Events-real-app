import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Phone, MessageCircle, Instagram, Facebook, MapPin, Calendar, Camera, Video, UserCog, Smartphone, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import { getFreelancerBookings, FreelancerBooking } from "@/lib/freelancer-assignment-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { getClientDetailPath } from "@/lib/client-navigation";
import { cn } from "@/lib/utils";

const ROLE_BADGES: { key: keyof FreelancerData; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'photographer', label: 'Photographer', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Camera },
  { key: 'videographer', label: 'Videographer', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: Video },
  { key: 'photoEditor', label: 'Photo Editor', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: Camera },
  { key: 'videoEditor', label: 'Video Editor', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: Video },
  { key: 'hybridShooter', label: 'Hybrid Shooter', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: Camera },
  { key: 'hybridEditor', label: 'Hybrid Editor', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40', icon: Video },
  { key: 'droneOperator', label: 'Drone', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: Zap },
  { key: 'fpvOperator', label: 'FPV', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: Zap },
  { key: 'iphoneShooter', label: 'iPhone', color: 'bg-lime-500/20 text-lime-300 border-lime-500/40', icon: Smartphone },
];

const ROLE_COLOR_MAP: Record<string, string> = {
  photographerBride: 'text-amber-400',
  photographerGroom: 'text-amber-500',
  videographerBride: 'text-purple-400',
  videographerGroom: 'text-purple-500',
  extraPhotographer: 'text-orange-400',
  extraVideographer: 'text-fuchsia-400',
  assistant: 'text-emerald-400',
  iphoneShooter: 'text-lime-400',
  droneOperator: 'text-cyan-400',
  fpvOperator: 'text-sky-400',
};

export default function FreelancerProfile() {
  const { freelancerName } = useParams<{ freelancerName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedName = decodeURIComponent(freelancerName || '');

  const [freelancer, setFreelancer] = useState<FreelancerData | null>(null);
  const [bookings, setBookings] = useState<FreelancerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [allFreelancers, allBookings] = await Promise.all([
          getFreelancers(),
          getFreelancerBookings(decodedName),
        ]);
        const match = allFreelancers.find(f => f.name.trim().toLowerCase() === decodedName.trim().toLowerCase());
        setFreelancer(match || null);
        setBookings(allBookings);
      } catch (e) {
        console.error('Failed to load freelancer profile:', e);
      } finally {
        setLoading(false);
      }
    }
    if (decodedName) load();
  }, [decodedName]);

  // Build calendar data from bookings
  const calendarData = useMemo(() => {
    const bookedMap = new Map<string, FreelancerBooking[]>();

    bookings.forEach(b => {
      if (!b.eventYear || !b.eventMonth || !b.eventDay || b.eventDay === '**') return;
      const key = `${b.eventYear}-${b.eventMonth}-${b.eventDay}`;
      if (!bookedMap.has(key)) bookedMap.set(key, []);
      bookedMap.get(key)!.push(b);
    });

    const daysPerMonth: Record<number, number> = {
      1: 31, 2: 31, 3: 32, 4: 32, 5: 31, 6: 31,
      7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 30
    };

    const startMonth = 10;
    const startYear = 2082;
    const result: {
      month: number; year: number; monthName: string;
      days: { day: number; bookings: FreelancerBooking[] }[];
      bookedCount: number;
    }[] = [];

    for (let i = 0; i < 12; i++) {
      const monthNum = ((startMonth - 1 + i) % 12) + 1;
      const yearNum = startYear + Math.floor((startMonth - 1 + i) / 12);
      const daysInMonth = daysPerMonth[monthNum] || 30;

      const days: typeof result[0]['days'] = [];
      let bookedCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${yearNum}-${monthNum}-${day}`;
        const dayBookings = bookedMap.get(key) || [];
        if (dayBookings.length > 0) bookedCount++;
        days.push({ day, bookings: dayBookings });
      }

      result.push({ month: monthNum, year: yearNum, monthName: NEPALI_MONTHS[monthNum], days, bookedCount });
    }

    return result;
  }, [bookings]);

  const totalBookings = bookings.length;
  const uniqueClients = new Set(bookings.map(b => b.clientName)).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate((location.state as any)?.from || -1)} className="text-white hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold truncate">{decodedName}</h1>
        {freelancer?.mainJob && (
          <Badge className="bg-indigo-500/30 text-indigo-300 border-indigo-500/40">{freelancer.mainJob}</Badge>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1400px] mx-auto">
        {/* LEFT - Profile Card */}
        <div className="lg:w-1/3 space-y-4">
          {freelancer ? (
            <>
              {/* Name + Main Job */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {decodedName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{decodedName}</h2>
                    {freelancer.mainJob && (
                      <span className="text-sm text-emerald-400 font-medium">{freelancer.mainJob}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{totalBookings}</div>
                    <div className="text-[11px] text-slate-400 uppercase">Total Bookings</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">{uniqueClients}</div>
                    <div className="text-[11px] text-slate-400 uppercase">Unique Clients</div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</h3>
                {freelancer.contactNo && (
                  <a href={`tel:${freelancer.contactNo.replace(/\s/g, '')}`} className="flex items-center gap-3 text-sm hover:text-emerald-400 transition-colors">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <span>{freelancer.contactNo}</span>
                  </a>
                )}
                {freelancer.whatsappNo && (
                  <a href={`https://wa.me/${freelancer.whatsappNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-green-400 transition-colors">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <span>{freelancer.whatsappNo}</span>
                  </a>
                )}
                {freelancer.instagram && (
                  <a href={freelancer.instagram.startsWith('http') ? freelancer.instagram : `https://${freelancer.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-pink-400 transition-colors">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="truncate">{freelancer.instagram}</span>
                  </a>
                )}
                {freelancer.facebook && (
                  <a href={freelancer.facebook.startsWith('http') ? freelancer.facebook : `https://${freelancer.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-blue-400 transition-colors">
                    <Facebook className="h-4 w-4 text-blue-500" />
                    <span className="truncate">{freelancer.facebook}</span>
                  </a>
                )}
              </div>

              {/* Location */}
              {(freelancer.city || freelancer.area) && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span>{[freelancer.city, freelancer.area].filter(Boolean).join(', ')}</span>
                  </div>
                  {freelancer.mapLink && (
                    <a href={freelancer.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline ml-7">Open in Maps →</a>
                  )}
                </div>
              )}

              {/* Roles */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skills & Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {ROLE_BADGES.filter(r => freelancer[r.key]?.toString().toUpperCase() === 'YES').map(r => {
                    const Icon = r.icon;
                    return (
                      <Badge key={r.key} variant="outline" className={`${r.color} gap-1.5 py-1`}>
                        <Icon className="h-3 w-3" />
                        {r.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
              <UserCog className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Freelancer profile not found</p>
              <p className="text-xs text-slate-500 mt-1">"{decodedName}" was not found in the freelancers database</p>
            </div>
          )}
        </div>

        {/* RIGHT - Booking Calendar */}
        <div className="lg:w-2/3">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold">Booking Calendar</h3>
              <span className="text-xs text-slate-400 ml-auto">{totalBookings} total assignments</span>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pr-2">
                {calendarData.map((month) => (
                  <div key={`${month.year}-${month.month}`} className="bg-slate-800/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{month.monthName} {month.year}</span>
                      {month.bookedCount > 0 && (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full">
                          {month.bookedCount} booked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-[3px]">
                      {month.days.map((dayInfo) => {
                        const dayKey = `${month.year}-${month.month}-${dayInfo.day}`;
                        const hasBookings = dayInfo.bookings.length > 0;

                        return (
                          <div
                            key={dayInfo.day}
                            className="relative"
                            onMouseEnter={() => hasBookings && setHoveredDay(dayKey)}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium cursor-default transition-all",
                              hasBookings
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                : "text-slate-500"
                            )}>
                              {dayInfo.day}
                            </span>

                            {/* Hover Popup */}
                            {hoveredDay === dayKey && hasBookings && (
                              <FreelancerDayPopup
                                monthName={month.monthName}
                                day={dayInfo.day}
                                year={month.year}
                                bookings={dayInfo.bookings}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

// Popup for freelancer calendar day
function FreelancerDayPopup({ monthName, day, year, bookings }: { monthName: string; day: number; year: number; bookings: FreelancerBooking[] }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="calendar-bubble absolute z-50 min-w-[300px] max-w-[400px] bottom-full mb-3 left-1/2 -translate-x-1/2">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {monthName} {day}, {year}
          </p>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {bookings.length} event{bookings.length > 1 ? 's' : ''}
          </span>
        </div>

        {bookings.map((booking, idx) => (
          <div key={`${booking.clientName}-${idx}`} className="rounded-lg border border-border/60 p-3 hover:bg-primary/5 hover:border-primary/30 transition-all space-y-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(getClientDetailPath({ clientName: booking.clientName, registeredDateTimeAD: booking.registeredDateTimeAD }), { state: { from: location.pathname } });
              }}
              className="flex items-start gap-2 w-full text-left hover:text-primary transition-colors group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold group-hover:text-primary transition-colors">{booking.clientName}</p>
                <p className="text-xs text-muted-foreground">{booking.event}</p>
              </div>
            </button>
            <div className="flex items-center gap-2 pl-4">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", ROLE_COLOR_MAP[booking.role] || 'text-slate-400')}>
                {booking.roleLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <div className="w-3 h-3 bg-card border-r border-b border-border rotate-45 -mt-1.5" />
      </div>
    </div>
  );
}
