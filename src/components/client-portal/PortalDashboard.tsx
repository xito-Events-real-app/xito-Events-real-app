import { Calendar, MapPin, Clock, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventInfo {
  eventName: string;
  eventDateAD: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  eventStartTime: string;
  eventEndTime: string;
}

interface PortalDashboardProps {
  clientName: string;
  events: EventInfo[];
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
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

const PortalDashboard = ({ clientName, events }: PortalDashboardProps) => {
  // Find soonest event for countdown
  const soonest = events.reduce<EventInfo | null>((best, e) => {
    const days = getDaysUntil(e.eventDateAD);
    if (days === null || days < 0) return best;
    if (!best) return e;
    const bestDays = getDaysUntil(best.eventDateAD);
    return bestDays !== null && days < bestDays ? e : best;
  }, null);

  const countdown = soonest ? getDaysUntil(soonest.eventDateAD) : null;

  return (
    <div className="space-y-4 pb-20">
      {/* Branding Header */}
      <div className="text-center py-6 px-4">
        <div className="inline-flex items-center gap-2 mb-2">
          <Heart className="h-5 w-5 text-rose-400" />
          <span className="text-xs tracking-[0.3em] uppercase text-white/40 font-medium">Wedding Tales Nepal</span>
          <Heart className="h-5 w-5 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Welcome</h1>
        <p className="text-lg text-primary font-semibold">{clientName}</p>
      </div>

      {/* Countdown */}
      {countdown !== null && countdown >= 0 && soonest && (
        <Card className="bg-gradient-to-br from-primary/20 to-rose-500/10 border-primary/30 mx-4">
          <CardContent className="p-5 text-center">
            <div className="text-5xl font-bold text-primary mb-1">{countdown}</div>
            <div className="text-sm text-white/60">
              {countdown === 0 ? "Today is the day! 🎉" : countdown === 1 ? "day until your event!" : "days until your event!"}
            </div>
            <div className="text-xs text-white/40 mt-1">{soonest.eventName}</div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Your Events</h2>
        {events.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center text-white/40">No events found</CardContent>
          </Card>
        ) : (
          events.map((event, i) => {
            const days = getDaysUntil(event.eventDateAD);
            return (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{event.eventName}</h3>
                    {days !== null && days >= 0 && (
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                        {days === 0 ? 'Today' : `${days}d`}
                      </Badge>
                    )}
                  </div>
                  {event.eventDateAD && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(event.eventDateAD)}
                    </div>
                  )}
                  {(event.venueName || event.venueCity) && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="h-3.5 w-3.5" />
                      {[event.venueName, event.venueArea, event.venueCity].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {(event.eventStartTime || event.eventEndTime) && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Clock className="h-3.5 w-3.5" />
                      {[event.eventStartTime, event.eventEndTime].filter(Boolean).join(' – ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PortalDashboard;
