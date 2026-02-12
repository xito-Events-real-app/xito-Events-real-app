import { Link } from "react-router-dom";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { useBulkEventDetails } from "@/hooks/useBulkEventDetails";
import { Calendar, Sparkles, ArrowRight, Clock, MapPin, Scissors, Phone, MessageCircle, MessageSquare, Plus, Loader2, ExternalLink, ChevronDown, ChevronUp, FileText, Image, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { getCurrentBSDate, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { format } from "date-fns";
import { parseComments } from "@/lib/client-card-utils";
import { addBookedClientComment } from "@/lib/sheets-api";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getAllFreelancerAssignments, FreelancerAssignment } from "@/lib/freelancer-assignment-api";

const CREW_ROLE_CONFIG = [
  { field: 'photographerBride' as const, label: 'PB', color: 'bg-amber-100 text-amber-700' },
  { field: 'videographerBride' as const, label: 'VB', color: 'bg-purple-100 text-purple-700' },
  { field: 'photographerGroom' as const, label: 'PG', color: 'bg-amber-100 text-amber-700' },
  { field: 'videographerGroom' as const, label: 'VG', color: 'bg-purple-100 text-purple-700' },
  { field: 'extraPhotographer' as const, label: 'EP', color: 'bg-orange-100 text-orange-700' },
  { field: 'extraVideographer' as const, label: 'EV', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { field: 'assistant' as const, label: 'Asst', color: 'bg-emerald-100 text-emerald-700' },
  { field: 'iphoneShooter' as const, label: 'iPhone', color: 'bg-cyan-100 text-cyan-700' },
  { field: 'droneOperator' as const, label: 'Drone', color: 'bg-sky-100 text-sky-700' },
  { field: 'fpvOperator' as const, label: 'FPV', color: 'bg-teal-100 text-teal-700' },
];
// Helper to get upcoming events
function getUpcomingEvents(clients: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const events: { client: any; eventName: string; eventDate: Date; daysUntil: number; dateStr: string; eventIndex: number }[] = [];
  
  clients.forEach(client => {
    const eventDates = client.eventDateAD?.split('\n') || [];
    const eventNames = client.event?.split('\n') || [];
    
    eventDates.forEach((dateStr: string, idx: number) => {
      if (!dateStr?.trim()) return;
      
      const eventDate = new Date(dateStr.trim());
      if (isNaN(eventDate.getTime())) return;
      
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include future events (including today)
      if (daysUntil >= 0) {
        events.push({
          client,
          eventName: eventNames[idx] || eventNames[0] || 'Event',
          eventDate,
          daysUntil,
          dateStr: dateStr.trim(),
          eventIndex: idx
        });
      }
    });
  });
  
  // Sort by date (soonest first)
  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

// Format days until
function formatDaysUntil(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

// Format venue/parlour display
function formatVenueDisplay(name: string, area: string, city: string): string {
  if (!name) return '';
  const parts = [name];
  if (area) parts.push(area);
  if (city && city !== area) parts.push(city);
  return parts.join(', ');
}

// Convert time to 12hr format
function formatTo12Hr(time: string): string {
  if (!time) return '';
  // Already in 12hr format
  if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
    return time.toUpperCase();
  }
  // Parse 24hr format (e.g., "14:00" or "14:30")
  const match = time.match(/^(\d{1,2}):?(\d{2})?/);
  if (match) {
    let hours = parseInt(match[1]);
    const mins = match[2] || '00';
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins} ${isPM ? 'PM' : 'AM'}`;
  }
  return time;
}

// Calculate remaining time until event start
function getRemainingTime(eventDateStr: string, startTime: string): string {
  if (!eventDateStr || !startTime) return '';
  
  try {
    const eventDate = new Date(eventDateStr.trim());
    if (isNaN(eventDate.getTime())) return '';
    
    // Parse start time
    let hours = 0, mins = 0;
    const time12Match = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const time24Match = startTime.match(/^(\d{1,2}):?(\d{2})?/);
    
    if (time12Match) {
      hours = parseInt(time12Match[1]);
      mins = parseInt(time12Match[2]);
      const isPM = time12Match[3].toUpperCase() === 'PM';
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else if (time24Match) {
      hours = parseInt(time24Match[1]);
      mins = parseInt(time24Match[2] || '0');
    } else {
      return '';
    }
    
    eventDate.setHours(hours, mins, 0, 0);
    
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return ''; // Event has started
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    if (diffDays > 0) {
      return `${diffDays}d ${remainingHours}h rem`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m rem`;
    } else {
      return `${remainingMins}m rem`;
    }
  } catch {
    return '';
  }
}

// Format time range with remaining
function formatTimeRange(start: string, end: string): string {
  if (!start && !end) return '';
  const startFormatted = formatTo12Hr(start);
  const endFormatted = formatTo12Hr(end);
  if (startFormatted && endFormatted) return `${startFormatted} to ${endFormatted}`;
  return startFormatted || endFormatted;
}

// Parse references from space-separated quoted format: "url1" "url2"
// Or plain URLs separated by spaces/newlines
function parseReferences(refs: string): string[] {
  if (!refs) return [];
  
  const links: string[] = [];
  
  // Try to match quoted strings first: "url1" "url2"
  const quotedMatches = refs.match(/"([^"]+)"/g);
  if (quotedMatches && quotedMatches.length > 0) {
    quotedMatches.forEach(match => {
      const url = match.replace(/"/g, '').trim();
      if (url) links.push(url);
    });
    return links;
  }
  
  // Otherwise split by spaces/newlines and filter URLs
  const parts = refs.split(/[\s\n]+/).filter(Boolean);
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed && (trimmed.startsWith('http') || trimmed.includes('.'))) {
      links.push(trimmed);
    }
  });
  
  return links;
}

