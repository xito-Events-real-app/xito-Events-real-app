import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { DesktopAppLayout } from "@/components/desktop/DesktopAppLayout";
import { useCachedData } from "@/hooks/useCachedData";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { getCurrentStatus } from "@/lib/sheets-api";
import { parseEventDetails } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import {
  Flame,
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const ENQUIRY_ON_STATUSES = [
  'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
  'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
];

const GONE_ELSEWHERE_STATUSES = [
  'CANCELLED BY CLIENT', 'CANCELLED BY US', 'BOOKED SOMEWHERE ELSE'
];

interface HotDateInfo {
  dateKey: string;
  year: string;
  month: string;
  monthName: string;
  day: string;
  booked: { clientName: string; eventName: string }[];
  enquiryOn: { clientName: string; eventName: string }[];
  goneElsewhere: { clientName: string; eventName: string }[];
  totalCount: number;
}

export default function HotDates() {
  const { clients, isLoading } = useCachedData();
  const { isDesktopMode } = useDesktopMode();

  // Calculate all hot dates
  const hotDates = useMemo(() => {
    const dateGroups: Record<string, Omit<HotDateInfo, 'totalCount'>> = {};

    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      events.forEach(event => {
        if (!event.year || !event.month || !event.day) return;
        
        const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
        
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            dateKey,
            year: event.year,
            month: event.month,
            monthName: event.monthName,
            day: event.day,
            booked: [],
            enquiryOn: [],
            goneElsewhere: []
          };
        }

        const entry = { clientName: client.clientName || 'Unknown', eventName: event.eventName || 'Event' };

        if (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE')) {
          dateGroups[dateKey].booked.push(entry);
        } else if (GONE_ELSEWHERE_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].goneElsewhere.push(entry);
        } else if (ENQUIRY_ON_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].enquiryOn.push(entry);
        }
      });
    });

    return Object.values(dateGroups)
      .map(d => ({
        ...d,
        totalCount: d.booked.length + d.enquiryOn.length + d.goneElsewhere.length
      }))
      .filter(d => d.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [clients]);

  // Summary stats
  const totalBooked = hotDates.reduce((sum, d) => sum + d.booked.length, 0);
  const totalEnquiry = hotDates.reduce((sum, d) => sum + d.enquiryOn.length, 0);
  const totalGone = hotDates.reduce((sum, d) => sum + d.goneElsewhere.length, 0);

  const content = (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/client-tracker">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl md:text-2xl font-bold">Hot Dates</h1>
          </div>
          <Badge variant="outline">{hotDates.length} dates</Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalBooked}</p>
              <p className="text-sm text-muted-foreground">Booked Events</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{totalEnquiry}</p>
              <p className="text-sm text-muted-foreground">Enquiry On</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-500/30 bg-gray-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{totalGone}</p>
              <p className="text-sm text-muted-foreground">Gone Elsewhere</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Hot Dates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : hotDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No event dates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {hotDates.map((dateInfo, index) => (
            <Card 
              key={dateInfo.dateKey}
              className={cn(
                "hover:border-primary/30 transition-colors",
                index < 3 && "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {index < 3 && <Flame className="w-4 h-4 text-orange-500" />}
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                      {dateInfo.monthName} {dateInfo.day}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{dateInfo.year}</span>
                  </div>
                  <span className="text-xl font-bold">{dateInfo.totalCount}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* BOOKED */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white text-xs">BOOKED</Badge>
                    <span className="font-semibold text-green-600">{dateInfo.booked.length}</span>
                  </div>
                  <ScrollArea className={dateInfo.booked.length > 3 ? "h-20" : ""}>
                    <div className="space-y-1">
                      {dateInfo.booked.map((c, i) => (
                        <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-green-500">
                          <span className="font-medium text-foreground">{c.eventName}</span>
                          <span className="text-muted-foreground"> • {c.clientName}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* ENQUIRY ON */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-white text-xs">ENQUIRY</Badge>
                    <span className="font-semibold text-amber-600">{dateInfo.enquiryOn.length}</span>
                  </div>
                  <ScrollArea className={dateInfo.enquiryOn.length > 3 ? "h-20" : ""}>
                    <div className="space-y-1">
                      {dateInfo.enquiryOn.map((c, i) => (
                        <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-amber-500">
                          <span className="font-medium text-foreground">{c.eventName}</span>
                          <span className="text-muted-foreground"> • {c.clientName}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* GONE ELSEWHERE */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-500 text-white text-xs">GONE</Badge>
                    <span className="font-semibold text-gray-600">{dateInfo.goneElsewhere.length}</span>
                  </div>
                  <ScrollArea className={dateInfo.goneElsewhere.length > 3 ? "h-20" : ""}>
                    <div className="space-y-1">
                      {dateInfo.goneElsewhere.map((c, i) => (
                        <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-gray-400">
                          <span className="font-medium text-foreground">{c.eventName}</span>
                          <span className="text-muted-foreground"> • {c.clientName}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isDesktopMode) {
    return <DesktopAppLayout>{content}</DesktopAppLayout>;
  }

  return <AppLayout>{content}</AppLayout>;
}
