import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, Scissors, ChevronDown, ChevronUp, Save, X, Loader2, ExternalLink, FileText, Link2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getMonthName } from '@/lib/nepali-months';
import { EventDetail } from '@/hooks/useEventDetails';

interface FullScreenEventCardProps {
  event: EventDetail;
  eventDateAD?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSave: (eventIndex: number, updates: Partial<EventDetail> & { eventDemands?: string[]; eventReferences?: string[] }) => Promise<boolean>;
  isUrgent?: boolean;
}

const VENUE_TYPE_OPTIONS = [
  { value: '', label: 'Select type...' },
  { value: 'INDOOR', label: 'Indoor' },
  { value: 'OUTDOOR', label: 'Outdoor' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'BANQUET', label: 'Banquet' },
  { value: 'HOME', label: 'Home' },
  { value: 'OTHER', label: 'Other' },
];

// Check if an event is within urgency threshold (20 days)
function isEventUrgent(eventDateAD: string): boolean {
  if (!eventDateAD) return false;
  try {
    const eventDate = new Date(eventDateAD);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 20 && diffDays > 0;
  } catch {
    return false;
  }
}

// Check if event has any filled details
function hasFilledDetails(event: EventDetail): boolean {
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
    event.doGroomComeInMehndi ||
    event.guestCount ||
    (event.eventDemands && event.eventDemands.length > 0 && event.eventDemands.some(d => d.trim())) ||
    (event.eventReferences && event.eventReferences.length > 0 && event.eventReferences.some(r => r.trim()))
  );
}

// Check if required fields are missing for urgency warning
function hasEmptyRequiredFields(event: EventDetail): boolean {
  return !event.venueType || !event.venueName || !event.eventStartTime;
}

