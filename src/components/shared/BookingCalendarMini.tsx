import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCachedData } from "@/hooks/useCachedData";
import { useBulkEventDetails } from "@/hooks/useBulkEventDetails";
import { getCurrentStatus } from "@/lib/sheets-api";
import { parseEventDetails, NEPALI_MONTHS } from "@/lib/nepali-months";
import { CalendarDayPopup, CalendarClientInfo } from "@/components/shared/CalendarDayPopup";
import { cn } from "@/lib/utils";

interface BookingCalendarMiniProps {
  className?: string;
}

export function BookingCalendarMini({ className }: BookingCalendarMiniProps) {
  const { clients } = useCachedData();
  const [showAll, setShowAll] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Get booked client IDs for bulk event details
  const bookedClientIds = useMemo(
    () => clients
      .filter(c => {
        const status = getCurrentStatus(c.statusLog || '').toUpperCase();
        return (c as any)._source === 'booked' || (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE'));
      })
      .map(c => c.registeredDateTimeAD)
      .filter(Boolean) as string[],
    [clients]
  );
  const { eventDetailsMap } = useBulkEventDetails(bookedClientIds);

  const calendarData = useMemo(() => {
    const bookedMap = new Map<string, number>();
    const advancePendingMap = new Map<string, number>();
    const clientDetailsMap = new Map<string, CalendarClientInfo[]>();
    // Track unknown day (**) events per year-month
    const unknownDayMap = new Map<string, CalendarClientInfo[]>();

    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      events.forEach(event => {
        if (!event.year || !event.month) return;
        const isUnknownDay = !event.day || event.day === '**' || String(event.day).startsWith('**');
        const isBooked = (client as any)._source === 'booked' || (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE'));
        const isAdvancePending = !isBooked && status.includes('ADVANCE PENDING');

        if (isUnknownDay) {
          // Track unknown-day events per month
          if (isBooked || isAdvancePending) {
            const monthKey = `${event.year}-${event.month}`;
            if (!unknownDayMap.has(monthKey)) unknownDayMap.set(monthKey, []);
            const clientEventDetails = client.registeredDateTimeAD ? eventDetailsMap[client.registeredDateTimeAD] : undefined;
            const matchingDetail = clientEventDetails?.find(d => d.eventName === event.eventName);
            unknownDayMap.get(monthKey)!.push({
              clientName: client.clientName || 'Unknown',
              eventName: event.eventName || 'Event',
              registeredDateTimeAD: client.registeredDateTimeAD,
              originalRowNumber: client.rowNumber,
              contactNo: client.contactNo,
              whatsappNo: client.whatsappNo,
              eventLocation: client.eventLocation,
              eventCity: client.eventCity,
              venueName: matchingDetail?.venueName || '',
              venueArea: matchingDetail?.venueArea || '',
            });
          }
        } else {
          const dateKey = `${event.year}-${event.month}-${event.day}`;

          if (isBooked) {
            bookedMap.set(dateKey, (bookedMap.get(dateKey) || 0) + 1);

            if (!clientDetailsMap.has(dateKey)) clientDetailsMap.set(dateKey, []);
            const clientEventDetails = client.registeredDateTimeAD ? eventDetailsMap[client.registeredDateTimeAD] : undefined;
            const matchingDetail = clientEventDetails?.find(d => d.eventName === event.eventName);

            clientDetailsMap.get(dateKey)!.push({
              clientName: client.clientName || 'Unknown',
              eventName: event.eventName || 'Event',
              registeredDateTimeAD: client.registeredDateTimeAD,
              originalRowNumber: client.rowNumber,
              contactNo: client.contactNo,
              whatsappNo: client.whatsappNo,
              eventLocation: client.eventLocation,
              eventCity: client.eventCity,
              venueName: matchingDetail?.venueName || '',
              venueArea: matchingDetail?.venueArea || '',
            });
          } else if (isAdvancePending) {
            advancePendingMap.set(dateKey, (advancePendingMap.get(dateKey) || 0) + 1);
          }
        }
      });
    });

    const daysPerMonth: Record<number, number> = {
      1: 31, 2: 31, 3: 32, 4: 32, 5: 31, 6: 31,
      7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 30
    };

    const startMonth = 10;
    const startYear = 2082;

    const result: {
      month: number;
      year: number;
      monthName: string;
      days: { day: number; isBooked: boolean; eventCount: number; advancePendingCount: number; clients: CalendarClientInfo[] }[];
      bookedCount: number;
      unknownDayClients: CalendarClientInfo[];
    }[] = [];

    for (let i = 0; i < 12; i++) {
      const monthNum = ((startMonth - 1 + i) % 12) + 1;
      const yearNum = startYear + Math.floor((startMonth - 1 + i) / 12);
      const daysInMonth = daysPerMonth[monthNum] || 30;

      const days: typeof result[0]['days'] = [];
      let bookedCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${yearNum}-${monthNum}-${day}`;
        const eventCount = bookedMap.get(dateKey) || 0;
        const advancePendingCount = advancePendingMap.get(dateKey) || 0;
        const isBooked = eventCount > 0;
        if (isBooked) bookedCount++;
        days.push({ day, isBooked, eventCount, advancePendingCount, clients: clientDetailsMap.get(dateKey) || [] });
      }

      const monthKey = `${yearNum}-${monthNum}`;
      const unknownDayClients = unknownDayMap.get(monthKey) || [];

      result.push({ month: monthNum, year: yearNum, monthName: NEPALI_MONTHS[monthNum], days, bookedCount, unknownDayClients });
    }

    return result;
  }, [clients, eventDetailsMap]);

  const visibleMonths = showAll ? calendarData : calendarData.slice(0, 4);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <Calendar className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-gray-800">Booking Calendar</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-1">
          {visibleMonths.map((month) => (
            <div key={`${month.year}-${month.month}`} className="space-y-1">
              {/* Month header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">
                  {month.monthName} {month.year}
                </span>
                {month.bookedCount > 0 && (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {month.bookedCount} booked
                  </span>
                )}
              </div>

              {/* Day circles */}
              <div className="flex flex-wrap gap-[3px]">
                {month.days.map((dayInfo) => {
                  const dayKey = `${month.year}-${month.month}-${dayInfo.day}`;
                  const hasAdvancePending = dayInfo.advancePendingCount > 0;

                  return (
                    <div
                      key={dayInfo.day}
                      className="relative"
                      onMouseEnter={() => dayInfo.isBooked && setHoveredDay(dayKey)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium cursor-default transition-all",
                          dayInfo.isBooked
                            ? hasAdvancePending
                              ? "bg-emerald-500 text-white ring-2 ring-yellow-400 ring-offset-1"
                              : "bg-emerald-500 text-white"
                            : hasAdvancePending
                              ? "bg-yellow-200 text-yellow-800"
                              : "text-gray-400"
                        )}
                      >
                        {dayInfo.day}
                      </span>

                      {/* Popup on hover */}
                      {hoveredDay === dayKey && dayInfo.clients.length > 0 && (
                        <CalendarDayPopup
                          monthName={month.monthName}
                          day={dayInfo.day}
                          year={month.year}
                          clients={dayInfo.clients}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unknown day (**) events */}
              {month.unknownDayClients.length > 0 && (
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[9px] font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                    ** × {month.unknownDayClients.length}
                  </span>
                  <span className="text-[9px] text-gray-500 truncate">
                    {month.unknownDayClients.map(c => c.clientName).join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 h-7"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              View All 12 Months
            </>
          )}
        </Button>
      </ScrollArea>
    </div>
  );
}
