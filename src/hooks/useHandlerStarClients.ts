import { useMemo } from "react";
import { useCachedData } from "./useCachedData";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";

export function useHandlerStarClients(handlerName: string) {
  const { clients, isLoading } = useCachedData();
  
  const starClients = useMemo(() => {
    return clients
      .filter(c => {
        const handler = c.clientHandler?.toLowerCase().trim();
        const priority = parseInt(c.priority || '0');
        const status = getCurrentStatus(c.statusLog || '');
        const upperStatus = status.toUpperCase();
        
        // Only include clients with priority set and not cancelled/lost
        return handler === handlerName.toLowerCase().trim() 
          && priority > 0
          && !upperStatus.includes('CANCELLED')
          && !upperStatus.includes('BOOKED SOMEWHERE');
      })
      .sort((a, b) => {
        // Sort by priority descending (5 star first)
        return parseInt(b.priority || '0') - parseInt(a.priority || '0');
      })
      .slice(0, 10); // Limit to top 10
  }, [clients, handlerName]);
  
  return { starClients, isLoading };
}