export const FullScreenEventCard = ({
  event,
  eventDateAD,
  isExpanded,
  onToggleExpand,
  onSave,
}: FullScreenEventCardProps) => {
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [venueType, setVenueType] = useState(event.venueType || '');
  const [venueName, setVenueName] = useState(event.venueName || '');
  const [venueCity, setVenueCity] = useState(event.venueCity || '');
  const [venueArea, setVenueArea] = useState(event.venueArea || '');
  const [venueMap, setVenueMap] = useState(event.venueMap || '');
  const [eventStartTime, setEventStartTime] = useState(event.eventStartTime || '');
  const [eventEndTime, setEventEndTime] = useState(event.eventEndTime || '');
  
  const [parlourType, setParlourType] = useState(event.parlourType || '');
  const [parlourName, setParlourName] = useState(event.parlourName || '');
  const [parlourCity, setParlourCity] = useState(event.parlourCity || '');
  const [parlourArea, setParlourArea] = useState(event.parlourArea || '');
  const [parlourMap, setParlourMap] = useState(event.parlourMap || '');
  const [parlourStartTime, setParlourStartTime] = useState(event.parlourStartTime || '');
  const [parlourEndTime, setParlourEndTime] = useState(event.parlourEndTime || '');
  
  const [doGroomComeInMehndi, setDoGroomComeInMehndi] = useState(event.doGroomComeInMehndi === 'YES');
  const [guestCount, setGuestCount] = useState(event.guestCount || '');
  
  const [demands, setDemands] = useState<string[]>(
    event.eventDemands && event.eventDemands.length > 0 ? event.eventDemands : ['', '', '', '']
  );
  const [references, setReferences] = useState<string[]>(
    event.eventReferences && event.eventReferences.length > 0 ? event.eventReferences : ['', '']
  );

  // Reset form when event changes
  useEffect(() => {
    setVenueType(event.venueType || '');
    setVenueName(event.venueName || '');
    setVenueCity(event.venueCity || '');
    setVenueArea(event.venueArea || '');
    setVenueMap(event.venueMap || '');
    setEventStartTime(event.eventStartTime || '');
    setEventEndTime(event.eventEndTime || '');
    setParlourType(event.parlourType || '');
    setParlourName(event.parlourName || '');
    setParlourCity(event.parlourCity || '');
    setParlourArea(event.parlourArea || '');
    setParlourMap(event.parlourMap || '');
    setParlourStartTime(event.parlourStartTime || '');
    setParlourEndTime(event.parlourEndTime || '');
    setDoGroomComeInMehndi(event.doGroomComeInMehndi === 'YES');
    setGuestCount(event.guestCount || '');
    setDemands(event.eventDemands && event.eventDemands.length > 0 ? event.eventDemands : ['', '', '', '']);
    setReferences(event.eventReferences && event.eventReferences.length > 0 ? event.eventReferences : ['', '']);
  }, [event]);

  const eventName = event.eventName || '';
  const monthName = event.eventMonth ? getMonthName(parseInt(event.eventMonth)) : '';
  const dateDisplay = `${monthName} ${event.eventDay}, ${event.eventYear}`;

  const hasFilled = hasFilledDetails(event);
  const isUrgentEvent = isEventUrgent(eventDateAD || '');
  const hasEmptyFields = hasEmptyRequiredFields(event);
  const showUrgencyWarning = isUrgentEvent && hasEmptyFields;

  // Get event color based on name
  const getEventColor = () => {
    const upper = eventName.toUpperCase();
    if (upper.includes('WEDDING')) return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
    if (upper.includes('RECEPTION')) return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
    if (upper.includes('ENGAGEMENT')) return 'from-pink-500/20 to-rose-500/20 border-pink-500/30';
    if (upper.includes('PRE') || upper.includes('MEHNDI')) return 'from-orange-500/20 to-amber-500/20 border-orange-500/30';
    return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30';
  };

  const getEventIconColor = () => {
    const upper = eventName.toUpperCase();
    if (upper.includes('WEDDING')) return "bg-blue-500/30 text-blue-200";
    if (upper.includes('RECEPTION')) return "bg-purple-500/30 text-purple-200";
    if (upper.includes('ENGAGEMENT')) return "bg-pink-500/30 text-pink-200";
    if (upper.includes('PRE') || upper.includes('MEHNDI')) return "bg-orange-500/30 text-orange-200";
    return "bg-emerald-500/30 text-emerald-200";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        venueType,
        venueName,
        venueCity,
        venueArea,
        venueMap,
        eventStartTime,
        eventEndTime,
        parlourType,
        parlourName,
        parlourCity,
        parlourArea,
        parlourMap,
        parlourStartTime,
        parlourEndTime,
        doGroomComeInMehndi: doGroomComeInMehndi ? 'YES' : '',
        guestCount,
        eventDemands: demands.filter(d => d.trim()),
        eventReferences: references.filter(r => r.trim()),
      };
      
      const success = await onSave(event.eventIndex, updates);
      if (success) {
        onToggleExpand();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setVenueType(event.venueType || '');
    setVenueName(event.venueName || '');
    setVenueCity(event.venueCity || '');
    setVenueArea(event.venueArea || '');
    setVenueMap(event.venueMap || '');
    setEventStartTime(event.eventStartTime || '');
    setEventEndTime(event.eventEndTime || '');
    setParlourType(event.parlourType || '');
    setParlourName(event.parlourName || '');
    setParlourCity(event.parlourCity || '');
    setParlourArea(event.parlourArea || '');
    setParlourMap(event.parlourMap || '');
    setParlourStartTime(event.parlourStartTime || '');
    setParlourEndTime(event.parlourEndTime || '');
    setDoGroomComeInMehndi(event.doGroomComeInMehndi === 'YES');
    setGuestCount(event.guestCount || '');
    setDemands(event.eventDemands && event.eventDemands.length > 0 ? event.eventDemands : ['', '', '', '']);
    setReferences(event.eventReferences && event.eventReferences.length > 0 ? event.eventReferences : ['', '']);
    onToggleExpand();
  };

  const addDemand = () => setDemands([...demands, '']);
  const removeDemand = (index: number) => setDemands(demands.filter((_, i) => i !== index));
  const updateDemand = (index: number, value: string) => {
    const updated = [...demands];
    updated[index] = value;
    setDemands(updated);
  };

  const addReference = () => setReferences([...references, '']);
  const removeReference = (index: number) => setReferences(references.filter((_, i) => i !== index));
  const updateReference = (index: number, value: string) => {
    const updated = [...references];
    updated[index] = value;
    setReferences(updated);
  };

  // Format location display
  const formatVenueDisplay = () => {
    const parts = [event.venueName, event.venueArea, event.venueCity].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not set';
  };

  const formatParlourDisplay = () => {
    const parts = [event.parlourName, event.parlourArea, event.parlourCity].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not set';
  };

  const formatTimeDisplay = (start: string, end: string) => {
    if (!start && !end) return 'Not set';
    if (start && end) return `${start} - ${end}`;
    return start || end;
  };

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-300",
      isExpanded ? `bg-gradient-to-br ${getEventColor()}` : "bg-white/5 border-white/10 hover:border-white/20",
      showUrgencyWarning && !isExpanded && "ring-2 ring-red-500/50"
    )}>
      {/* Header - Always visible, clickable to expand/collapse */}
      <button
        onClick={() => !isExpanded && onToggleExpand()}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold",
            getEventIconColor()
          )}>
            {eventName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-white">{eventName}</div>
            <div 
              className="text-sm text-white/60 hover:text-white/80 cursor-pointer underline decoration-dotted"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {dateDisplay}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                hasFilled 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-white/5 text-white/40 border-white/10"
              )}
            >
              {hasFilled ? "Details added" : "Not filled – click to add"}
            </Badge>
          )}
          {showUrgencyWarning && !isExpanded && (
            <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/60" />
          )}
        </div>
      </button>

      {/* Content - Read-only when collapsed, Form when expanded */}
      {!isExpanded ? (
        /* Read-only Details View */
        <div className="px-4 pb-4 space-y-3 text-sm">
          {/* Venue Row */}
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
            <div className="flex-1">
              <span className="text-white/50 text-xs">Venue:</span>
              <div className="text-white/90">
                {event.venueType && <Badge variant="outline" className="mr-2 text-xs bg-white/5 border-white/20">{event.venueType}</Badge>}
                {formatVenueDisplay()}
                {event.venueMap && (
                  <a href={event.venueMap} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:text-blue-300">
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Event Timing Row */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
            <div className="flex-1">
              <span className="text-white/50 text-xs">Event Time:</span>
              <div className="text-white/90">{formatTimeDisplay(event.eventStartTime, event.eventEndTime)}</div>
            </div>
          </div>

          {/* Parlour Row */}
          <div className="flex items-start gap-3">
            <Scissors className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
            <div className="flex-1">
              <span className="text-white/50 text-xs">Parlour:</span>
              <div className="text-white/90">
                {event.parlourType && <Badge variant="outline" className="mr-2 text-xs bg-white/5 border-white/20">{event.parlourType}</Badge>}
                {formatParlourDisplay()}
                {event.parlourMap && (
                  <a href={event.parlourMap} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:text-blue-300">
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Parlour Timing Row */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
            <div className="flex-1">
              <span className="text-white/50 text-xs">Parlour Time:</span>
              <div className="text-white/90">{formatTimeDisplay(event.parlourStartTime, event.parlourEndTime)}</div>
            </div>
          </div>

          {/* Guest Count Row */}
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
            <div className="flex-1">
              <span className="text-white/50 text-xs">Guest Count:</span>
              <div className="text-white/90">{event.guestCount || 'Not set'}</div>
            </div>
          </div>

          {/* Groom in Mehndi (if applicable) */}
          {eventName.toUpperCase().includes('MEHNDI') && (
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Groom Comes:</span>
                <div className="text-white/90">{event.doGroomComeInMehndi || 'Not set'}</div>
              </div>
            </div>
          )}

          {/* Demands (if any) */}
          {event.eventDemands && event.eventDemands.some(d => d.trim()) && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Demands:</span>
                <div className="text-white/90">{event.eventDemands.filter(d => d.trim()).join(', ')}</div>
              </div>
            </div>
          )}

          {/* References (if any) */}
          {event.eventReferences && event.eventReferences.some(r => r.trim()) && (
            <div className="flex items-start gap-3">
              <Link2 className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">References:</span>
                <div className="text-white/90 flex flex-wrap gap-2">
                  {event.eventReferences.filter(r => r.trim()).map((ref, idx) => (
                    <a 
                      key={idx} 
                      href={ref} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:text-blue-300 text-xs underline"
                    >
                      Link {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Expanded Edit Form */
        <div className="px-4 pb-4 space-y-6 animate-fade-in">
          {/* Urgency Warning */}
          {showUrgencyWarning && (
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-200">
                <span className="font-semibold">Event is in less than 20 days!</span>
                <span className="text-red-300/80 ml-1">Some venue details are missing.</span>
              </div>
            </div>
          )}

          {/* Venue Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <MapPin className="h-4 w-4" />
              Venue Details
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Type</Label>
                <Select value={venueType} onValueChange={setVenueType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {VENUE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value || '__empty__'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Name</Label>
                <Input 
                  value={venueName} 
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="Venue name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">City</Label>
                <Input 
                  value={venueCity} 
                  onChange={e => setVenueCity(e.target.value)}
                  placeholder="City"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Area</Label>
                <Input 
                  value={venueArea} 
                  onChange={e => setVenueArea(e.target.value)}
                  placeholder="Area/Locality"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/50">Map Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={venueMap} 
                  onChange={e => setVenueMap(e.target.value)}
                  placeholder="Paste Google Maps link..."
                  type="url"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="text-white/70 border-white/20 hover:bg-white/10"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Open Maps
                </Button>
              </div>
            </div>
          </div>

          {/* Event Timing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Clock className="h-4 w-4" />
              Event Timing
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Start Time</Label>
                <Input 
                  type="time"
                  value={eventStartTime} 
                  onChange={e => setEventStartTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">End Time</Label>
                <Input 
                  type="time"
                  value={eventEndTime} 
                  onChange={e => setEventEndTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Parlour Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Scissors className="h-4 w-4" />
              Parlour Details
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Type</Label>
                <Select value={parlourType} onValueChange={setParlourType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {VENUE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value || '__empty__'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Name</Label>
                <Input 
                  value={parlourName} 
                  onChange={e => setParlourName(e.target.value)}
                  placeholder="Parlour name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">City</Label>
                <Input 
                  value={parlourCity} 
                  onChange={e => setParlourCity(e.target.value)}
                  placeholder="City"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Area</Label>
                <Input 
                  value={parlourArea} 
                  onChange={e => setParlourArea(e.target.value)}
                  placeholder="Area/Locality"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/50">Map Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={parlourMap} 
                  onChange={e => setParlourMap(e.target.value)}
                  placeholder="Paste Google Maps link..."
                  type="url"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="text-white/70 border-white/20 hover:bg-white/10"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Open Maps
                </Button>
              </div>
            </div>
          </div>

          {/* Parlour Timing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Clock className="h-4 w-4" />
              Parlour Timing
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Start Time</Label>
                <Input 
                  type="time"
                  value={parlourStartTime} 
                  onChange={e => setParlourStartTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">End Time</Label>
                <Input 
                  type="time"
                  value={parlourEndTime} 
                  onChange={e => setParlourEndTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Users className="h-4 w-4" />
              Additional Info
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <Label className="text-sm text-white/70">Groom comes in Mehndi?</Label>
                <Switch
                  checked={doGroomComeInMehndi}
                  onCheckedChange={setDoGroomComeInMehndi}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Guest Count</Label>
                <Input 
                  type="number"
                  value={guestCount} 
                  onChange={e => setGuestCount(e.target.value)}
                  placeholder="Number of guests"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          {/* Event Demands */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <FileText className="h-4 w-4" />
              Event Demands
            </div>
            <div className="space-y-2">
              {demands.map((demand, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-white/40 text-sm w-6">{idx + 1}.</span>
                  <Input 
                    value={demand} 
                    onChange={e => updateDemand(idx, e.target.value)}
                    placeholder={`Demand ${idx + 1}`}
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  {demands.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDemand(idx)}
                      className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={addDemand}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>
          </div>

          {/* Event References */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Link2 className="h-4 w-4" />
              Event References (Links)
            </div>
            <div className="space-y-2">
              {references.map((ref, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-white/40 text-sm w-6">{idx + 1}.</span>
                  <Input 
                    type="url"
                    value={ref} 
                    onChange={e => updateReference(idx, e.target.value)}
                    placeholder={`https://...`}
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  {references.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReference(idx)}
                      className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={addReference}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullScreenEventCard;
