// Nepali month names mapping
export const NEPALI_MONTHS: Record<number, string> = {
  1: "BAISAKH",
  2: "JESTHA",
  3: "ASHADH",
  4: "SHRAWAN",
  5: "BHADRA",
  6: "ASHWIN",
  7: "KARTIK",
  8: "MANGSIR",
  9: "POUSH",
  10: "MAGH",
  11: "FALGUN",
  12: "CHAITRA",
};

export function getMonthName(monthNumber: number | string): string {
  const num = typeof monthNumber === 'string' ? parseInt(monthNumber, 10) : monthNumber;
  return NEPALI_MONTHS[num] || `Month ${num}`;
}

// Get handler initials from name
export function getHandlerInitials(name: string): string {
  if (!name) return "??";
  
  const parts = name.trim().toUpperCase().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return name.substring(0, 2).toUpperCase();
}

// Parse event details from multi-line strings
export interface ParsedEvent {
  year: string;
  month: string;
  monthName: string;
  day: string;
  eventName: string;
}

export function parseEventDetails(
  events: string,
  years: string,
  months: string,
  days: string
): ParsedEvent[] {
  const eventList = events?.split('\n').filter(Boolean) || [];
  const yearList = years?.split('\n').filter(Boolean) || [];
  const monthList = months?.split('\n').filter(Boolean) || [];
  const dayList = days?.split('\n').filter(Boolean) || [];

  const result: ParsedEvent[] = [];
  const maxLen = Math.max(eventList.length, yearList.length);

  for (let i = 0; i < maxLen; i++) {
    const monthNum = parseInt(monthList[i] || '0', 10);
    result.push({
      year: yearList[i] || '',
      month: monthList[i] || '',
      monthName: getMonthName(monthNum),
      day: dayList[i] || '',
      eventName: eventList[i] || '',
    });
  }

  return result;
}

// Format location for display
export function formatLocationDisplay(eventLocation: string, eventCity: string): { type: string; city: string } | null {
  if (!eventLocation) return null;
  
  const loc = eventLocation.toUpperCase();
  let type = '';
  
  if (loc.includes('INSIDE')) {
    type = 'IV';
  } else if (loc.includes('OUTSIDE')) {
    type = 'OV';
  } else if (loc.includes('MIXED')) {
    type = 'MX';
  } else if (loc.includes('ABROAD')) {
    type = 'AB';
  } else {
    type = loc.substring(0, 2);
  }
  
  return { type, city: eventCity || '' };
}
