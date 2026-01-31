// Utility functions for client card display and logic
// Extracted from FreshClientCard for reuse in desktop components

// Get booking date from statusLog (when status was changed to BOOKED)
export function getBookingDate(statusLog?: string): Date | null {
  if (!statusLog) return null;
  
  const lines = statusLog.split('\n').filter(Boolean);
  // Search from most recent to oldest
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].toUpperCase();
    // Match BOOKED but not BOOKED SOMEWHERE ELSE
    if (line.includes('BOOKED') && !line.includes('BOOKED SOMEWHERE ELSE')) {
      // Parse timestamp: "BOOKED [MM/DD/YYYY, HH:MM:SS]" or "BOOKED - MM/DD/YYYY, HH:MM:SS"
      const bracketMatch = lines[i].match(/\[(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?\]/);
      const dashMatch = lines[i].match(/-\s*(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/);
      
      const match = bracketMatch || dashMatch;
      if (match) {
        const month = parseInt(match[1]) - 1; // JS months are 0-indexed
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        const hours = parseInt(match[4]) || 0;
        const mins = parseInt(match[5]) || 0;
        const secs = parseInt(match[6]) || 0;
        
        return new Date(year, month, day, hours, mins, secs);
      }
    }
  }
  return null;
}

export interface CallEntry {
  label: string;
  type: 'DIRECT' | 'WHATSAPP';
  time: string;
  date: string;
}

export interface QuotationTier {
  tier: string;
  amount: string;
}

export interface ParsedMindset {
  name: string;
  timestamp: Date | null;
  hoursAgo: number;
}

export interface ParsedComment {
  text: string;
  timestamp: Date | null;
}

// Parse call log entries
export function parseCallLog(callLog: string): CallEntry[] {
  if (!callLog) return [];
  
  const entries: CallEntry[] = [];
  const lines = callLog.split('\n').filter(Boolean);
  
  lines.forEach((line, index) => {
    // Format: "{ordinal} {TYPE} CALL AT {TIME} ON {DATE}"
    const match = line.match(/^(\d+(?:ST|ND|RD|TH))\s+(DIRECT|WHATSAPP)\s+CALL\s+AT\s+(.+?)\s+ON\s+(.+)$/i);
    if (match) {
      entries.push({
        label: `${match[1]} ${match[2]} CALL AT ${match[3]} ON ${match[4]}`,
        type: match[2].toUpperCase() as 'DIRECT' | 'WHATSAPP',
        time: match[3],
        date: match[4]
      });
    } else {
      // Fallback for any format
      entries.push({
        label: line,
        type: line.toUpperCase().includes('WHATSAPP') ? 'WHATSAPP' : 'DIRECT',
        time: '',
        date: ''
      });
    }
  });
  
  return entries;
}

// Get last call info
export function getLastCallInfo(callLog: string): { displayText: string; hoursSinceLastCall: number } | null {
  if (!callLog) return null;
  
  const entries = parseCallLog(callLog);
  if (entries.length === 0) return null;
  
  const lastEntry = entries[entries.length - 1];
  
  // Try to parse time and date from the last entry
  // Format: "1ST DIRECT CALL AT 3:45 PM ON 2025-01-18"
  const match = lastEntry.label.match(/AT\s+(.+?)\s+ON\s+(\d{4}-\d{2}-\d{2})/i);
  if (match) {
    const timeStr = match[1];
    const dateStr = match[2];
    
    // Parse the time
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const mins = parseInt(timeMatch[2]);
      const isPM = timeMatch[3].toUpperCase() === 'PM';
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      // Parse date - handle Safari/iOS date format issue
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const day = parseInt(dateParts[2]);
        
        const callDate = new Date(year, month, day, hours, mins);
        const now = new Date();
        const diffMs = now.getTime() - callDate.getTime();
        const hoursSince = diffMs / (1000 * 60 * 60);
        
        return {
          displayText: formatDuration(diffMs) + " AGO",
          hoursSinceLastCall: hoursSince
        };
      }
    }
  }
  
  return null;
}

