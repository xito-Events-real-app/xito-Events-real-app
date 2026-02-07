import { useMemo, useState, useEffect } from "react";
import { Search, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCachedData } from "@/hooks/useCachedData";
import { getCurrentStatus } from "@/lib/sheets-api";
import { getStatusConfig, normalizeStatus, STATUS_ORDER } from "@/lib/status-config";
import { parseEventDetails, NEPALI_MONTHS } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";

// Reverse lookup: name -> month number
const MONTH_NAME_TO_NUMBER: Record<string, number> = {};
Object.entries(NEPALI_MONTHS).forEach(([num, name]) => {
  MONTH_NAME_TO_NUMBER[name.toUpperCase()] = parseInt(num);
});

// Priority order for Xito Search status grouping
const XITO_STATUS_PRIORITY = [
  'BOOKED',
  'BARGAINING IS ON',
  'ADVANCE PENDING',
  'QUOTATION SENT : REVIEW PENDING',
  'CALLED : QUOTATION PENDING',
  ...STATUS_ORDER.filter(s => 
    !['BOOKED', 'BARGAINING IS ON', 'ADVANCE PENDING', 'QUOTATION SENT : REVIEW PENDING', 'CALLED : QUOTATION PENDING'].includes(s)
  ),
];

interface ExtractedDate {
  monthName: string;
  monthNumber: number;
  day?: string;
}

interface MatchedEvent {
  clientName: string;
  eventName: string;
  status: string;
  normalizedStatus: string;
}

interface DateGroup {
  monthName: string;
  day?: string;
  events: MatchedEvent[];
}

// Extract Nepali date references from text
function extractDatesFromText(text: string): ExtractedDate[] {
  if (!text?.trim()) return [];

  const monthNames = Object.keys(MONTH_NAME_TO_NUMBER);
  const pattern = new RegExp(
    `\\b(${monthNames.join('|')})\\s*(?:(\\d{1,2}))?\\b`,
    'gi'
  );

  const dates: ExtractedDate[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const monthName = match[1].toUpperCase();
    const day = match[2] || undefined;
    const key = `${monthName}-${day || 'ALL'}`;
    
    if (!seen.has(key) && MONTH_NAME_TO_NUMBER[monthName]) {
      seen.add(key);
      dates.push({
        monthName,
        monthNumber: MONTH_NAME_TO_NUMBER[monthName],
        day,
      });
    }
  }

  return dates;
}

// Sort events by status priority
function sortByStatusPriority(events: MatchedEvent[]): Map<string, MatchedEvent[]> {
  const grouped = new Map<string, MatchedEvent[]>();

  events.forEach(event => {
    const key = event.normalizedStatus;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  });

  // Sort by priority
  const sorted = new Map<string, MatchedEvent[]>();
  XITO_STATUS_PRIORITY.forEach(status => {
    if (grouped.has(status)) {
      sorted.set(status, grouped.get(status)!);
      grouped.delete(status);
    }
  });
  // Add remaining
  grouped.forEach((events, status) => sorted.set(status, events));

  return sorted;
}

interface XitoSearchPanelProps {
  noteContent: string;
  className?: string;
}

export function XitoSearchPanel({ noteContent, className }: XitoSearchPanelProps) {
  const { clients } = useCachedData();
  const [debouncedContent, setDebouncedContent] = useState(noteContent);

  // Debounce content changes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(noteContent), 300);
    return () => clearTimeout(timer);
  }, [noteContent]);

  const results = useMemo<DateGroup[]>(() => {
    const extractedDates = extractDatesFromText(debouncedContent);
    if (extractedDates.length === 0 || clients.length === 0) return [];

    const groups: DateGroup[] = [];

    extractedDates.forEach(({ monthName, monthNumber, day }) => {
      const matchedEvents: MatchedEvent[] = [];

      clients.forEach(client => {
        const status = getCurrentStatus(client.statusLog || '').toUpperCase();
        const events = parseEventDetails(
          client.events || '',
          client.eventYear || '',
          client.eventMonth || '',
          client.eventDay || ''
        );

        events.forEach(event => {
          const eventMonthNum = parseInt(event.month);
          if (eventMonthNum !== monthNumber) return;

          // If day specified, match exactly
          if (day && event.day !== day) return;

          matchedEvents.push({
            clientName: client.clientName || 'Unknown',
            eventName: event.eventName || 'Event',
            status,
            normalizedStatus: normalizeStatus(status),
          });
        });
      });

      if (matchedEvents.length > 0) {
        groups.push({
          monthName,
          day,
          events: matchedEvents,
        });
      }
    });

    return groups;
  }, [debouncedContent, clients]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <Search className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-bold text-gray-800">Xito Search</h3>
      </div>

      <ScrollArea className="flex-1">
        {results.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">
              Type Nepali dates like "Magh 15" or "Falgun 3" in your note to see matching events
            </p>
          </div>
        ) : (
          <div className="space-y-4 pr-1">
            {results.map((group, gIdx) => {
              const statusGroups = sortByStatusPriority(group.events);

              return (
                <div key={gIdx} className="space-y-2">
                  {/* Date Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {group.monthName} {group.day || '(all)'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Status Groups */}
                  {Array.from(statusGroups.entries()).map(([status, events]) => {
                    const config = getStatusConfig(status);
                    return (
                      <div key={status} className="ml-1">
                        {/* Status Tag */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white",
                              config.color
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                        {/* Events under this status */}
                        <div className="ml-3 space-y-0.5">
                          {events.map((event, eIdx) => (
                            <div key={eIdx} className="flex items-center gap-1.5 text-xs text-gray-700">
                              <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                              <span className="font-medium">{event.eventName}</span>
                              <span className="text-gray-400">—</span>
                              <span className="text-gray-600 truncate">{event.clientName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
