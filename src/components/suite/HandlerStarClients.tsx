import { Star, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { useHandlerStarClients } from "@/hooks/useHandlerStarClients";
import { useNavigate } from "react-router-dom";
import { getClientDetailPath } from "@/lib/client-navigation";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";

interface HandlerStarClientsProps {
  handlerName: string;
  colorScheme: 'violet' | 'emerald' | 'blue';
}

interface ClientStarCardProps {
  client: ClientData;
  onClick: () => void;
}

function ClientStarCard({ client, onClick }: ClientStarCardProps) {
  const status = getCurrentStatus(client.statusLog || '');
  const priority = parseInt(client.priority || '0');
  
  return (
    <div 
      onClick={onClick}
      className="p-2 bg-white rounded-lg border border-amber-100 cursor-pointer 
                 hover:border-amber-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-800 truncate">
              {client.clientName}
            </p>
            <StarRating value={priority} readonly size="sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Calendar className="w-3 h-3" />
            <span>{client.eventMonth} {client.eventYear}</span>
          </div>
        </div>
        <Badge className="text-[10px] bg-gray-100 text-gray-600 shrink-0 hover:bg-gray-100">
          {status}
        </Badge>
      </div>
    </div>
  );
}

export function HandlerStarClients({ handlerName, colorScheme }: HandlerStarClientsProps) {
  const { starClients, isLoading } = useHandlerStarClients(handlerName);
  const navigate = useNavigate();
  
  // Don't render if loading or no star clients
  if (isLoading) return null;
  if (starClients.length === 0) return null;
  
  return (
    <Card className="mt-2 border-amber-200 bg-amber-50/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            {handlerName}'s Star Clients
          </h4>
          <Badge className="text-[9px] bg-amber-100 text-amber-700 ml-auto hover:bg-amber-100">
            {starClients.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {starClients.map(client => (
            <ClientStarCard 
              key={client.registeredDateTimeAD || client.rowNumber} 
              client={client} 
              onClick={() => navigate(getClientDetailPath(client))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
