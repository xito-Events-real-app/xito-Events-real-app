import { useState, useEffect, useCallback } from 'react';
import { isWeddingEvent } from '@/lib/wedding-timing-utils';
import { Calendar, MapPin, Clock, Users, Scissors, ChevronDown, ChevronUp, Save, X, Loader2, ExternalLink, FileText, Link2, Plus, Trash2, AlertTriangle, Check, ChevronsUpDown, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getMonthName } from '@/lib/nepali-months';
import { EventDetail } from '@/hooks/useEventDetails';
import { useVenueData } from '@/hooks/useVenueData';
import { useParlourData } from '@/hooks/useParlourData';
import { VenueEntry } from '@/lib/event-venue-api';
import { ParlourEntry } from '@/lib/parlour-api';
import { CrewCategorySelector, CategoryBadges } from '@/components/shared/CrewCategorySelector';

interface FullScreenEventCardProps {
  event: EventDetail;
  eventDateAD?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSave: (eventIndex: number, updates: Partial<EventDetail> & { eventDemands?: string[]; eventReferences?: string[] }) => Promise<boolean>;
  isUrgent?: boolean;
  registeredDateTimeAD?: string;
  requiredCategories?: string;
  onUpdateCategories?: (eventName: string, eventDateAD: string, categories: string) => Promise<void>;
}

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
  registeredDateTimeAD,
  requiredCategories: initialRequiredCategories,
  onUpdateCategories,
}: FullScreenEventCardProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialRequiredCategories ? initialRequiredCategories.split(',').map(c => c.trim()).filter(Boolean) : []
  );
  
  // Venue data hook - for dynamic dropdowns
  const { 
    venueTypes, 
    venues, 
    isLoadingTypes, 
    isLoadingVenues, 
    fetchVenuesByType,
    addNewVenue,
    getVenueByName,
    clearVenues,
  } = useVenueData();

  // Parlour data hook - for dynamic dropdowns
  const { 
    parlourTypes, 
    parlours, 
    isLoadingTypes: isLoadingParlourTypes, 
    isLoadingParlours, 
    fetchParloursByType,
    addNewParlour,
    getParlourByName,
    clearParlours,
  } = useParlourData();
  
  // Venue Combobox state
  const [venueTypeOpen, setVenueTypeOpen] = useState(false);
  const [venueNameOpen, setVenueNameOpen] = useState(false);
  const [isNewVenue, setIsNewVenue] = useState(false);
  
  // Parlour Combobox state
  const [parlourTypeOpen, setParlourTypeOpen] = useState(false);
  const [parlourNameOpen, setParlourNameOpen] = useState(false);
  const [isNewParlour, setIsNewParlour] = useState(false);
  
  // Form state
  const [venueType, setVenueType] = useState(event.venueType || '');
  const [venueName, setVenueName] = useState(event.venueName || '');
  const [venueCity, setVenueCity] = useState(event.venueCity || '');
  const [venueArea, setVenueArea] = useState(event.venueArea || '');
  const [venueMap, setVenueMap] = useState(event.venueMap || '');
  const [eventStartTime, setEventStartTime] = useState(event.eventStartTime || '');
  const [eventEndTime, setEventEndTime] = useState(event.eventEndTime || '');
  const [brideStartTime, setBrideStartTime] = useState(event.brideStartTime || '');
  const [brideEndTime, setBrideEndTime] = useState(event.brideEndTime || '');
  const [groomStartTime, setGroomStartTime] = useState(event.groomStartTime || '');
  const [groomEndTime, setGroomEndTime] = useState(event.groomEndTime || '');
  
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
    setBrideStartTime(event.brideStartTime || '');
    setBrideEndTime(event.brideEndTime || '');
    setGroomStartTime(event.groomStartTime || '');
    setGroomEndTime(event.groomEndTime || '');
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
    setIsNewVenue(false);
    setIsNewParlour(false);
  }, [event]);

  // Fetch venues when venue type changes
  useEffect(() => {
    if (venueType && isExpanded) {
      fetchVenuesByType(venueType);
    } else {
      clearVenues();
    }
  }, [venueType, isExpanded, fetchVenuesByType, clearVenues]);

  // Fetch parlours when parlour type changes
  useEffect(() => {
    if (parlourType && isExpanded) {
      fetchParloursByType(parlourType);
    } else {
      clearParlours();
    }
  }, [parlourType, isExpanded, fetchParloursByType, clearParlours]);

  // Handle venue type change
  const handleVenueTypeChange = useCallback((newType: string) => {
    setVenueType(newType);
    // Clear venue name and details when type changes
    setVenueName('');
    setVenueCity('');
    setVenueArea('');
    setVenueMap('');
    setIsNewVenue(false);
    setVenueTypeOpen(false);
  }, []);

  // Handle venue selection from combobox - auto-fill city, area, map
  const handleVenueSelect = useCallback((selectedName: string) => {
    setVenueName(selectedName);
    const venue = venues.find(v => v.name.toLowerCase() === selectedName.toLowerCase());
    if (venue) {
      // Auto-fill from existing venue
      setVenueCity(venue.city);
      setVenueArea(venue.area);
      setVenueMap(venue.googleMap);
      setIsNewVenue(false);
    } else {
      // New venue - user needs to enter details manually
      setVenueCity('');
      setVenueArea('');
      setVenueMap('');
      setIsNewVenue(true);
    }
    setVenueNameOpen(false);
  }, [venues]);

  // Handle manual venue name input
  const handleVenueNameInput = useCallback((value: string) => {
    setVenueName(value);
    // Check if this matches an existing venue
    const venue = venues.find(v => v.name.toLowerCase() === value.toLowerCase());
    if (venue) {
      setVenueCity(venue.city);
      setVenueArea(venue.area);
      setVenueMap(venue.googleMap);
      setIsNewVenue(false);
    } else if (value.trim()) {
      setIsNewVenue(true);
    }
  }, [venues]);

  // Handle parlour type change
  const handleParlourTypeChange = useCallback((newType: string) => {
    setParlourType(newType);
    // Clear parlour name and details when type changes
    setParlourName('');
    setParlourCity('');
    setParlourArea('');
    setParlourMap('');
    setIsNewParlour(false);
    setParlourTypeOpen(false);
  }, []);

  // Handle parlour selection from combobox - auto-fill city, area, map
  const handleParlourSelect = useCallback((selectedName: string) => {
    setParlourName(selectedName);
    const parlour = parlours.find(p => p.name.toLowerCase() === selectedName.toLowerCase());
    if (parlour) {
      // Auto-fill from existing parlour
      setParlourCity(parlour.city);
      setParlourArea(parlour.area);
      setParlourMap(parlour.googleMap);
      setIsNewParlour(false);
    } else {
      // New parlour - user needs to enter details manually
      setParlourCity('');
      setParlourArea('');
      setParlourMap('');
      setIsNewParlour(true);
    }
    setParlourNameOpen(false);
  }, [parlours]);

  // Handle manual parlour name input
  const handleParlourNameInput = useCallback((value: string) => {
    setParlourName(value);
    // Check if this matches an existing parlour
    const parlour = parlours.find(p => p.name.toLowerCase() === value.toLowerCase());
    if (parlour) {
      setParlourCity(parlour.city);
      setParlourArea(parlour.area);
      setParlourMap(parlour.googleMap);
      setIsNewParlour(false);
    } else if (value.trim()) {
      setIsNewParlour(true);
    }
  }, [parlours]);

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
      // If this is a new venue, add it to the sheet first
      if (isNewVenue && venueType && venueName.trim()) {
        await addNewVenue(venueType, venueName.trim(), venueCity, venueArea, venueMap);
      }

      // If this is a new parlour, add it to the sheet first
      if (isNewParlour && parlourType && parlourName.trim()) {
        await addNewParlour(parlourType, parlourName.trim(), parlourCity, parlourArea, parlourMap);
      }

      const isWedding = isWeddingEvent(eventName);
      
      const updates: any = {
        venueType,
        venueName,
        venueCity,
        venueArea,
        venueMap,
        eventStartTime: isWedding ? (brideStartTime || eventStartTime) : eventStartTime,
        eventEndTime: isWedding ? (brideEndTime || eventEndTime) : eventEndTime,
        brideStartTime: isWedding ? brideStartTime : '',
        brideEndTime: isWedding ? brideEndTime : '',
        groomStartTime: isWedding ? groomStartTime : '',
        groomEndTime: isWedding ? groomEndTime : '',
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
    setBrideStartTime(event.brideStartTime || '');
    setBrideEndTime(event.brideEndTime || '');
    setGroomStartTime(event.groomStartTime || '');
    setGroomEndTime(event.groomEndTime || '');
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

  // Format time for display (e.g., "8:00 AM")
  const formatTime = (time: string): string => {
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
  };

  // Build venue time range
  const venueTimeRange = event.eventStartTime && event.eventEndTime
    ? `${formatTime(event.eventStartTime)} - ${formatTime(event.eventEndTime)}`
    : event.eventStartTime ? formatTime(event.eventStartTime) : '';

  // Build parlour time range  
  const parlourTimeRange = event.parlourStartTime && event.parlourEndTime
    ? `${formatTime(event.parlourStartTime)} - ${formatTime(event.parlourEndTime)}`
    : event.parlourStartTime ? formatTime(event.parlourStartTime) : '';

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-300",
      isExpanded ? `bg-gradient-to-br ${getEventColor()}` : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600/70",
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
          {!isExpanded && selectedCategories.length > 0 && (
            <CategoryBadges categories={selectedCategories.join(',')} />
          )}
          {!isExpanded && onUpdateCategories && (
            <Popover open={showCategorySelector} onOpenChange={setShowCategorySelector}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCategorySelector(true); }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title="Set required crew"
                >
                  <UserCog className="h-3.5 w-3.5 text-white/70" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="end" onClick={(e) => e.stopPropagation()}>
                <CrewCategorySelector
                  selected={selectedCategories}
                  onChange={async (codes) => {
                    setSelectedCategories(codes);
                    if (onUpdateCategories) {
                      await onUpdateCategories(event.eventName || '', eventDateAD || '', codes.join(','));
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
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
        /* Read-only Details View - Dashboard Style */
        <div className="px-4 pb-4">
          <div className="flex gap-4 border-t border-slate-700/30 pt-3">
            {/* LEFT - Date Column */}
            <div className="w-1/4 min-w-[80px]">
              <div className="text-sm font-bold uppercase text-emerald-400">
                {monthName} {event.eventDay}
              </div>
              <div className="text-xs text-white/70 mt-0.5">
                {event.eventYear}
              </div>
              {event.venueType && (
                <Badge variant="outline" className="mt-1.5 text-xs bg-white/10 border-white/20 text-white/80">
                  {event.venueType}
                </Badge>
              )}
            </div>
            
            {/* RIGHT - Details Column */}
            <div className="w-3/4 space-y-2">
              {/* Venue Row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-amber-400">Venue:</span>
                {event.venueName ? (
                  <>
                    <span className="text-sm font-semibold text-white">{event.venueName}</span>
                    {(event.venueArea || event.venueCity) && (
                      <span className="text-xs text-white/70">
                        {[event.venueArea, event.venueCity].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {event.venueMap && (
                      <a
                        href={event.venueMap}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                      >
                        <MapPin className="h-3 w-3" />
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {venueTimeRange && (
                      <span className="text-xs font-medium text-emerald-400">{venueTimeRange}</span>
                    )}
                    {event.guestCount && (
                      <span className="text-xs font-medium text-amber-400">({event.guestCount})</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-white/40 italic">Not set</span>
                )}
              </div>
              
              {/* Parlour Row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-purple-400">Parlour:</span>
                {event.parlourName ? (
                  <>
                    <span className="text-sm font-semibold text-white">{event.parlourName}</span>
                    {(event.parlourArea || event.parlourCity) && (
                      <span className="text-xs text-white/70">
                        {[event.parlourArea, event.parlourCity].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {event.parlourMap && (
                      <a
                        href={event.parlourMap}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                      >
                        <MapPin className="h-3 w-3" />
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {parlourTimeRange && (
                      <span className="text-xs font-medium text-emerald-400">{parlourTimeRange}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-white/40 italic">Not set</span>
                )}
              </div>

              {/* Groom in Mehndi (if applicable) */}
              {eventName.toUpperCase().includes('MEHNDI') && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-pink-400">Groom Comes:</span>
                  <span className={cn(
                    "text-xs font-medium",
                    event.doGroomComeInMehndi === 'YES' ? "text-emerald-400" : "text-white/40 italic"
                  )}>
                    {event.doGroomComeInMehndi || 'Not set'}
                  </span>
                </div>
              )}

              {/* Demands (if any) */}
              {event.eventDemands && event.eventDemands.some(d => d.trim()) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-cyan-400">Demands:</span>
                  <span className="text-xs text-white/80">{event.eventDemands.filter(d => d.trim()).join(', ')}</span>
                </div>
              )}

              {/* References (if any) */}
              {event.eventReferences && event.eventReferences.some(r => r.trim()) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-sky-400">References:</span>
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
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded Edit Form - Dashboard Style */
        <div className="px-4 pb-4 space-y-5 animate-fade-in border-t border-slate-700/30 pt-4">
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

          {/* Venue Details Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Venue Details</span>
              </div>
              {isNewVenue && venueName.trim() && (
                <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  + New venue will be saved
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-amber-400/80">Type</Label>
                <Popover open={venueTypeOpen} onOpenChange={setVenueTypeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={venueTypeOpen}
                      className="w-full justify-between bg-slate-900/60 border-slate-600/50 text-white hover:border-amber-400/50 hover:bg-slate-800/60"
                    >
                      {venueType || "Select type..."}
                      {isLoadingTypes ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 bg-slate-800 border-slate-600 z-[9999]">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search type..." className="text-white" />
                      <CommandList>
                        <CommandEmpty>No venue type found.</CommandEmpty>
                        <CommandGroup>
                          {venueTypes.map((type) => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => handleVenueTypeChange(type)}
                              className="text-white hover:bg-slate-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  venueType === type ? "opacity-100 text-amber-400" : "opacity-0"
                                )}
                              />
                              {type}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-amber-400/80">Name</Label>
                <Popover open={venueNameOpen} onOpenChange={setVenueNameOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={venueNameOpen}
                      disabled={!venueType}
                      className="w-full justify-between bg-slate-900/60 border-slate-600/50 text-white hover:border-amber-400/50 hover:bg-slate-800/60 disabled:opacity-50"
                    >
                      <span className="truncate">{venueName || (venueType ? "Select or type..." : "Select type first")}</span>
                      {isLoadingVenues ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0 bg-slate-800 border-slate-600 z-[9999]">
                    <Command className="bg-transparent">
                      <CommandInput 
                        placeholder="Search or add new..." 
                        className="text-white"
                        value={venueName}
                        onValueChange={handleVenueNameInput}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {venueName.trim() ? (
                            <div 
                              className="p-2 text-sm text-emerald-400 cursor-pointer hover:bg-slate-700"
                              onClick={() => handleVenueSelect(venueName.trim())}
                            >
                              + Add "{venueName.trim()}" as new venue
                            </div>
                          ) : (
                            "Type to search or add new..."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {venues.map((venue) => (
                            <CommandItem
                              key={venue.rowNumber}
                              value={venue.name}
                              onSelect={() => handleVenueSelect(venue.name)}
                              className="text-white hover:bg-slate-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  venueName.toLowerCase() === venue.name.toLowerCase() ? "opacity-100 text-amber-400" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{venue.name}</span>
                                {venue.city && (
                                  <span className="text-xs text-slate-400">{venue.city}{venue.area ? `, ${venue.area}` : ''}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-amber-400/80">City {isNewVenue && <span className="text-emerald-400">(new)</span>}</Label>
                <Input 
                  value={venueCity} 
                  onChange={e => setVenueCity(e.target.value)}
                  placeholder="City"
                  className="bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-amber-400/50 focus:border-amber-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-amber-400/80">Area {isNewVenue && <span className="text-emerald-400">(new)</span>}</Label>
                <Input 
                  value={venueArea} 
                  onChange={e => setVenueArea(e.target.value)}
                  placeholder="Area/Locality"
                  className="bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-amber-400/50 focus:border-amber-400"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-400">Map Link {isNewVenue && <span className="text-emerald-400">(new)</span>}</Label>
              <div className="flex gap-2">
                <Input 
                  value={venueMap} 
                  onChange={e => setVenueMap(e.target.value)}
                  placeholder="Paste Google Maps link..."
                  type="url"
                  className="flex-1 bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-blue-400/50 focus:border-blue-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 hover:border-blue-400/50"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Maps
                </Button>
              </div>
            </div>
          </div>

          {/* Event Timing Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Event Timing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-400/80">Start Time</Label>
                <Input 
                  type="time"
                  value={eventStartTime} 
                  onChange={e => setEventStartTime(e.target.value)}
                  className="bg-slate-900/60 border-slate-600/50 text-white hover:border-emerald-400/50 focus:border-emerald-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-400/80">End Time</Label>
                <Input 
                  type="time"
                  value={eventEndTime} 
                  onChange={e => setEventEndTime(e.target.value)}
                  className="bg-slate-900/60 border-slate-600/50 text-white hover:border-emerald-400/50 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Parlour Details Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">Parlour Details</span>
              {isNewParlour && parlourName && (
                <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                  New - will be added
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Parlour Type Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-400/80">Type</Label>
                <Popover open={parlourTypeOpen} onOpenChange={setParlourTypeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={parlourTypeOpen}
                      className="w-full justify-between bg-slate-900/60 border-slate-600/50 text-white hover:border-purple-400/50 hover:bg-slate-800/60"
                    >
                      {parlourType || "Select type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 bg-slate-800 border-slate-600 z-[9999]">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search type..." className="text-white" />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingParlourTypes ? "Loading..." : "No type found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {parlourTypes.map((type) => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={handleParlourTypeChange}
                              className="text-white hover:bg-slate-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  parlourType === type ? "opacity-100 text-purple-400" : "opacity-0"
                                )}
                              />
                              {type}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Parlour Name Combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-400/80">Name</Label>
                <Popover open={parlourNameOpen} onOpenChange={setParlourNameOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={parlourNameOpen}
                      disabled={!parlourType}
                      className="w-full justify-between bg-slate-900/60 border-slate-600/50 text-white hover:border-purple-400/50 hover:bg-slate-800/60 disabled:opacity-50"
                    >
                      {parlourName || (parlourType ? "Select or type name..." : "Select type first")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0 bg-slate-800 border-slate-600 z-[9999]">
                    <Command className="bg-transparent">
                      <CommandInput 
                        placeholder="Search or type new name..." 
                        className="text-white"
                        value={parlourName}
                        onValueChange={handleParlourNameInput}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingParlours ? (
                            <div className="flex items-center gap-2 p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </div>
                          ) : parlourName ? (
                            <div className="p-2 text-sm text-purple-300">
                              "{parlourName}" will be added as new
                            </div>
                          ) : (
                            "Type to search or add new..."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {parlours.map((parlour) => (
                            <CommandItem
                              key={parlour.rowNumber}
                              value={parlour.name}
                              onSelect={handleParlourSelect}
                              className="text-white hover:bg-slate-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  parlourName.toLowerCase() === parlour.name.toLowerCase() ? "opacity-100 text-purple-400" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{parlour.name}</span>
                                {(parlour.city || parlour.area) && (
                                  <span className="text-xs text-white/50">
                                    {[parlour.area, parlour.city].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-400/80">City</Label>
                <Input 
                  value={parlourCity} 
                  onChange={e => setParlourCity(e.target.value)}
                  placeholder="City"
                  className="bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-purple-400/50 focus:border-purple-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-400/80">Area</Label>
                <Input 
                  value={parlourArea} 
                  onChange={e => setParlourArea(e.target.value)}
                  placeholder="Area/Locality"
                  className="bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-purple-400/50 focus:border-purple-400"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-400">Map Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={parlourMap} 
                  onChange={e => setParlourMap(e.target.value)}
                  placeholder="Paste Google Maps link..."
                  type="url"
                  className="flex-1 bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-blue-400/50 focus:border-blue-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 hover:border-blue-400/50"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Maps
                </Button>
              </div>
            </div>
          </div>

          {/* Parlour Timing Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Parlour Timing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-400/80">Start Time</Label>
                <Input 
                  type="time"
                  value={parlourStartTime} 
                  onChange={e => setParlourStartTime(e.target.value)}
                  className="bg-slate-900/60 border-slate-600/50 text-white hover:border-emerald-400/50 focus:border-emerald-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-400/80">End Time</Label>
                <Input 
                  type="time"
                  value={parlourEndTime} 
                  onChange={e => setParlourEndTime(e.target.value)}
                  className="bg-slate-900/60 border-slate-600/50 text-white hover:border-emerald-400/50 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-400" />
              <span className="text-sm font-semibold text-pink-400">Additional Info</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-600/50">
                <Label className="text-sm text-white/80">Groom comes in Mehndi?</Label>
                <Switch
                  checked={doGroomComeInMehndi}
                  onCheckedChange={setDoGroomComeInMehndi}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-pink-400/80">Guest Count</Label>
                <Input 
                  type="number"
                  value={guestCount} 
                  onChange={e => setGuestCount(e.target.value)}
                  placeholder="Number of guests"
                  className="bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-pink-400/50 focus:border-pink-400"
                />
              </div>
            </div>
          </div>

          {/* Event Demands Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-400">Event Demands</span>
            </div>
            <div className="space-y-2">
              {demands.map((demand, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-cyan-400/60 text-sm w-6 font-medium">{idx + 1}.</span>
                  <Input 
                    value={demand} 
                    onChange={e => updateDemand(idx, e.target.value)}
                    placeholder={`Demand ${idx + 1}`}
                    className="flex-1 bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-cyan-400/50 focus:border-cyan-400"
                  />
                  {demands.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDemand(idx)}
                      className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
                className="text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-400/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>
          </div>

          {/* Event References Section */}
          <div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-semibold text-sky-400">Event References (Links)</span>
            </div>
            <div className="space-y-2">
              {references.map((ref, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-sky-400/60 text-sm w-6 font-medium">{idx + 1}.</span>
                  <Input 
                    type="url"
                    value={ref} 
                    onChange={e => updateReference(idx, e.target.value)}
                    placeholder={`https://...`}
                    className="flex-1 bg-slate-900/60 border-slate-600/50 text-white placeholder:text-slate-500 hover:border-sky-400/50 focus:border-sky-400"
                  />
                  {references.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReference(idx)}
                      className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
                className="text-sky-400/70 hover:text-sky-400 hover:bg-sky-400/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/40">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium"
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
