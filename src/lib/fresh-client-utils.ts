import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { normalizeStatus } from "@/lib/status-config";
import { isBSDatePast, bsToAD } from "@/lib/nepali-date";
import { parseEventDetails } from "@/lib/nepali-months";

// Early pipeline statuses eligible for LOST / ALMOST LOST classification
export const EARLY_PIPELINE = [
  'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED : NOT CALLED',
  'CALL NOT RECEIVED', 'CALLED : QUOTATION PENDING',
  'QUOTATION SENT : REVIEW PENDING', 'BARGAINING IS ON', 'ADVANCE PENDING'
];

// Check if a client has at least one past event date
export function hasAnyPastEventDate(client: ClientData): boolean {
  const years = (client.eventYear || '').split('\n');
  const months = (client.eventMonth || '').split('\n');
  const days = (client.eventDay || '').split('\n');
  const maxLen = Math.max(years.length, months.length, days.length);
  for (let i = 0; i < maxLen; i++) {
    const y = (years[i] || '').trim();
    const m = (months[i] || '').trim();
    const d = (days[i] || '').trim();
    if (!y || !m || !d || d.includes('*')) continue;
    if (isBSDatePast(y, m, d)) return true;
  }
  return false;
}

// Get days until the earliest future event date (returns null if no valid future dates)
export function getFirstEventDaysFromNow(client: ClientData): number | null {
  const years = (client.eventYear || '').split('\n');
  const months = (client.eventMonth || '').split('\n');
  const days = (client.eventDay || '').split('\n');
  const maxLen = Math.max(years.length, months.length, days.length);
  
  let minDays: number | null = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < maxLen; i++) {
    const y = (years[i] || '').trim();
    const m = (months[i] || '').trim();
    const d = (days[i] || '').trim();
    if (!y || !m || !d || d.includes('*')) continue;
    
    try {
      const adDate = bsToAD(parseInt(y), parseInt(m), parseInt(d));
      if (typeof adDate === 'string') continue; // Unknown day
      const eventDate = new Date(adDate);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate >= today) {
        const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (minDays === null || diffDays < minDays) {
          minDays = diffDays;
        }
      }
    } catch {
      continue;
    }
  }
  return minDays;
}

// Check if client qualifies as ALMOST LOST (earliest event < 30 days and not past)
export function isAlmostLost(client: ClientData): boolean {
  const status = normalizeStatus(getCurrentStatus(client.statusLog || ''));
  if (!EARLY_PIPELINE.includes(status)) return false;
  if (hasAnyPastEventDate(client)) return false; // Would be LOST instead
  
  const daysUntil = getFirstEventDaysFromNow(client);
  return daysUntil !== null && daysUntil <= 30;
}

// Get cold dates clients: clients on dates with enquiries but zero bookings
export function getColdDatesClients(allClients: ClientData[]): ClientData[] {
  const ENQUIRY_STATUSES_PARTIAL = [
    'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
    'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
  ];

  // Build date map: dateKey -> { bookedCount, enquiringClientIds }
  const dateMap: Record<string, { bookedCount: number; clientIds: Set<number | undefined> }> = {};

  allClients.forEach(client => {
    const status = getCurrentStatus(client.statusLog || '').toUpperCase();
    const parsedEvents = parseEventDetails(
      client.events || '',
      client.eventYear || '',
      client.eventMonth || '',
      client.eventDay || ''
    );

    parsedEvents.forEach(event => {
      if (!event.year || !event.month || !event.day) return;
      const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { bookedCount: 0, clientIds: new Set() };
      }

      if (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE')) {
        dateMap[dateKey].bookedCount++;
      }

      if (ENQUIRY_STATUSES_PARTIAL.some(s => status.includes(s))) {
        dateMap[dateKey].clientIds.add(client.rowNumber);
      }
    });
  });

  // Collect unique client IDs from cold dates (zero bookings, has enquiries)
  const coldClientIds = new Set<number | undefined>();
  Object.values(dateMap).forEach(d => {
    if (d.bookedCount === 0 && d.clientIds.size > 0) {
      d.clientIds.forEach(id => coldClientIds.add(id));
    }
  });

  return allClients.filter(c => coldClientIds.has(c.rowNumber));
}
