import { useMemo, useEffect, useRef } from "react";
import { useCachedData } from "./useCachedData";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { updateClientFieldInCache } from "@/lib/clients-supabase-cache";

// Terminal statuses that should auto-reset star priority to 0
// Note: 'BOOKED SOMEWHERE ELSE' must be checked before 'BOOKED'
const STAR_INELIGIBLE_STATUSES = [
  'BOOKED SOMEWHERE ELSE',
  'CANCELLED BY CLIENT',
  'CANCELLED BY US',
  'POSTPONED',
  'LOST',
  'BOOKED',
];

function isIneligibleStatus(status: string): boolean {
  // Check longer matches first to avoid 'BOOKED' matching 'BOOKED SOMEWHERE ELSE'
  return STAR_INELIGIBLE_STATUSES.some(s => status.includes(s));
}

export function useHandlerStarClients(handlerName: string) {
  const { clients, isLoading } = useCachedData();
  const resetDone = useRef<Set<string>>(new Set());
  
  // Auto-reset priority for clients that reached terminal statuses
  useEffect(() => {
    if (isLoading || !clients.length) return;
    
    clients.forEach(c => {
      const priority = parseInt(c.priority || '0');
      if (priority <= 0) return;
      if (resetDone.current.has(c.registeredDateTimeAD)) return;
      
      const status = getCurrentStatus(c.statusLog || '').toUpperCase().trim();
      
      if (isIneligibleStatus(status)) {
        resetDone.current.add(c.registeredDateTimeAD);
        updateClientFieldInCache(c.registeredDateTimeAD, 'priority', '0').catch(() => {});
      }
    });
  }, [clients, isLoading]);
  
  const starClients = useMemo(() => {
    return clients
      .filter(c => {
        const handler = c.clientHandler?.toLowerCase().trim();
        const priority = parseInt(c.priority || '0');
        const status = getCurrentStatus(c.statusLog || '').toUpperCase().trim();
        
        return handler === handlerName.toLowerCase().trim() 
          && priority > 0
          && !isIneligibleStatus(status);
      })
      .sort((a, b) => parseInt(b.priority || '0') - parseInt(a.priority || '0'));
  }, [clients, handlerName]);
  
  return { starClients, isLoading };
}
