import { useState } from "react";
import { Calendar, MapPin, Clock, Heart, ChevronDown, Camera, Video, Plane, Smartphone, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EventInfo {
  eventName: string;
  eventDateAD: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  eventStartTime: string;
  eventEndTime: string;
}

interface FullAssignment {
  event: string;
  photographerBride: string;
  photographerGroom: string;
  videographerBride: string;
  videographerGroom: string;
  extraPhotographer: string;
  extraVideographer: string;
  assistant: string;
  iphoneShooter: string;
  droneOperator: string;
  fpvOperator: string;
}

interface PortalDashboardProps {
  clientName: string;
  brideFullName?: string;
  groomFullName?: string;
  events: EventInfo[];
  assignments: FullAssignment[];
  hasFilledContact: boolean;
  onGoToDetails: () => void;
  onGoToReferences: () => void;
}

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / 86400000);
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const crewRoles: { key: keyof FullAssignment; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'photographerBride', label: 'Photo (Bride)', icon: Camera, color: 'text-pink-500' },
  { key: 'photographerGroom', label: 'Photo (Groom)', icon: Camera, color: 'text-sky-500' },
  { key: 'videographerBride', label: 'Video (Bride)', icon: Video, color: 'text-pink-500' },
  { key: 'videographerGroom', label: 'Video (Groom)', icon: Video, color: 'text-sky-500' },
  { key: 'extraPhotographer', label: 'Extra Photo', icon: Camera, color: 'text-amber-500' },
  { key: 'extraVideographer', label: 'Extra Video', icon: Video, color: 'text-amber-500' },
  { key: 'droneOperator', label: 'Drone', icon: Plane, color: 'text-emerald-500' },
  { key: 'fpvOperator', label: 'FPV', icon: Plane, color: 'text-teal-500' },
  { key: 'iphoneShooter', label: 'iPhone', icon: Smartphone, color: 'text-violet-500' },
  { key: 'assistant', label: 'Assistant', icon: Users, color: 'text-gray-400' },
];

const PortalDashboard = ({ clientName, brideFullName, groomFullName, events, assignments, hasFilledContact, onGoToDetails, onGoToReferences }: PortalDashboardProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const soonest = events.reduce<EventInfo | null>((best, e) => {
    const days = getDaysUntil(e.eventDateAD);
    if (days === null || days < 0) return best;
    if (!best) return e;
    const bestDays = getDaysUntil(best.eventDateAD);
    return bestDays !== null && days < bestDays ? e : best;
  }, null);

  const countdown = soonest ? getDaysUntil(soonest.eventDateAD) : null;

  const getCrewForEvent = (eventName: string) => {
    return assignments.find(a => a.event === eventName);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Hero / Branding */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(350,60%,95%)] via-transparent to-transparent" />
        <div className="relative text-center pt-8 pb-6 px-4">
          <div className="inline-flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-[hsl(350,80%,65%)] animate-pulse" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-gray-400 font-medium">Wedding Tales Nepal</span>
            <Heart className="h-4 w-4 text-[hsl(350,80%,65%)] animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-0.5 tracking-tight">
            {brideFullName && groomFullName
              ? `${brideFullName.split(' ')[0]} & ${groomFullName.split(' ')[0]}`
              : clientName}
          </h1>
          <p className="text-xs text-gray-400">Your wedding journey</p>
        </div>
      </div>

      {/* Form Reminder Banner */}
      {!hasFilledContact && (
        <div className="mx-4">
          <button
            onClick={onGoToDetails}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-[hsl(350,60%,95%)] to-[hsl(30,60%,95%)] border border-[hsl(350,80%,65%/0.2)] text-left transition-all active:scale-[0.98]"
          >
            <div className="h-9 w-9 rounded-full bg-[hsl(350,80%,65%/0.15)] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4.5 w-4.5 text-[hsl(350,80%,65%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Complete your details</p>
              <p className="text-[11px] text-gray-400">Tap here to fill your contact information</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-300 -rotate-90" />
          </button>
        </div>
      )}

      {/* Countdown */}
      {countdown !== null && countdown >= 0 && soonest && (
        <div className="mx-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(350,50%,95%)] via-[hsl(340,40%,96%)] to-white border border-[hsl(350,80%,65%/0.12)] p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(350,80%,65%/0.06)] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="relative text-center">
              <div className="text-6xl font-black text-[hsl(350,70%,50%)] mb-1 tracking-tighter">
                {countdown}
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {countdown === 0 ? "Today is the big day! 🎉" : countdown === 1 ? "day until your celebration" : "days until your celebration"}
              </p>
              <p className="text-[11px] text-[hsl(350,80%,65%)] mt-1 font-medium">{soonest.eventName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="px-4 space-y-3">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em] pl-1">Your Events</h2>

        {events.length === 0 ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center">
            <Heart className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No events scheduled yet</p>
          </div>
        ) : (
          events.map((event, i) => {
            const days = getDaysUntil(event.eventDateAD);
            const isExpanded = expandedIdx === i;
            const crew = getCrewForEvent(event.eventName);
            const activeCrew = crew ? crewRoles.filter(r => crew[r.key]) : [];

            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border transition-all duration-300 overflow-hidden",
                  isExpanded
                    ? "bg-gray-50 border-[hsl(350,80%,65%/0.15)] shadow-lg shadow-gray-200/50"
                    : "bg-white border-gray-200 active:bg-gray-50"
                )}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full p-4 text-left flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-[15px] truncate">{event.eventName}</h3>
                      {days !== null && days >= 0 && (
                        <Badge className="bg-[hsl(350,80%,65%/0.1)] text-[hsl(350,80%,60%)] border-0 text-[10px] px-1.5 py-0 font-medium flex-shrink-0">
                          {days === 0 ? 'Today' : `${days}d`}
                        </Badge>
                      )}
                    </div>
                    {event.eventDateAD && (
                      <p className="text-xs text-gray-400">{formatDate(event.eventDateAD)}</p>
                    )}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-300 transition-transform duration-300 flex-shrink-0", isExpanded && "rotate-180")} />
                </button>

                <div className={cn(
                  "grid transition-all duration-300",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      {(event.venueName || event.venueCity) && (
                        <div className="flex items-start gap-2.5">
                          <MapPin className="h-3.5 w-3.5 text-[hsl(350,80%,65%)] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">{[event.venueName, event.venueArea, event.venueCity].filter(Boolean).join(', ')}</p>
                        </div>
                      )}

                      {(event.eventStartTime || event.eventEndTime) && (
                        <div className="flex items-start gap-2.5">
                          <Clock className="h-3.5 w-3.5 text-[hsl(350,80%,65%)] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">{[event.eventStartTime, event.eventEndTime].filter(Boolean).join(' – ')}</p>
                        </div>
                      )}

                      {activeCrew.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold mb-2">Your Crew</p>
                          <div className="space-y-1.5">
                            {activeCrew.map((role) => {
                              const Icon = role.icon;
                              return (
                                <div key={role.key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                  <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", role.color)} />
                                  <span className="text-[11px] text-gray-400 min-w-[80px]">{role.label}</span>
                                  <span className="text-sm text-gray-700 font-medium">{crew![role.key]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PortalDashboard;
