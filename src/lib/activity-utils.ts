// Activity parsing utilities for the Breaking News feed
import { ClientData, BookedClientData } from "@/lib/sheets-api";
import { parseStatusTimestamp, parseCallLog, parseComments, getRelativeTime } from "@/lib/client-card-utils";
import NepaliDate from "nepali-date-converter";

export type ActivityType = 'payment' | 'comment' | 'status' | 'client_added' | 'call' | 'booking' | 'quotation' | 'handler_change' | 'mindset' | 'lost';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  clientName: string;
  clientId: string; // registeredDateTimeAD for navigation
  handlerName?: string; // clientHandler field
  description: string;
  details?: string;
  timestamp: Date;
  dateBS?: string;
  relativeTime: string;
}

// Get activity icon name by type
export function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case 'payment': return 'CreditCard';
    case 'comment': return 'MessageSquare';
    case 'status': return 'Activity';
    case 'client_added': return 'UserPlus';
    case 'call': return 'Phone';
    case 'booking': return 'CalendarCheck';
    case 'quotation': return 'FileText';
    case 'handler_change': return 'UserCog';
    case 'mindset': return 'Brain';
    case 'lost': return 'XCircle';
    default: return 'Bell';
  }
}

// Get activity color classes by type
export function getActivityColor(type: ActivityType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'payment':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'comment':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'status':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'client_added':
      return { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' };
    case 'call':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'booking':
      return { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' };
    case 'quotation':
      return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' };
    case 'handler_change':
      return { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' };
    case 'mindset':
      return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'lost':
      return { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
  }
}

// Map activity type string from Column AJ to ActivityType
function mapActivityType(typeStr: string): ActivityType {
  switch (typeStr.toUpperCase().trim()) {
    case 'STATUS_CHANGE': return 'status';
    case 'COMMENT': return 'comment';
    case 'PAYMENT': return 'payment';
    case 'CALL': return 'call';
    case 'CLIENT_ADDED': return 'client_added';
    case 'QUOTATION': return 'quotation';
    case 'FINAL_QUOTATION': return 'quotation';
    case 'HANDLER_CHANGE': return 'handler_change';
    case 'MINDSET': return 'mindset';
    default:
      if (typeStr.toUpperCase().includes('BOOKED')) return 'booking';
      return 'status';
  }
}

// Check if status details indicate a "lost" client (negative outcome)
function isLostStatus(details: string): boolean {
  const upper = details.toUpperCase();
  return upper.includes('BOOKED SOMEWHERE ELSE') ||
         upper.includes('CANCELLED BY CLIENT') ||
         upper.includes('CANCELLED BY US') ||
         upper.includes('CANCELLED');
}

// Get description based on activity type and details
function getActivityDescription(activityType: string, details: string): string {
  const type = activityType.toUpperCase().trim();
  switch (type) {
    case 'STATUS_CHANGE':
      if (isLostStatus(details)) {
        return `Lost → ${details}`;
      }
      return details.toUpperCase().includes('BOOKED') ? 'Confirmed booking' : `Status → ${details}`;
    case 'COMMENT':
      return 'New comment added';
    case 'PAYMENT':
      return details;
    case 'CALL':
      return 'Call logged';
    case 'CLIENT_ADDED':
      return 'New client registered';
    case 'QUOTATION':
      return 'Quotation sent';
    case 'FINAL_QUOTATION':
      return 'Final quotation locked';
    case 'HANDLER_CHANGE':
      return details;
    case 'MINDSET':
      return `Mindset: ${details}`;
    default:
      return details || 'Activity recorded';
  }
}

// Parse structured activity log from Column AJ (PRIMARY SOURCE)
// Format: "MM/DD/YYYY HH:MM:SS | ACTIVITY_TYPE | Details"
function parseActivityLogColumn(client: ClientData | BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const log = client.lastActivityLog;
  const handlerName = 'clientHandler' in client ? client.clientHandler : undefined;
  
  if (!log) return activities;
  
  const lines = log.split('\n').filter(Boolean);
  
  lines.forEach((line, index) => {
    // Format: "MM/DD/YYYY HH:MM:SS | TYPE | Details"
    const parts = line.split(' | ');
    if (parts.length < 3) return;
    
    const [timestampStr, activityType, ...detailParts] = parts;
    const details = detailParts.join(' | '); // Rejoin in case details contain |
    
    // Parse timestamp - supports both formats:
    // MM/DD/YYYY HH:MM:SS (new correct format)
    // YYYY/MM/DD HH:MM:SS (legacy format)
    let match = timestampStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    let year: number, month: number, day: number;
    
    if (match) {
      // MM/DD/YYYY format
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    } else {
      // Try YYYY/MM/DD format (legacy fallback)
      match = timestampStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
      if (!match) return; // Skip if neither format matches
      
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    }
    
    const hours = parseInt(match[4], 10);
    const mins = parseInt(match[5], 10);
    const secs = parseInt(match[6], 10);
    
    const timestamp = new Date(year, month - 1, day, hours, mins, secs);
    
    if (isNaN(timestamp.getTime())) return;
    
    // Map activity type
    const type = mapActivityType(activityType);
    
    // Check for negative outcomes (lost clients) FIRST
    const isLost = activityType.toUpperCase() === 'STATUS_CHANGE' && isLostStatus(details);
    
    // Check if this is a positive booking (only if not lost)
    const isBooking = !isLost && 
                      activityType.toUpperCase() === 'STATUS_CHANGE' && 
                      details.toUpperCase().includes('BOOKED');
    
    // Determine final type
    const finalType: ActivityType = isLost ? 'lost' : (isBooking ? 'booking' : type);
    
    activities.push({
      id: `log-${client.registeredDateTimeAD}-${index}`,
      type: finalType,
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName: handlerName || undefined,
      description: getActivityDescription(activityType, details),
      details: type === 'comment' ? `"${details}"` : undefined,
      timestamp,
      relativeTime: getRelativeTime(timestamp),
    });
  });
  
  return activities;
}

// Parse status log entries into activities
function parseStatusActivities(client: ClientData | BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const statusLog = client.statusLog;
  const handlerName = 'clientHandler' in client ? client.clientHandler : undefined;
  
  if (!statusLog) return activities;
  
  const lines = statusLog.split('\n').filter(Boolean);
  
  lines.forEach((line, index) => {
    const timestamp = parseStatusTimestamp(line);
    if (!timestamp) return;
    
    // Extract status name (everything before the bracket or dash)
    const statusName = line.split(/[\[\-]/)[0].trim();
    
    // Check for negative outcomes FIRST
    const isLost = isLostStatus(statusName);
    
    // Check for positive booking only if not lost
    const isBooking = !isLost && statusName.toUpperCase().includes('BOOKED');
    
    // Determine final type
    const finalType: ActivityType = isLost ? 'lost' : (isBooking ? 'booking' : 'status');
    
    activities.push({
      id: `status-${client.registeredDateTimeAD}-${index}`,
      type: finalType,
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName: handlerName || undefined,
      description: isLost ? `Lost → ${statusName}` : (isBooking ? `Confirmed booking` : `Status → ${statusName}`),
      details: isLost ? 'Client was lost' : (isBooking ? 'Client confirmed and booked!' : undefined),
      timestamp,
      relativeTime: getRelativeTime(timestamp),
    });
  });
  
  return activities;
}

// Parse comments into activities
function parseCommentActivities(client: ClientData | BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const comments = client.comments;
  const handlerName = 'clientHandler' in client ? client.clientHandler : undefined;
  
  if (!comments) return activities;
  
  const parsedComments = parseComments(comments);
  
  parsedComments.forEach((comment, index) => {
    if (!comment.timestamp) return;
    
    const truncatedText = comment.text.length > 50 
      ? comment.text.substring(0, 50) + '...' 
      : comment.text;
    
    activities.push({
      id: `comment-${client.registeredDateTimeAD}-${index}`,
      type: 'comment',
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName: handlerName || undefined,
      description: `💬 "${truncatedText}"`,
      details: undefined,
      timestamp: comment.timestamp,
      relativeTime: getRelativeTime(comment.timestamp),
    });
  });
  
  return activities;
}

// Parse call log into activities
function parseCallActivities(client: ClientData | BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const callLog = client.callLog;
  const handlerName = 'clientHandler' in client ? client.clientHandler : undefined;
  
  if (!callLog) return activities;
  
  const callEntries = parseCallLog(callLog);
  
  callEntries.forEach((entry, index) => {
    if (!entry.date || !entry.time) return;
    
    // Parse date and time
    try {
      const dateParts = entry.date.split('-').map(Number);
      if (dateParts.length !== 3) return;
      
      const [year, month, day] = dateParts;
      
      // Parse time
      const timeMatch = entry.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let hours = 0, mins = 0;
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        mins = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toUpperCase() === 'PM';
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }
      
      const callDate = new Date(year, month - 1, day, hours, mins);
      
      activities.push({
        id: `call-${client.registeredDateTimeAD}-${index}`,
        type: 'call',
        clientName: client.clientName || 'Unknown',
        clientId: client.registeredDateTimeAD || '',
        handlerName: handlerName || undefined,
        description: `${entry.type} call logged`,
        details: entry.label,
        timestamp: callDate,
        relativeTime: getRelativeTime(callDate),
      });
    } catch {
      // Skip invalid entries
    }
  });
  
  return activities;
}

// Parse payments into activities (for booked clients)
function parsePaymentActivities(client: BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const paymentsMade = client.paymentsMade;
  const handlerName = client.clientHandler;
  
  if (!paymentsMade) return activities;
  
  // Format: "NPR 50,000/- AS ADVANCE ON SAT 2082-10-16 IN ESEWA"
  // Or: "NPR X,XX,XXX/- TYPE [DATE] @ BANK"
  const lines = paymentsMade.split('\n').filter(Boolean);
  
  lines.forEach((line, index) => {
    // Try to extract payment details
    const amountMatch = line.match(/NPR\s*([\d,]+)\s*\/-/i);
    const typeMatch = line.match(/AS\s+(ADVANCE|PARTIAL|FINAL)/i);
    const bsDateMatch = line.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    const bracketDateMatch = line.match(/\[(\d{1,2})\/(\d{1,2})\/(\d{4})\]/);
    
    let timestamp: Date | null = null;
    let dateBS: string | undefined;
    
    // Try BS date format first (2082-10-16)
    if (bsDateMatch) {
      try {
        const [, year, month, day] = bsDateMatch.map(Number);
        const npDate = new NepaliDate(year, month - 1, day);
        timestamp = npDate.toJsDate();
        dateBS = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } catch {
        // Fall through to bracket format
      }
    }
    
    // Try bracket date format (MM/DD/YYYY)
    if (!timestamp && bracketDateMatch) {
      const [, month, day, year] = bracketDateMatch.map(Number);
      timestamp = new Date(year, month - 1, day);
    }
    
    if (!timestamp) return;
    
    const amount = amountMatch ? amountMatch[1] : '?';
    const paymentType = typeMatch ? typeMatch[1] : 'PAYMENT';
    
    activities.push({
      id: `payment-${client.registeredDateTimeAD}-${index}`,
      type: 'payment',
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName: handlerName || undefined,
      description: `NPR ${amount}/- received`,
      details: `${paymentType} payment`,
      timestamp,
      dateBS,
      relativeTime: getRelativeTime(timestamp),
    });
  });
  
  return activities;
}

// Parse client registration into activity
function parseClientAddedActivity(client: ClientData | BookedClientData): ActivityItem | null {
  const registeredDateTimeAD = client.registeredDateTimeAD;
  const handlerName = 'clientHandler' in client ? client.clientHandler : undefined;
  
  if (!registeredDateTimeAD) return null;
  
  // Format: "2025-01-28 12:30:45" or similar
  try {
    // Parse date manually for Safari compatibility
    const match = registeredDateTimeAD.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    
    const [, year, month, day, hours, mins, secs] = match.map(Number);
    const timestamp = new Date(year, month - 1, day, hours, mins, secs);
    
    if (isNaN(timestamp.getTime())) return null;
    
    // Check if eventSource exists (only on ClientData, not BookedClientData)
    const eventSource = 'eventSource' in client ? client.eventSource : undefined;
    
    return {
      id: `added-${client.registeredDateTimeAD}`,
      type: 'client_added',
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName: handlerName || undefined,
      description: `New client registered`,
      details: eventSource ? `Source: ${eventSource}` : undefined,
      timestamp,
      relativeTime: getRelativeTime(timestamp),
    };
  } catch {
    return null;
  }
}

// Deduplicate activities: same client + same type + timestamps within 60s = duplicate
function deduplicateActivities(activities: ActivityItem[]): ActivityItem[] {
  const result: ActivityItem[] = [];
  
  for (const activity of activities) {
    const isDuplicate = result.some(existing => 
      existing.clientId === activity.clientId &&
      existing.type === activity.type &&
      (activity.type === 'comment'
        ? existing.description === activity.description
        : Math.abs(existing.timestamp.getTime() - activity.timestamp.getTime()) < 60000)
    );
    if (!isDuplicate) {
      result.push(activity);
    }
  }
  
  return result;
}

// Parse all activities from clients
// MERGE ALL SOURCES: Column AJ + statusLog + comments + callLog + payments
export function parseActivities(
  clients: ClientData[],
  bookedClients: BookedClientData[]
): ActivityItem[] {
  const allActivities: ActivityItem[] = [];
  
  // Process regular clients - merge ALL sources
  clients.forEach(client => {
    // Column AJ entries
    allActivities.push(...parseActivityLogColumn(client));
    
    // Individual column entries (always parsed now)
    const addedActivity = parseClientAddedActivity(client);
    if (addedActivity) allActivities.push(addedActivity);
    
    allActivities.push(...parseStatusActivities(client));
    allActivities.push(...parseCommentActivities(client));
    allActivities.push(...parseCallActivities(client));
  });
  
  // Process booked clients - merge ALL sources
  bookedClients.forEach(client => {
    // Column AJ entries
    allActivities.push(...parseActivityLogColumn(client));
    
    // Individual column entries (always parsed now)
    const addedActivity = parseClientAddedActivity(client);
    if (addedActivity) allActivities.push(addedActivity);
    
    allActivities.push(...parseStatusActivities(client));
    allActivities.push(...parseCommentActivities(client));
    allActivities.push(...parseCallActivities(client));
    allActivities.push(...parsePaymentActivities(client));
  });
  
  // Deduplicate (Column AJ and individual columns may describe same event)
  const deduplicated = deduplicateActivities(allActivities);
  
  // Sort by timestamp (most recent first)
  deduplicated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return deduplicated;
}

// Format date for day grouping
export function formatDayKey(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  
  // Return BS date
  try {
    const npDate = new NepaliDate(date);
    const months = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    return `${npDate.getBS().year} ${months[npDate.getBS().month]} ${npDate.getBS().date}`;
  } catch {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Group activities by day
export function groupActivitiesByDay(activities: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>();
  
  activities.forEach(activity => {
    const key = formatDayKey(activity.timestamp);
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(activity);
  });
  
  return groups;
}

// Get recent activities (last 14 days, max 200)
export function getRecentActivities(activities: ActivityItem[], days = 14, limit = 200): ActivityItem[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  
  return activities
    .filter(a => a.timestamp >= cutoff)
    .slice(0, limit);
}
