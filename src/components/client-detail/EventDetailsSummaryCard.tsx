import { MapPin, Clock, Users, FileText, Link2, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EventDetail } from '@/hooks/useEventDetails';
import { isWeddingEvent } from '@/lib/wedding-timing-utils';

interface EventDetailsSummaryCardProps {
  event: EventDetail;
  onEdit: () => void;
}

// Count how many fields are filled
function getFilledCount(event: EventDetail): { filled: number; total: number } {
  const isWedding = isWeddingEvent(event.eventName);
  const fields = [
    event.venueType,
    event.venueName,
    event.venueCity,
    event.venueArea,
    isWedding ? event.brideStartTime : event.eventStartTime,
    isWedding ? event.brideEndTime : event.eventEndTime,
    isWedding ? event.groomStartTime : undefined,
    isWedding ? event.groomEndTime : undefined,
    event.parlourName,
    event.guestCount,
  ].filter(f => f !== undefined);
  const filled = fields.filter(f => f && f.trim()).length;
  return { filled, total: fields.length };
}

// Check if has any saved details
function hasAnyDetails(event: EventDetail): boolean {
  return !!(
    event.venueType ||
    event.venueName ||
    event.venueCity ||
    event.venueArea ||
    event.venueMap ||
    event.eventStartTime ||
    event.eventEndTime ||
    event.parlourType ||
    event.parlourName ||
    event.parlourCity ||
    event.parlourArea ||
    event.parlourMap ||
    event.parlourStartTime ||
    event.parlourEndTime ||
    event.guestCount ||
    (event.eventDemands && event.eventDemands.length > 0 && event.eventDemands.some(d => d.trim())) ||
    (event.eventReferences && event.eventReferences.length > 0 && event.eventReferences.some(r => r.trim()))
  );
}

// Format time for display (e.g., "14:30" -> "2:30 PM")
function formatTime(time: string): string {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  } catch {
    return time;
  }
}

