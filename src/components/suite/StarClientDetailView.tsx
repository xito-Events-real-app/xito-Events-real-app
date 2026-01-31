import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHandlerStarClients } from "@/hooks/useHandlerStarClients";
import { getCurrentStatus } from "@/lib/sheets-api";
import { getClientDetailPath } from "@/lib/client-navigation";
import { Star, X, Phone, MessageCircle, Mail, MapPin, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarClientDetailViewProps {
  handlerName: string;
  onClose: () => void;
}

export function StarClientDetailView({ handlerName, onClose }: StarClientDetailViewProps) {
  const { starClients, isLoading } = useHandlerStarClients(handlerName);
  const navigate = useNavigate();

  const handleViewDetails = (client: typeof starClients[0]) => {
    navigate(getClientDetailPath(client));
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading star clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{handlerName}'s Star Clients</h2>
            <p className="text-sm text-gray-500">{starClients.length} priority clients</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Star Client Cards */}
      {starClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No star clients found</p>
          <p className="text-sm text-gray-400">Add priority to clients to see them here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {starClients.map((client) => {
            const currentStatus = getCurrentStatus(client.statusLog || '');
            const priority = parseInt(client.priority || '0');
            const firstEvent = client.events?.split('\n')[0] || 'No event';

            return (
              <Card 
                key={client.registeredDateTimeAD || client.rowNumber}
                className={cn(
                  "border-amber-200 hover:border-amber-300 transition-all hover:shadow-md",
                  "bg-gradient-to-br from-white to-amber-50/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: Client Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + Rating + Status */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-900">{client.clientName}</h3>
                        <StarRating value={priority} readonly size="md" />
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            currentStatus.toUpperCase().includes('BOOKED') 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : currentStatus.toUpperCase().includes('QUOTATION')
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          )}
                        >
                          {currentStatus || 'New'}
                        </Badge>
                      </div>

                      {/* Contact Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                        {client.contactNo && (
                          <button 
                            onClick={() => handleCall(client.contactNo!)}
                            className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {client.contactNo}
                          </button>
                        )}
                        {client.whatsappNo && (
                          <button 
                            onClick={() => handleWhatsApp(client.whatsappNo!)}
                            className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {client.whatsappNo}
                          </button>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[180px]">{client.email}</span>
                          </span>
                        )}
                        {client.eventCity && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {client.eventCity}
                          </span>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="bg-gray-100/80 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          {firstEvent}
                        </div>
                        {(client.eventMonth || client.eventYear) && (
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            {client.eventMonth} {client.eventYear}
                          </p>
                        )}
                      </div>

                      {/* Description/Notes */}
                      {client.description && (
                        <p className="text-sm text-gray-600 mt-3 italic line-clamp-2">
                          "{client.description}"
                        </p>
                      )}
                    </div>

                    {/* Right: View Details Button */}
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(client)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md gap-1"
                      >
                        View
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
