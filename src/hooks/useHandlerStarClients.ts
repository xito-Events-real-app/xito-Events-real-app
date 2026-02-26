import { useMemo, useEffect, useRef } from "react";
import { useCachedData } from "./useCachedData";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { updateClientFieldInCache } from "@/lib/clients-supabase-cache";

const STAR_ELIGIBLE_STATUSES = [
  'JUST ENQUIRED',
  'FOLLOW UP',
  'QUOTATION SENT',
  'BARGAINING IS ON',
  'ADVANCE PENDING',
];

export function useHandlerStarClients(handlerName: string) {
  const { clients, isLoading } = useCachedData();
  const resetDone = useRef<Set<string>>(new Set());
  
  // Auto-reset priority for clients no longer in early pipeline
  useEffect(() => {
    if (isLoading || !clients.length) return;
    
    clients.forEach(c => {
      const priority = parseInt(c.priority || '0');
      if (priority <= 0) return;
      if (resetDone.current.has(c.registeredDateTimeAD)) return;
      
      const status = getCurrentStatus(c.statusLog || '').toUpperCase().trim();
      const isEligible = STAR_ELIGIBLE_STATUSES.some(s => status.includes(s));
      
      if (!isEligible) {
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
        
        const isEligible = STAR_ELIGIBLE_STATUSES.some(s => status.includes(s));
        
        return handler === handlerName.toLowerCase().trim() 
          && priority > 0
          && isEligible;
      })
      .sort((a, b) => parseInt(b.priority || '0') - parseInt(a.priority || '0'));
  }, [clients, handlerName]);
  
  return { starClients, isLoading };
}