export function TodayEventsHero() {
  const { clients: bookedClients, isLoading, refreshData } = useBookedCachedData();
  const upcomingEvents = useMemo(() => getUpcomingEvents(bookedClients), [bookedClients]);
  
  // Comment drawer state
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [selectedEventForComment, setSelectedEventForComment] = useState<{
    clientName: string;
    clientId: string;
    bookedRowNumber: number;
    existingComments: string;
    registeredDateTimeAD: string;
  } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // Local state for optimistic comment updates
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  
  // Track which cards are expanded
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  // Extract unique client IDs for bulk fetch (limit to first 30 events)
  const clientIds = useMemo(() => {
    const limitedEvents = upcomingEvents.slice(0, 30);
    return [...new Set(limitedEvents.map(e => e.client.registeredDateTimeAD || '').filter(Boolean))];
  }, [upcomingEvents]);
  
  const { eventDetailsMap, isLoading: isLoadingDetails } = useBulkEventDetails(clientIds);

  // Fetch crew assignments (use sessionStorage cache for instant load)
  const [crewAssignments, setCrewAssignments] = useState<FreelancerAssignment[]>([]);
  useEffect(() => {
    // Load from cache first
    try {
      const cached = sessionStorage.getItem('crew_assignments_cache');
      if (cached) setCrewAssignments(JSON.parse(cached));
    } catch {}
    // Fresh fetch
    getAllFreelancerAssignments().then(data => {
      setCrewAssignments(data);
      try { sessionStorage.setItem('crew_assignments_cache', JSON.stringify(data)); } catch {}
    }).catch(() => {});
  }, []);
  
  // Handle adding a comment
  const handleAddComment = async () => {
    if (!selectedEventForComment || !newComment.trim()) return;
    
    const optimisticComment = newComment.trim();
    const clientId = selectedEventForComment.clientId;
    
    setIsAddingComment(true);
    
    // Optimistic update - show comment immediately
    setLocalComments(prev => ({
      ...prev,
      [clientId]: optimisticComment
    }));
    
    try {
      await addBookedClientComment(
        selectedEventForComment.bookedRowNumber,
        optimisticComment,
        selectedEventForComment.existingComments,
        selectedEventForComment.registeredDateTimeAD
      );
      setNewComment('');
      setCommentDrawerOpen(false);
      toast.success('Comment added');
      // Background refresh for full sync
      refreshData();
    } catch (error) {
      console.error('Failed to add comment:', error);
      // Revert optimistic update on error
      setLocalComments(prev => {
        const updated = { ...prev };
        delete updated[clientId];
        return updated;
      });
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };
  
  // Open comment drawer for a specific event
  const openCommentDrawer = (
    clientName: string, 
    clientId: string,
    bookedRowNumber: number, 
    existingComments: string,
    registeredDateTimeAD: string
  ) => {
    setSelectedEventForComment({ 
      clientName, 
      clientId,
      bookedRowNumber, 
      existingComments,
      registeredDateTimeAD
    });
    setNewComment('');
    setCommentDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const hasEvents = upcomingEvents.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm w-[90%] md:w-full max-w-full mx-auto md:mx-0">
      {/* Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
        hasEvents 
          ? "from-emerald-500 to-teal-600" 
          : "from-gray-300 to-gray-400"
      )} />

      {/* Content */}
      <div className="relative z-10 p-3 md:p-8 pl-3 md:pl-7">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-4">
          <div className={cn(
            "w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md",
            hasEvents 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
              : "bg-gradient-to-br from-gray-400 to-gray-500"
          )}>
            <Calendar className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-2xl font-bold text-gray-900">
              Upcoming Events
            </h2>
            <p className="text-[11px] md:text-sm text-gray-500">
              {hasEvents 
                ? `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} scheduled`
                : "No upcoming events"
              }
            </p>
          </div>
          {/* Today's date pill - styled like sync button */}
          <div className={cn(
            "h-9 rounded-full font-semibold px-4 flex items-center gap-1.5 text-[11px] md:text-xs shrink-0",
            "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600",
            "shadow-md shadow-emerald-500/25",
            "text-white"
          )}>
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {(() => {
                const todayBS = getCurrentBSDate();
                const todayAD = format(new Date(), 'MMM d');
                return `${nepaliMonthsEnglish[todayBS.month - 1]} ${todayBS.day} / ${todayAD}`;
              })()}
            </span>
          </div>
        </div>

        {/* Events List - Scrollable with fixed height container */}
        {hasEvents ? (
          <div className="max-h-[180px] md:max-h-[400px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-2">
              {upcomingEvents.slice(0, 30).map((event, idx) => {
                  const clientId = event.client.registeredDateTimeAD || event.client.originalRowNumber;
                  const isToday = event.daysUntil === 0;
                  const isTomorrow = event.daysUntil === 1;
                  const isUrgent = event.daysUntil <= 3;
                  
                  // Get event details from bulk fetch
                  const clientDetails = eventDetailsMap[event.client.registeredDateTimeAD || ''] || [];
                  const eventDetail = clientDetails.find(d => d.eventIndex === event.eventIndex);
                  
                  const venueDisplay = eventDetail ? formatVenueDisplay(
                    eventDetail.venueName, 
                    eventDetail.venueArea, 
                    eventDetail.venueCity
                  ) : '';
                  const venueTime = eventDetail ? formatTimeRange(
                    eventDetail.eventStartTime, 
                    eventDetail.eventEndTime
                  ) : '';
                  const parlourDisplay = eventDetail ? formatVenueDisplay(
                    eventDetail.parlourName, 
                    eventDetail.parlourArea, 
                    eventDetail.parlourCity
                  ) : '';
                  const parlourTime = eventDetail ? formatTimeRange(
                    eventDetail.parlourStartTime, 
                    eventDetail.parlourEndTime
                  ) : '';
                  
                  const hasVenue = Boolean(venueDisplay);
                  const hasParlour = Boolean(parlourDisplay);
                  const hasDetails = hasVenue || hasParlour;
                  
                  // Get event name from eventDetail if available, fallback to parsed event name
                  const displayEventName = eventDetail?.eventName || event.eventName;
                  
                  // Get demands and references
                  const eventDemand = eventDetail?.eventDemand || '';
                  const eventReferences = eventDetail?.eventReferences || '';
                  const hasExpandableContent = Boolean(eventDemand || eventReferences);
                  
                  // Match crew assignments for this event
                  const matchedCrew = crewAssignments.find(a => {
                    const nameMatch = a.event?.trim().toLowerCase() === (eventDetail?.eventName || event.eventName)?.trim().toLowerCase();
                    const monthMatch = String(a.eventMonth)?.trim() === String(event.client.eventMonth?.split('\n')[event.eventIndex])?.trim();
                    const dayMatch = String(a.eventDay)?.trim() === String(event.client.eventDay?.split('\n')[event.eventIndex])?.trim();
                    return nameMatch && monthMatch && dayMatch;
                  });
                  const assignedRoles = matchedCrew
                    ? CREW_ROLE_CONFIG.filter(r => matchedCrew[r.field] && String(matchedCrew[r.field]).trim())
                    : [];
                  
                  // Parse comments
                  const parsedComments = parseComments(event.client.comments);
                  const lastComment = parsedComments.length > 0 ? parsedComments[parsedComments.length - 1] : null;
                  
                  const cardKey = `${event.client.clientName}-${event.dateStr}-${idx}`;
                  const isExpanded = expandedCards[cardKey] || false;
                  
                  return (
                    <Collapsible
                      key={cardKey}
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedCards(prev => ({ ...prev, [cardKey]: open }))}
                    >
                      <div 
                        className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300 transition-all group"
                      >
                        {/* Header row with contact icons */}
                        <div className="flex items-start gap-2">
                          {/* Day badge */}
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            {isToday ? (
                              <>
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-medium text-white uppercase tracking-wide px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm">
                                  TODAY
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full",
                                  isTomorrow 
                                    ? "bg-amber-100 text-amber-700"
                                    : isUrgent
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-gray-100 text-gray-600"
                                )}>
                                  {formatDaysUntil(event.daysUntil)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Client name, event, and date - clickable link */}
                          <Link 
                            to={`/client-tracker/client/${encodeURIComponent(clientId)}`}
                            className="flex-1 min-w-0"
                          >
                            <p className="text-gray-900 font-semibold truncate group-hover:text-emerald-700 transition-colors">
                              {event.client.clientName}
                            </p>
                            <p className="text-sm font-medium text-emerald-600 truncate">
                              {displayEventName}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {(() => {
                                // BS date
                                const months = event.client.eventMonth?.split('\n') || [];
                                const days = event.client.eventDay?.split('\n') || [];
                                const years = event.client.eventYear?.split('\n') || [];
                                const m = months[event.eventIndex] || months[0] || '';
                                const d = days[event.eventIndex] || days[0] || '';
                                const y = years[event.eventIndex] || years[0] || '';
                                const monthName = m ? (nepaliMonthsEnglish[parseInt(m) - 1] || m) : '';
                                const bsPart = monthName && d ? `${monthName} ${d}` : '';
                                // AD date
                                const adDate = event.eventDate;
                                const adPart = format(adDate, 'MMM d, yyyy');
                                return bsPart ? `${bsPart}, ${y} / ${adPart}` : adPart;
                              })()}
                            </p>
                          </Link>
                          
                          {/* Contact icons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {event.client.contactNo && (
                              <a 
                                href={`tel:${event.client.contactNo}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition-colors"
                                title={`Call ${event.client.contactNo}`}
                              >
                                <Phone className="w-3 h-3" />
                                <span className="hidden sm:inline">...{event.client.contactNo.slice(-4)}</span>
                              </a>
                            )}
                            {event.client.whatsappNo && (
                              <a 
                                href={`https://wa.me/${event.client.whatsappNo.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-600 text-xs transition-colors"
                                title={`WhatsApp ${event.client.whatsappNo}`}
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">...{event.client.whatsappNo.slice(-4)}</span>
                              </a>
                            )}
                          </div>
                          
                          {/* Arrow link */}
                          <Link 
                            to={`/client-tracker/client/${encodeURIComponent(clientId)}`}
                            className="shrink-0"
                          >
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                          </Link>
                        </div>
                        
                        {/* Event Details - Venue & Parlour */}
                        {hasDetails && (
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
                            {/* Venue */}
                            <div className="flex items-start gap-2 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                {hasVenue ? (
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <span className="text-gray-700 font-medium">{venueDisplay}</span>
                                    {eventDetail?.venueMap && (
                                      <a
                                        href={eventDetail.venueMap}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
                                        title="Open in Google Maps"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                    {venueTime && (
                                      <>
                                        <span className="text-gray-500">• {venueTime}</span>
                                        {(() => {
                                          const remaining = getRemainingTime(event.dateStr, eventDetail?.eventStartTime || '');
                                          return remaining ? (
                                            <span className="text-amber-600 font-medium">({remaining})</span>
                                          ) : null;
                                        })()}
                                      </>
                                    )}
                                    {eventDetail?.guestCount && (
                                      <span className="text-gray-400">({eventDetail.guestCount} guests)</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Venue not set</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Parlour */}
                            <div className="flex items-start gap-2 text-xs">
                              <Scissors className="w-3.5 h-3.5 text-pink-500 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                {hasParlour ? (
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <span className="text-gray-700 font-medium">{parlourDisplay}</span>
                                    {eventDetail?.parlourMap && (
                                      <a
                                        href={eventDetail.parlourMap}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
                                        title="Open in Google Maps"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                    {parlourTime && (
                                      <>
                                        <span className="text-gray-500">• {parlourTime}</span>
                                        {(() => {
                                          const remaining = getRemainingTime(event.dateStr, eventDetail?.parlourStartTime || '');
                                          return remaining ? (
                                            <span className="text-amber-600 font-medium">({remaining})</span>
                                          ) : null;
                                        })()}
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Parlour not set</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Assigned Crew */}
                        {assignedRoles.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="w-3 h-3 text-violet-500" />
                              <span className="text-[10px] font-semibold text-gray-500 uppercase">Crew</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {assignedRoles.map(role => (
                                <span key={role.field} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", role.color)}>
                                  {role.label}: {String(matchedCrew![role.field]).split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Loading indicator for details */}
                        {isLoadingDetails && !hasDetails && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                          </div>
                        )}
                        
                        {/* Expanded content - Demands & References */}
                        <CollapsibleContent>
                          {hasExpandableContent && (
                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                              {/* Demands */}
                              {eventDemand && (
                                <div className="flex items-start gap-2 text-xs">
                                  <FileText className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-500 font-medium mb-0.5">Demands</p>
                                    <p className="text-gray-700">{eventDemand}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* References */}
                              {eventReferences && (
                                <div className="flex items-start gap-2 text-xs">
                                  <Image className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-500 font-medium mb-0.5">References</p>
                                    <div className="flex flex-wrap gap-2">
                                      {parseReferences(eventReferences).map((url, refIdx) => (
                                        <a
                                          key={refIdx}
                                          href={url.startsWith('http') ? url : `https://${url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition-colors"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Reference {refIdx + 1}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CollapsibleContent>
                        
                        {/* Comment section + Expand button */}
                        {(() => {
                          const clientIdForComments = event.client.registeredDateTimeAD || `${event.client.clientName}-${event.client.bookedRowNumber}`;
                          const localComment = localComments[clientIdForComments];
                          const displayComment = localComment || (lastComment?.text);
                          
                          return (
                            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                              {/* Expand/Collapse button */}
                              {hasExpandableContent && (
                                <CollapsibleTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors shrink-0"
                                    title={isExpanded ? "Collapse" : "Expand to see demands & references"}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </CollapsibleTrigger>
                              )}
                              
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {displayComment ? (
                                <span className="text-xs text-gray-600 truncate flex-1">
                                  "{displayComment.length > 50 ? displayComment.slice(0, 50) + '...' : displayComment}"
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic flex-1">No comments</span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openCommentDrawer(
                                    event.client.clientName,
                                    clientIdForComments,
                                    event.client.bookedRowNumber,
                                    event.client.comments || '',
                                    event.client.registeredDateTimeAD || ''
                                  );
                                }}
                                className="p-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors shrink-0"
                                title="Add comment"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </Collapsible>
                  );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-gray-500 text-sm">
              All caught up! No upcoming events scheduled. Check the Booked Clients module to add new events.
            </p>
          </div>
        )}
      </div>
      
      {/* Comment Drawer */}
      <Drawer open={commentDrawerOpen} onOpenChange={setCommentDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Comment</DrawerTitle>
            {selectedEventForComment && (
              <p className="text-sm text-muted-foreground">
                For {selectedEventForComment.clientName}
              </p>
            )}
          </DrawerHeader>
          <div className="px-4 pb-4">
            <Input
              placeholder="Type your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              autoFocus
            />
          </div>
          <DrawerFooter>
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim() || isAddingComment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isAddingComment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Comment'
              )}
            </Button>
            <Button variant="outline" onClick={() => setCommentDrawerOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