export function EventDetailsSummaryCard({ event, onEdit }: EventDetailsSummaryCardProps) {
  const hasDetails = hasAnyDetails(event);
  const { filled, total } = getFilledCount(event);

  if (!hasDetails) {
    return (
      <div className="p-6 rounded-xl bg-white/5 border border-dashed border-white/20 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-white/30" />
        <p className="text-white/50 mb-4">No event details saved yet</p>
        <Button 
          onClick={onEdit}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Add Event Details
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Progress indicator */}
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
            {filled}/{total} fields filled
          </Badge>
        </div>
        <Button 
          onClick={onEdit}
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Venue Details Section */}
        {(event.venueType || event.venueName || event.venueCity || event.venueArea) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5" />
              Venue Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {event.venueType && (
                <div>
                  <span className="text-white/40">Type: </span>
                  <span className="text-white font-medium">{event.venueType}</span>
                </div>
              )}
              {event.venueName && (
                <div>
                  <span className="text-white/40">Name: </span>
                  <span className="text-white font-medium">{event.venueName}</span>
                </div>
              )}
              {event.venueCity && (
                <div>
                  <span className="text-white/40">City: </span>
                  <span className="text-white font-medium">{event.venueCity}</span>
                </div>
              )}
              {event.venueArea && (
                <div>
                  <span className="text-white/40">Area: </span>
                  <span className="text-white font-medium">{event.venueArea}</span>
                </div>
              )}
            </div>
            {event.venueMap && (
              <a 
                href={event.venueMap} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                <Link2 className="h-3 w-3" />
                View on Map
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Event Timing Section */}
        {isWeddingEvent(event.eventName) && (event.brideStartTime || event.groomStartTime) ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              Wedding Timings
            </div>
            <div className="space-y-1.5">
              {(event.brideStartTime || event.brideEndTime) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-rose-400 font-medium text-xs">🌸 Bride:</span>
                  {event.brideStartTime && <span className="text-white font-medium">{formatTime(event.brideStartTime)}</span>}
                  {event.brideEndTime && <span className="text-white/40">- {formatTime(event.brideEndTime)}</span>}
                </div>
              )}
              {(event.groomStartTime || event.groomEndTime) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-sky-400 font-medium text-xs">🤵 Groom:</span>
                  {event.groomStartTime && <span className="text-white font-medium">{formatTime(event.groomStartTime)}</span>}
                  {event.groomEndTime && <span className="text-white/40">- {formatTime(event.groomEndTime)}</span>}
                </div>
              )}
            </div>
          </div>
        ) : (event.eventStartTime || event.eventEndTime) ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              Event Timing
            </div>
            <div className="flex items-center gap-4 text-sm">
              {event.eventStartTime && (
                <div>
                  <span className="text-white/40">Start: </span>
                  <span className="text-white font-medium">{formatTime(event.eventStartTime)}</span>
                </div>
              )}
              {event.eventEndTime && (
                <div>
                  <span className="text-white/40">End: </span>
                  <span className="text-white font-medium">{formatTime(event.eventEndTime)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Parlour Details Section */}
        {(event.parlourType || event.parlourName || event.parlourCity || event.parlourArea) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5" />
              Parlour Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {event.parlourType && (
                <div>
                  <span className="text-white/40">Type: </span>
                  <span className="text-white font-medium">{event.parlourType}</span>
                </div>
              )}
              {event.parlourName && (
                <div>
                  <span className="text-white/40">Name: </span>
                  <span className="text-white font-medium">{event.parlourName}</span>
                </div>
              )}
              {event.parlourCity && (
                <div>
                  <span className="text-white/40">City: </span>
                  <span className="text-white font-medium">{event.parlourCity}</span>
                </div>
              )}
              {event.parlourArea && (
                <div>
                  <span className="text-white/40">Area: </span>
                  <span className="text-white font-medium">{event.parlourArea}</span>
                </div>
              )}
            </div>
            {event.parlourMap && (
              <a 
                href={event.parlourMap} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                <Link2 className="h-3 w-3" />
                View on Map
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {(event.parlourStartTime || event.parlourEndTime) && (
              <div className="flex items-center gap-4 text-sm mt-1">
                {event.parlourStartTime && (
                  <div>
                    <span className="text-white/40">Start: </span>
                    <span className="text-white font-medium">{formatTime(event.parlourStartTime)}</span>
                  </div>
                )}
                {event.parlourEndTime && (
                  <div>
                    <span className="text-white/40">End: </span>
                    <span className="text-white font-medium">{formatTime(event.parlourEndTime)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Guest Count & Groom in Mehndi */}
        {(event.guestCount || event.doGroomComeInMehndi) && (
          <div className="flex items-center gap-6 text-sm">
            {event.guestCount && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/40" />
                <span className="text-white/40">Guests: </span>
                <span className="text-white font-semibold">{event.guestCount}</span>
              </div>
            )}
            {event.doGroomComeInMehndi === 'YES' && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                Groom in Mehndi
              </Badge>
            )}
          </div>
        )}

        {/* Demands */}
        {event.eventDemands && event.eventDemands.length > 0 && event.eventDemands.some(d => d.trim()) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-white/50 uppercase tracking-wide">Demands</div>
            <div className="flex flex-wrap gap-1.5">
              {event.eventDemands.filter(d => d.trim()).map((demand, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="bg-white/5 text-white/80 border-white/20 text-xs"
                >
                  {demand}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        {event.eventReferences && event.eventReferences.length > 0 && event.eventReferences.some(r => r.trim()) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-white/50 uppercase tracking-wide">References</div>
            <div className="flex flex-col gap-1">
              {event.eventReferences.filter(r => r.trim()).map((ref, i) => (
                <a 
                  key={i}
                  href={ref.startsWith('http') ? ref : `https://${ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 truncate"
                >
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{ref}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