// Format duration in human readable format
export function formatDuration(diffMs: number): string {
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMins / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = totalMins % 60;
  
  if (days > 0) {
    if (hours > 0) {
      return `${days} DAY${days > 1 ? 'S' : ''} ${hours} HR`;
    }
    return `${days} DAY${days > 1 ? 'S' : ''}`;
  }
  if (hours > 0) {
    if (mins > 0) {
      return `${hours} HR ${mins} MIN`;
    }
    return `${hours} HR`;
  }
  return `${mins} MIN`;
}

// Parse status timestamp from log entry
export function parseStatusTimestamp(statusEntry: string): Date | null {
  // Format: "STATUS [MM/DD/YYYY, HH:MM:SS]" or "STATUS - MM/DD/YYYY, HH:MM:SS"
  const bracketMatch = statusEntry.match(/\[(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]/);
  const dashMatch = statusEntry.match(/-\s*(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})/);
  
  const match = bracketMatch || dashMatch;
  if (!match) return null;
  
  const datePart = match[1];
  const timePart = match[2];
  
  // Parse date manually for Safari/iOS compatibility
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

// Get status time ago
export function getStatusTimeAgo(statusLog?: string): { displayText: string; timestamp: Date; hoursSinceStatus: number } | null {
  if (!statusLog) return null;
  
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  
  const lastLine = lines[lines.length - 1];
  const timestamp = parseStatusTimestamp(lastLine);
  
  if (!timestamp) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const hoursSince = diffMs / (1000 * 60 * 60);
  
  return {
    displayText: formatDuration(diffMs) + " AGO",
    timestamp,
    hoursSinceStatus: hoursSince
  };
}

// Get enquiry time info with urgency level
// Uses Nepal timezone (UTC+5:45) for accurate time calculations
export function getEnquiryTimeInfo(
  inquiryDateAD?: string,
  inquiryTime?: string
): { displayText: string; urgency: 'normal' | 'warning' | 'urgent' | 'critical'; hoursAgo: number } | null {
  if (!inquiryDateAD) return null;
  
  try {
    // Parse date manually for Safari/iOS compatibility
    const dateParts = inquiryDateAD.split('-');
    if (dateParts.length !== 3) return null;
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    let hours = 0;
    let mins = 0;
    
    if (inquiryTime) {
      // Handle multiple time formats:
      // 1. "HH:MM AM/PM" (12-hour with period)
      // 2. "HH:MM" (24-hour without period)
      // 3. "H:MM AM/PM" (single digit hour)
      const timeMatch = inquiryTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        mins = parseInt(timeMatch[2]);
        
        // If AM/PM is provided, convert from 12-hour to 24-hour
        if (timeMatch[4]) {
          const isPM = timeMatch[4].toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        // If no AM/PM, assume it's already in 24-hour format (no conversion needed)
      }
    }
    
    // Create the enquiry date in local timezone
    const enquiryDate = new Date(year, month, day, hours, mins);
    
    // Get current time
    const now = new Date();
    const diffMs = now.getTime() - enquiryDate.getTime();
    const hoursAgo = diffMs / (1000 * 60 * 60);
    
    let urgency: 'normal' | 'warning' | 'urgent' | 'critical' = 'normal';
    if (hoursAgo >= 24) urgency = 'critical';
    else if (hoursAgo >= 12) urgency = 'urgent';
    else if (hoursAgo >= 3) urgency = 'warning';
    
    return {
      displayText: formatDuration(diffMs) + " ago",
      urgency,
      hoursAgo
    };
  } catch {
    return null;
  }
}

// Parse quotation data
export function parseQuotationData(data: string): QuotationTier[] {
  if (!data) return [];
  
  const tiers: QuotationTier[] = [];
  // Format: "BASIC: NPR X,XX,XXX/- | STANDARD: NPR X,XX,XXX/-" or newline-separated
  // Handle both pipe (|) and newline (\n) delimiters for backward compatibility
  const parts = data.split(/[|\n]/).map(p => p.trim()).filter(Boolean);
  
  parts.forEach(part => {
    const match = part.match(/^(BASIC|STANDARD|PREMIUM|WTN SPECIAL):\s*(.+)/i);
    if (match) {
      tiers.push({
        tier: match[1].toUpperCase(),
        amount: match[2].trim()
      });
    }
  });
  
  return tiers;
}

// Format number with Indian/Nepali comma separators
export function formatNPR(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : value;
  if (isNaN(num)) return '0';
  
  // Indian/Nepali numbering format: 1,23,456
  const numStr = num.toString();
  const lastThree = numStr.slice(-3);
  const rest = numStr.slice(0, -3);
  
  if (rest.length === 0) return lastThree;
  
  const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return restFormatted + ',' + lastThree;
}

// Get quotation tier color
export function getQuotationTierColor(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'BASIC':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'STANDARD':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'PREMIUM':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'WTN SPECIAL':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Get mindset color
export function getMindsetColor(mindset: string): string {
  const upper = mindset.toUpperCase();
  if (upper.includes('NOT SEEN')) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  if (upper.includes('IGNORED')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (upper.includes('BARGAINING')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (upper.includes('THINKING')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (upper.includes('READY')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

// Parse mindset with timestamp
export function parseMindset(mindset?: string): ParsedMindset {
  if (!mindset) return { name: '', timestamp: null, hoursAgo: 0 };
  
  // Format: "MINDSET [MM/DD/YYYY, HH:MM:SS]"
  const match = mindset.match(/^(.+?)\s*\[(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]/);
  
  if (match) {
    const name = match[1].trim();
    const datePart = match[2];
    const timePart = match[3];
    
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    const timestamp = new Date(year, month - 1, day, hours, minutes, seconds);
    
    const hoursAgo = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    
    return { name, timestamp, hoursAgo };
  }
  
  return { name: mindset.trim(), timestamp: null, hoursAgo: 0 };
}

// Parse comments
export function parseComments(comments?: string): ParsedComment[] {
  if (!comments) return [];
  
  // Split by ||| delimiter
  const entries = comments.split('|||').filter(Boolean);
  
  return entries.map(entry => {
    // Try format 1: Timestamp at END - "Comment text [MM/DD/YYYY HH:MM]"
    const endMatch = entry.match(/^(.+?)\s*\[(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})\]$/);
    
    // Try format 2: Timestamp at BEGINNING - "[MM/DD/YYYY HH:MM] Comment text"
    const startMatch = entry.match(/^\[(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})\]\s*(.+)$/);
    
    const match = endMatch || startMatch;
    
    if (match) {
      // For endMatch: match[1] is text, match[2] is datetime
      // For startMatch: match[1] is datetime, match[2] is text
      const text = endMatch ? match[1].trim() : match[2].trim();
      const dateTimeStr = endMatch ? match[2] : match[1];
      
      // Parse date/time manually for Safari compatibility
      const dateTimeMatch = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (dateTimeMatch) {
        const month = parseInt(dateTimeMatch[1]) - 1;
        const day = parseInt(dateTimeMatch[2]);
        const year = parseInt(dateTimeMatch[3]);
        const hours = parseInt(dateTimeMatch[4]);
        const mins = parseInt(dateTimeMatch[5]);
        
        return { text, timestamp: new Date(year, month, day, hours, mins) };
      }
      
      return { text, timestamp: null };
    }
    
    return { text: entry.trim(), timestamp: null };
  });
}

// Get relative time string
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// Parse final quotation (for BOOKED clients)
export function parseFinalQuotation(finalQuotation?: string): { package: string; amount: string } | null {
  if (!finalQuotation) return null;
  
  // Format: "PREMIUM NPR 2,50,000/-" OR "PREMIUM: NPR 75,000/-"
  // Handle both formats - with or without colon after package name
  const match = finalQuotation.match(/^(BASIC|STANDARD|PREMIUM|WTN SPECIAL):?\s+NPR\s+([\d,]+)\s*\/?-?/i);
  if (match) {
    return {
      package: match[1].toUpperCase(),
      amount: match[2]
    };
  }
  
  return null;
}

// Get total paid from payments log
export function getTotalPaid(paymentsMade?: string): number {
  if (!paymentsMade) return 0;
  
  let total = 0;
  const regex = /NPR\s*([\d,]+)\s*\/-/gi;
  let match;
  
  while ((match = regex.exec(paymentsMade)) !== null) {
    const amount = parseInt(match[1].replace(/,/g, ''));
    if (!isNaN(amount)) total += amount;
  }
  
  return total;
}

// Get days remaining until event
export function getDaysRemainingInfo(events: string): { days: number; color: string } | null {
  if (!events) return null;
  
  // Parse events to find earliest date
  // Format: "2082 Magh 22 - WEDDING | 2082 Magh 23 - RECEPTION"
  const eventList = events.split('|').map(e => e.trim()).filter(Boolean);
  
  // For now return null - complex Nepali date calculation needed
  return null;
}

// Import nepali-date-converter dynamically to avoid circular dependencies
import NepaliDate from "nepali-date-converter";

// Calculate days until an event from BS date components
export function getDaysUntilEvent(
  eventYear: string | number,
  eventMonth: string | number,
  eventDay: string | number
): number | null {
  if (!eventYear || !eventMonth || !eventDay) return null;
  
  // Handle unknown day (** represents unknown)
  const dayStr = String(eventDay);
  if (dayStr === '**') return null;
  
  try {
    const year = typeof eventYear === 'string' ? parseInt(eventYear) : eventYear;
    const month = typeof eventMonth === 'string' ? parseInt(eventMonth) : eventMonth;
    const day = typeof eventDay === 'string' ? parseInt(eventDay) : eventDay;
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    // Convert BS to AD using nepali-date-converter
    // NepaliDate uses 0-indexed months, so subtract 1
    const npDate = new NepaliDate(year, month - 1, day);
    const eventDateAD = npDate.toJsDate();
    
    if (!eventDateAD || isNaN(eventDateAD.getTime())) return null;
    
    // Calculate difference from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDateAD.setHours(0, 0, 0, 0);
    
    const diffTime = eventDateAD.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return days only if event is in the future
    return diffDays > 0 ? diffDays : null;
  } catch (e) {
    console.error('Error calculating days until event:', e);
    return null;
  }
}

// Get current status from status log
export function getCurrentStatus(statusLog?: string): string {
  if (!statusLog) return 'UNTOUCHED';
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return 'UNTOUCHED';
  
  const lastLine = lines[lines.length - 1];
  let statusPart = lastLine.split(' [')[0];
  if (statusPart === lastLine) {
    statusPart = lastLine.split(' - ')[0];
  }
  return statusPart.trim().toUpperCase();
}

// Month color classes for inquiry month highlighting
const monthColorMap: Record<number, { bg: string; text: string; dark: { bg: string; text: string } }> = {
  1:  { bg: 'bg-rose-100', text: 'text-rose-700', dark: { bg: 'dark:bg-rose-900/30', text: 'dark:text-rose-400' } },
  2:  { bg: 'bg-orange-100', text: 'text-orange-700', dark: { bg: 'dark:bg-orange-900/30', text: 'dark:text-orange-400' } },
  3:  { bg: 'bg-amber-100', text: 'text-amber-700', dark: { bg: 'dark:bg-amber-900/30', text: 'dark:text-amber-400' } },
  4:  { bg: 'bg-yellow-100', text: 'text-yellow-700', dark: { bg: 'dark:bg-yellow-900/30', text: 'dark:text-yellow-400' } },
  5:  { bg: 'bg-lime-100', text: 'text-lime-700', dark: { bg: 'dark:bg-lime-900/30', text: 'dark:text-lime-400' } },
  6:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dark: { bg: 'dark:bg-emerald-900/30', text: 'dark:text-emerald-400' } },
  7:  { bg: 'bg-teal-100', text: 'text-teal-700', dark: { bg: 'dark:bg-teal-900/30', text: 'dark:text-teal-400' } },
  8:  { bg: 'bg-cyan-100', text: 'text-cyan-700', dark: { bg: 'dark:bg-cyan-900/30', text: 'dark:text-cyan-400' } },
  9:  { bg: 'bg-sky-100', text: 'text-sky-700', dark: { bg: 'dark:bg-sky-900/30', text: 'dark:text-sky-400' } },
  10: { bg: 'bg-blue-100', text: 'text-blue-700', dark: { bg: 'dark:bg-blue-900/30', text: 'dark:text-blue-400' } },
  11: { bg: 'bg-violet-100', text: 'text-violet-700', dark: { bg: 'dark:bg-violet-900/30', text: 'dark:text-violet-400' } },
  12: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', dark: { bg: 'dark:bg-fuchsia-900/30', text: 'dark:text-fuchsia-400' } },
};

// Get color classes for a given inquiry month
export function getMonthColorClasses(month: number): string {
  const colors = monthColorMap[month];
  if (!colors) return 'bg-muted text-muted-foreground';
  return `${colors.bg} ${colors.text} ${colors.dark.bg} ${colors.dark.text}`;
}

// Parse inquiry month from BS date string (format: "2081 10 22")
export function parseInquiryMonth(inquiryDateBS?: string): number | null {
  if (!inquiryDateBS) return null;
  const parts = inquiryDateBS.trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    if (month >= 1 && month <= 12) return month;
  }
  return null;
}

// Nepali month names for display
const nepaliMonthNames = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// Get detailed inquiry info with BS date display and precise time breakdown
export function getDetailedEnquiryInfo(
  inquiryDateAD?: string,
  inquiryTime?: string,
  inquiryDateBS?: string
): { bsDisplay: string; timeAgo: string; urgency: 'normal' | 'warning' | 'urgent' | 'critical' } | null {
  if (!inquiryDateAD || !inquiryDateBS) return null;
  
  // Parse BS date for display (format: "2081 10 22" or "2081-10-22")
  const bsParts = inquiryDateBS.trim().split(/[\s\-]+/);
  let bsDisplay = inquiryDateBS;
  if (bsParts.length >= 3) {
    const year = bsParts[0];
    const month = parseInt(bsParts[1], 10);
    const day = bsParts[2];
    const monthName = nepaliMonthNames[month - 1] || `Month ${month}`;
    bsDisplay = `${year} ${monthName} ${day}`;
  }
  
  // Calculate time difference
  try {
    const dateParts = inquiryDateAD.split('-');
    if (dateParts.length !== 3) return null;
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    let hours = 0;
    let mins = 0;
    
    if (inquiryTime) {
      const timeMatch = inquiryTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        mins = parseInt(timeMatch[2]);
        if (timeMatch[3]) {
          const isPM = timeMatch[3].toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
      }
    }
    
    const enquiryDate = new Date(year, month, day, hours, mins);
    const now = new Date();
    const diffMs = now.getTime() - enquiryDate.getTime();
    const hoursAgo = diffMs / (1000 * 60 * 60);
    
    // Calculate detailed breakdown
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    const remainingMins = totalMins % 60;
    
    let timeAgo = '';
    if (days > 0) {
      timeAgo = `${days}d ${remainingHours}h ${remainingMins}m`;
    } else if (remainingHours > 0) {
      timeAgo = `${remainingHours}h ${remainingMins}m`;
    } else {
      timeAgo = `${remainingMins}m`;
    }
    
    let urgency: 'normal' | 'warning' | 'urgent' | 'critical' = 'normal';
    if (hoursAgo >= 24) urgency = 'critical';
    else if (hoursAgo >= 12) urgency = 'urgent';
    else if (hoursAgo >= 3) urgency = 'warning';
    
    return { bsDisplay, timeAgo, urgency };
  } catch {
    return null;
  }
}

// Nepali month names (reused from nepali-date.ts for consistency)
export const nepaliMonthsEnglish = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// Format AD date/timestamp to Nepali BS format (e.g., "Magh 25, 2082")
export function formatDateAsNepali(adDate: string | Date): string {
  try {
    let date: Date;
    if (typeof adDate === 'string') {
      // Handle various date formats manually for Safari/iOS compatibility
      if (adDate.includes('T')) {
        // ISO format: 2025-01-21T10:30:00
        const [datePart, timePart] = adDate.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, mins] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hours || 0, mins || 0);
      } else if (adDate.includes('-')) {
        // Date only: 2025-01-21
        const [year, month, day] = adDate.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(adDate);
      }
    } else {
      date = adDate;
    }
    
    if (isNaN(date.getTime())) return adDate.toString();
    
    // Use nepali-date-converter logic inline (to avoid circular imports)
    // This is a simplified conversion - for full accuracy, import from nepali-date.ts
    const NepaliDate = (window as any).NepaliDate;
    if (typeof NepaliDate !== 'undefined') {
      const np = new NepaliDate(date);
      const month = np.getMonth(); // 0-indexed
      const day = np.getDate();
      const year = np.getYear();
      return `${nepaliMonthsEnglish[month]} ${day}, ${year}`;
    }
    
    // Fallback if NepaliDate not available
    return adDate.toString();
  } catch {
    return typeof adDate === 'string' ? adDate : adDate.toString();
  }
}

// Format AD timestamp to Nepali BS format with time (e.g., "Magh 25, 2082 at 10:30 AM")
export function formatTimestampAsNepali(adDate: string | Date): string {
  try {
    let date: Date;
    let timeStr = '';
    
    if (typeof adDate === 'string') {
      if (adDate.includes('T')) {
        const [datePart, timePart] = adDate.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const timeMatch = timePart.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const mins = parseInt(timeMatch[2]);
          date = new Date(year, month - 1, day, hours, mins);
          const isPM = hours >= 12;
          const displayHours = hours % 12 || 12;
          timeStr = ` at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
        } else {
          date = new Date(year, month - 1, day);
        }
      } else if (adDate.includes('-')) {
        const [year, month, day] = adDate.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(adDate);
      }
    } else {
      date = adDate;
      const hours = date.getHours();
      const mins = date.getMinutes();
      if (hours !== 0 || mins !== 0) {
        const isPM = hours >= 12;
        const displayHours = hours % 12 || 12;
        timeStr = ` at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      }
    }
    
    if (isNaN(date.getTime())) return adDate.toString();
    
    const NepaliDate = (window as any).NepaliDate;
    if (typeof NepaliDate !== 'undefined') {
      const np = new NepaliDate(date);
      const month = np.getMonth();
      const day = np.getDate();
      const year = np.getYear();
      return `${nepaliMonthsEnglish[month]} ${day}, ${year}${timeStr}`;
    }
    
    return adDate.toString();
  } catch {
    return typeof adDate === 'string' ? adDate : adDate.toString();
  }
}

// Parse BS date string (e.g., "2082 10 25" or "2082-10-25") to formatted display
export function formatBSDateDisplay(bsDateStr: string): string {
  if (!bsDateStr) return '';
  const parts = bsDateStr.trim().split(/[\s\-]+/);
  if (parts.length >= 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parts[2];
    const monthName = nepaliMonthsEnglish[month - 1] || `Month ${month}`;
    return `${monthName} ${day}, ${year}`;
  }
  return bsDateStr;
}

// Parse payment entries from payment log string
export interface ParsedPayment {
  amount: string;
  amountNum: number;
  type: string;
  weekday: string;
  dateBS: string;
  dateBSFormatted: string;
  bank: string;
}

export function parsePayments(paymentsMade: string): ParsedPayment[] {
  if (!paymentsMade) return [];
  
  const payments: ParsedPayment[] = [];
  const lines = paymentsMade.split('\n').filter(Boolean);
  
  lines.forEach(line => {
    // Pattern: NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK
    const match = line.match(/NPR\s*([\d,]+)\/?-?\s*AS\s+(\w+)\s+ON\s+(\w{3})\s+([\d-]+)\s+IN\s+(.+)/i);
    if (match) {
      const amount = match[1];
      const dateBS = match[4];
      payments.push({
        amount: `NPR ${amount}/-`,
        amountNum: parseInt(amount.replace(/,/g, '')),
        type: match[2].toUpperCase(),
        weekday: match[3].toUpperCase(),
        dateBS: dateBS,
        dateBSFormatted: formatBSDateDisplay(dateBS.replace(/-/g, ' ')),
        bank: match[5].trim()
      });
    }
  });
  
  return payments;
}

// Get payment type badge color
export function getPaymentTypeBadgeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'ADVANCE':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'FINAL':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}
