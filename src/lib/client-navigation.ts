/**
 * Client Navigation Utilities
 * 
 * Provides consistent client ID resolution for navigation across all modules.
 * Uses a priority order: originalRowNumber > rowNumber > encoded registeredDateTimeAD
 */

import { ClientData, BookedClientData } from "./sheets-api";

/**
 * Get a safe navigation ID for a client.
 * Priority: originalRowNumber > rowNumber > encoded registeredDateTimeAD
 */
export function getClientNavigationId(
  client: ClientData | BookedClientData | { 
    originalRowNumber?: number; 
    rowNumber?: number; 
    registeredDateTimeAD?: string;
  }
): string {
  // Priority 1: Use originalRowNumber if available (most reliable for booked clients)
  if ('originalRowNumber' in client && client.originalRowNumber) {
    return String(client.originalRowNumber);
  }
  
  // Priority 2: Use rowNumber if available (for regular clients)
  if ('rowNumber' in client && client.rowNumber) {
    return String(client.rowNumber);
  }
  
  // Priority 3: Fallback to encoded registeredDateTimeAD
  if (client.registeredDateTimeAD) {
    // Use encodeURIComponent to safely encode the datetime string
    return encodeURIComponent(client.registeredDateTimeAD);
  }
  
  // Last resort: return empty string (should not happen in practice)
  console.warn('Client has no valid navigation ID:', client);
  return '';
}

/**
 * Navigate to a client's detail page
 */
export function getClientDetailPath(
  client: ClientData | BookedClientData | { 
    originalRowNumber?: number; 
    rowNumber?: number; 
    registeredDateTimeAD?: string;
  }
): string {
  const clientId = getClientNavigationId(client);
  if (!clientId) {
    console.warn('Cannot navigate to client without valid ID');
    return '/client-tracker';
  }
  return `/client-tracker/client/${clientId}`;
}
