import { Phone, MessageCircle, Calendar, MapPin, AlertTriangle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookedClientData } from "@/lib/sheets-api";
import { getMonthName } from "@/lib/nepali-months";
import NepaliDate from "nepali-date-converter";

interface EventClientCardProps {
  client: BookedClientData;
}

const EventClientCard = ({ client }: EventClientCardProps) => {
  const navigate = useNavigate();

  // Calculate days until event
  const getDaysUntilEvent = (): number | null => {
    let eventDate: Date | null = null;
    
    if (client.eventDateAD) {
      const parsed = new Date(client.eventDateAD);
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed;
      }
    }
    
    if (!eventDate && client.eventYear && client.eventMonth && client.eventDay) {
      try {
        const bsYear = parseInt(client.eventYear);
        const bsMonth = parseInt(client.eventMonth);
        const bsDay = parseInt(client.eventDay);
        
        if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay) && !client.eventDay.includes('*')) {
          const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
          const adDate = nepaliDate.toJsDate();
          if (adDate && !isNaN(adDate.getTime())) {
            eventDate = adDate;
          }
        }
      } catch (error) {
        console.error('Error converting Nepali date:', error);
      }
    }
    
    if (!eventDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = getDaysUntilEvent();

  // Check if date is missing or unknown
  const hasMissingDate = !client.eventYear || !client.eventMonth || !client.eventDay || client.eventDay.includes('*');

  // Format Nepali event date
  const formatNepaliEventDate = (): string => {
    if (!client.eventYear || !client.eventMonth || !client.eventDay) return 'Date TBD';
    const monthName = getMonthName(client.eventMonth);
    const dayDisplay = client.eventDay.includes('*') ? '**' : client.eventDay;
    return `${client.eventYear} ${monthName} ${dayDisplay}`;
  };

  // Parse events into array
  const eventsList = client.events?.split('\n').filter(Boolean) || [];

  // Get countdown style based on days remaining
  const getCountdownStyle = () => {
    if (days === null) return { bg: "bg-slate-700", text: "text-slate-400" };
    if (days <= 7) return { bg: "bg-red-500 animate-pulse", text: "text-white" };
    if (days <= 30) return { bg: "bg-orange-500", text: "text-white" };
    if (days <= 60) return { bg: "bg-amber-500", text: "text-black" };
    return { bg: "bg-green-500/20 border border-green-500/50", text: "text-green-400" };
  };

  const countdownStyle = getCountdownStyle();

  const handleCall = () => {
    if (client.contactNo) {
      window.open(`tel:${client.contactNo}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (client.whatsappNo) {
      const cleanNumber = client.whatsappNo.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  return (
    <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/30 transition-all">
      <CardContent className="p-4">
        {/* Header with countdown */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <button 
              onClick={() => navigate(`/client-tracker/client/${client.originalRowNumber}`)}
              className="font-semibold text-white truncate hover:text-blue-400 transition-colors cursor-pointer text-left w-full"
            >
              {client.clientName}
            </button>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{client.eventLocation || client.eventCity}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {hasMissingDate && (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Date!
              </Badge>
            )}
            <Badge className={`${countdownStyle.bg} ${countdownStyle.text}`}>
              {days === null 
                ? "TBD" 
                : days <= 0 
                  ? (days === 0 ? "TODAY!" : `${Math.abs(days)}d ago`) 
                  : `${days}d left`}
            </Badge>
          </div>
        </div>

        {/* Event Date in Nepali format */}
        <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span className="font-medium">{formatNepaliEventDate()}</span>
        </div>

        {/* Events list */}
        {eventsList.length > 0 && (
          <div className="mb-3 space-y-1">
            {eventsList.map((event, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className="text-xs border-slate-600 text-slate-300 mr-1"
              >
                {event}
              </Badge>
            ))}
          </div>
        )}

        {/* Handler */}
        {client.clientHandler && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <User className="h-3 w-3" />
            <span>Handled by {client.clientHandler}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventClientCard;
