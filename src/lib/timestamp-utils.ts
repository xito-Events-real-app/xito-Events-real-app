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

/**
 * Compute a payment update locally — mirrors the backend addPayment logic exactly.
 *
 * String format produced: "NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK"
 * - Amount: toLocaleString('en-IN') — commas ARE included (e.g. "30,000")
 * - Weekday: derived from nepaliDateAD using local-timezone Date constructor
 *            new Date(year, month-1, day) — NOT new Date('YYYY-MM-DD') (UTC would offset by 1 day)
 * - New entry is APPENDED (not prepended) — newest payment is at the bottom
 * - Remaining format: "NPR X,XXX/-"
 *
 * This matches backend addPayment lines 3693-3736 exactly.
 */
export function computePaymentUpdate(params: {
  paymentAmount: string;          // Raw amount string or number, e.g. "30000" or "30,000"
  paymentType: string;            // e.g. "ADVANCE", "PARTIAL", "FINAL"
  nepaliDate: string;             // BS date "YYYY-MM-DD"
  nepaliDateAD: string;           // AD date "YYYY-MM-DD" — used for weekday derivation
  bank: string;                   // e.g. "MASTER BARUN", "ESEWA"
  existingPaymentsMade: string;   // Current Column AE value
  existingPaymentDatesAD: string; // Current Column AF value
  finalQuotationAmount: number;   // Parsed integer, e.g. 120000
}): {
  updatedPaymentsMade: string;    // New Column AE value (ready to write to Supabase + Sheets)
  updatedPaymentDatesAD: string;  // New Column AF value
  remainingPayment: string;       // Formatted "NPR X,XXX/-" for Column AG
  totalPaid: number;              // Integer sum of all payments including new one
} {
  // Step 1 — Weekday derivation (local timezone, matching backend lines 3694-3697)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const [yearPart, monthPart, dayPart] = params.nepaliDateAD.split('-').map(Number);
  const adDateObj = new Date(yearPart, monthPart - 1, dayPart); // Local timezone, not UTC
  const weekday = weekdays[adDateObj.getDay()];

  // Step 2 — Format amount and build entry string (matching backend lines 3700-3701)
  const numericAmount = parseInt(String(params.paymentAmount).replace(/,/g, ''), 10);
  const formattedAmount = `NPR ${numericAmount.toLocaleString('en-IN')}/-`;
  const newPaymentEntry = `${formattedAmount} AS ${params.paymentType} ON ${weekday} ${params.nepaliDate} IN ${params.bank}`;

  // Step 3 — Append to existing (matching backend lines 3704-3711)
  // NOTE: payments are APPENDED (newest at bottom), unlike status logs which prepend
  const updatedPaymentsMade = params.existingPaymentsMade
    ? `${params.existingPaymentsMade}\n${newPaymentEntry}`
    : newPaymentEntry;

  const updatedPaymentDatesAD = params.existingPaymentDatesAD
    ? `${params.existingPaymentDatesAD}\n${params.nepaliDateAD}`
    : params.nepaliDateAD;

  // Step 4 — Recalculate totals (matching backend lines 3717-3736)
  const allPayments = updatedPaymentsMade.split('\n').filter(Boolean);
  let totalPaid = 0;
  for (const entry of allPayments) {
    const match = entry.match(/NPR\s*([\d,]+)\s*\/-/i);
    if (match) {
      totalPaid += parseInt(match[1].replace(/,/g, ''), 10);
    } else {
      const fallbackMatch = entry.match(/NPR\s*([\d,]+)/i);
      if (fallbackMatch) {
        totalPaid += parseInt(fallbackMatch[1].replace(/,/g, ''), 10);
      }
    }
  }
  const remaining = params.finalQuotationAmount - totalPaid;
  const remainingPayment = `NPR ${remaining.toLocaleString('en-IN')}/-`;

  return { updatedPaymentsMade, updatedPaymentDatesAD, remainingPayment, totalPaid };
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
