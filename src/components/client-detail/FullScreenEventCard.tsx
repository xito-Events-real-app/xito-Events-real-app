import { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Scissors, ChevronDown, ChevronUp, Save, X, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getMonthName } from '@/lib/nepali-months';
import { EventDetail } from '@/hooks/useEventDetails';

interface FullScreenEventCardProps {
  event: EventDetail;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSave: (eventIndex: number, updates: Partial<EventDetail>) => Promise<boolean>;
  isUrgent?: boolean;
}

const venueTypeOptions = ['HOTEL', 'PARTY PALACE', 'BANQUET', 'RESORT', 'OUTDOOR', 'HOME', 'OTHER'];
const parlourTypeOptions = ['SALON', 'PARLOUR', 'HOME SERVICE', 'HOTEL SUITE', 'OTHER'];

export const FullScreenEventCard = ({
  event,
  isExpanded,
  onToggleExpand,
  onSave,
  isUrgent = false,
}: FullScreenEventCardProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    venueType: event.venueType || '',
    venueName: event.venueName || '',
    venueCity: event.venueCity || '',
    venueArea: event.venueArea || '',
    venueMap: event.venueMap || '',
    eventStartTime: event.eventStartTime || '',
    eventEndTime: event.eventEndTime || '',
    parlourType: event.parlourType || '',
    parlourName: event.parlourName || '',
    parlourCity: event.parlourCity || '',
    parlourArea: event.parlourArea || '',
    parlourMap: event.parlourMap || '',
    parlourStartTime: event.parlourStartTime || '',
    parlourEndTime: event.parlourEndTime || '',
    doGroomComeInMehndi: event.doGroomComeInMehndi || '',
    guestCount: event.guestCount || '',
  });

  const eventName = event.eventName || '';
  const monthName = event.eventMonth ? getMonthName(parseInt(event.eventMonth)) : '';
  const dateDisplay = `${monthName} ${event.eventDay}, ${event.eventYear}`;

  // Get event type color
  const getEventTypeColor = () => {
    const upper = eventName.toUpperCase();
    if (upper.includes('WEDDING')) return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    if (upper.includes('RECEPTION')) return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
    if (upper.includes('ENGAGEMENT')) return 'bg-pink-500/20 border-pink-500/40 text-pink-300';
    if (upper.includes('PRE') || upper.includes('MEHNDI')) return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
    return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(event.eventIndex, formData);
      onToggleExpand(); // Collapse after saving
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      venueType: event.venueType || '',
      venueName: event.venueName || '',
      venueCity: event.venueCity || '',
      venueArea: event.venueArea || '',
      venueMap: event.venueMap || '',
      eventStartTime: event.eventStartTime || '',
      eventEndTime: event.eventEndTime || '',
      parlourType: event.parlourType || '',
      parlourName: event.parlourName || '',
      parlourCity: event.parlourCity || '',
      parlourArea: event.parlourArea || '',
      parlourMap: event.parlourMap || '',
      parlourStartTime: event.parlourStartTime || '',
      parlourEndTime: event.parlourEndTime || '',
      doGroomComeInMehndi: event.doGroomComeInMehndi || '',
      guestCount: event.guestCount || '',
    });
    onToggleExpand();
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
    <Card className={cn(
      "transition-all duration-300 border",
      isUrgent && !isExpanded && "ring-2 ring-red-500/50",
      getEventTypeColor()
    )}>
      {/* Header - Always visible, clickable to expand/collapse */}
      <CardHeader 
        className="cursor-pointer py-4 px-5"
        onClick={() => !isExpanded && onToggleExpand()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 opacity-70" />
            <div>
              <div className="font-bold text-lg">{eventName}</div>
              <div 
                className="text-sm opacity-70 hover:opacity-100 cursor-pointer underline decoration-dotted"
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
            {isUrgent && (
              <Badge variant="destructive" className="text-xs">Urgent</Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 opacity-50" />
            ) : (
              <ChevronDown className="h-5 w-5 opacity-50" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content - Read-only when collapsed, Form when expanded */}
      <CardContent className="pt-0 pb-4 px-5">
        {!isExpanded ? (
          /* Read-only Details View */
          <div className="space-y-3 text-sm">
            {/* Venue Row */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Venue:</span>
                <div className="text-white/90">
                  {event.venueType && <Badge variant="outline" className="mr-2 text-xs">{event.venueType}</Badge>}
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
              <Clock className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Event Time:</span>
                <div className="text-white/90">{formatTimeDisplay(event.eventStartTime, event.eventEndTime)}</div>
              </div>
            </div>

            {/* Parlour Row */}
            <div className="flex items-start gap-3">
              <Scissors className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Parlour:</span>
                <div className="text-white/90">
                  {event.parlourType && <Badge variant="outline" className="mr-2 text-xs">{event.parlourType}</Badge>}
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
              <Clock className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Parlour Time:</span>
                <div className="text-white/90">{formatTimeDisplay(event.parlourStartTime, event.parlourEndTime)}</div>
              </div>
            </div>

            {/* Guest Count Row */}
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
              <div className="flex-1">
                <span className="text-white/50 text-xs">Guest Count:</span>
                <div className="text-white/90">{event.guestCount || 'Not set'}</div>
              </div>
            </div>

            {/* Groom in Mehndi (if applicable) */}
            {eventName.toUpperCase().includes('MEHNDI') && (
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
                <div className="flex-1">
                  <span className="text-white/50 text-xs">Groom Comes:</span>
                  <div className="text-white/90">{event.doGroomComeInMehndi || 'Not set'}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Expanded Edit Form */
          <div className="space-y-6 mt-4">
            {/* Venue Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Venue Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">Venue Type</Label>
                  <Select value={formData.venueType} onValueChange={(v) => setFormData(p => ({ ...p, venueType: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {venueTypeOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-white/50">Venue Name</Label>
                  <Input
                    value={formData.venueName}
                    onChange={(e) => setFormData(p => ({ ...p, venueName: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Hotel Yak & Yeti"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">City</Label>
                  <Input
                    value={formData.venueCity}
                    onChange={(e) => setFormData(p => ({ ...p, venueCity: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Kathmandu"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">Area</Label>
                  <Input
                    value={formData.venueArea}
                    onChange={(e) => setFormData(p => ({ ...p, venueArea: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Durbar Marg"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-white/50">Map Link</Label>
                  <Input
                    value={formData.venueMap}
                    onChange={(e) => setFormData(p => ({ ...p, venueMap: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Google Maps URL"
                  />
                </div>
              </div>
            </div>

            {/* Event Timing Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Event Timing
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.eventStartTime}
                    onChange={(e) => setFormData(p => ({ ...p, eventStartTime: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">End Time</Label>
                  <Input
                    type="time"
                    value={formData.eventEndTime}
                    onChange={(e) => setFormData(p => ({ ...p, eventEndTime: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Parlour Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Scissors className="h-4 w-4" /> Parlour Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">Parlour Type</Label>
                  <Select value={formData.parlourType} onValueChange={(v) => setFormData(p => ({ ...p, parlourType: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {parlourTypeOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-white/50">Parlour Name</Label>
                  <Input
                    value={formData.parlourName}
                    onChange={(e) => setFormData(p => ({ ...p, parlourName: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Jasmine Salon"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">City</Label>
                  <Input
                    value={formData.parlourCity}
                    onChange={(e) => setFormData(p => ({ ...p, parlourCity: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Lalitpur"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">Area</Label>
                  <Input
                    value={formData.parlourArea}
                    onChange={(e) => setFormData(p => ({ ...p, parlourArea: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. Patan"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-white/50">Map Link</Label>
                  <Input
                    value={formData.parlourMap}
                    onChange={(e) => setFormData(p => ({ ...p, parlourMap: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Google Maps URL"
                  />
                </div>
              </div>
            </div>

            {/* Parlour Timing Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Parlour Timing
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.parlourStartTime}
                    onChange={(e) => setFormData(p => ({ ...p, parlourStartTime: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">End Time</Label>
                  <Input
                    type="time"
                    value={formData.parlourEndTime}
                    onChange={(e) => setFormData(p => ({ ...p, parlourEndTime: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Users className="h-4 w-4" /> Additional Info
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">Guest Count</Label>
                  <Input
                    value={formData.guestCount}
                    onChange={(e) => setFormData(p => ({ ...p, guestCount: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g. 500"
                  />
                </div>
                {eventName.toUpperCase().includes('MEHNDI') && (
                  <div>
                    <Label className="text-xs text-white/50">Groom Comes?</Label>
                    <Select value={formData.doGroomComeInMehndi} onValueChange={(v) => setFormData(p => ({ ...p, doGroomComeInMehndi: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">Yes</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                        <SelectItem value="MAYBE">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FullScreenEventCard;
