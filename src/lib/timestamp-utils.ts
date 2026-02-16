/**
 * Shared timestamp utilities for Supabase-first optimistic updates.
 * These generate the same formatted strings the Google Sheets API would return,
 * so local state updates match what eventually lands in Sheets.
 */

/** Generate a status log timestamp: MM/DD/YYYY, HH:MM:SS */
export function generateStatusTimestamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  return `${month}/${day}/${year}, ${hours}:${mins}:${secs}`;
}

/** Generate a new status log entry and prepend to existing log */
export function generateStatusLogEntry(newStatus: string, existingLog: string): string {
  const timestamp = generateStatusTimestamp();
  const newEntry = `${timestamp} - ${newStatus}`;
  return existingLog ? `${newEntry}\n${existingLog}` : newEntry;
}

/** Generate a call log entry: "H:MM AM/PM TYPE (YYYY-MM-DD)" prepended to existing */
export function generateCallLogEntry(callType: 'DIRECT' | 'WHATSAPP', existingCallLog: string): string {
  const now = new Date();
  const hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const timeStr = `${displayHours}:${mins} ${ampm}`;
  const dateStr = `${year}-${month}-${day}`;
  
  const newEntry = `${timeStr} ${callType} (${dateStr})`;
  return existingCallLog ? `${newEntry}\n${existingCallLog}` : newEntry;
}

/** Generate a comment entry: "MM/DD/YYYY HH:MM - comment" prepended to existing */
export function generateCommentEntry(comment: string, existingComments: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `${month}/${day}/${year} ${hours}:${mins}`;
  
  const newEntry = `${timestamp} - ${comment}`;
  return existingComments ? `${newEntry}\n${existingComments}` : newEntry;
}
