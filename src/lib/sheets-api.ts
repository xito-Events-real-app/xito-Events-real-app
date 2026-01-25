import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = ""; // Will be set via localStorage or config

export interface DropdownData {
  sources: string[];
  clientLocations: string[];
  eventLocations: string[];
  preweddingEvents: string[];
  weddingEvents: string[];
  postweddingEvents: string[];
  oldClients: string[];
  whatsappOwners: string[];
  clientStatuses: string[];
  mindsetOptions: string[]; // Column K - Mindset options for QUOTATION SENT
  paymentTypes: string[]; // Column P - Payment types
  banks: string[]; // Column Q - Bank names
  companyNames: string[]; // Column W - Company names
  serviceTypes: string[]; // Column X - Service types
}

export interface ClientData {
  rowNumber?: number;
  registeredDateTimeAD?: string;  // Column A
  registeredDateBS?: string;       // Column B
  clientName: string;              // Column C
  source: string;                  // Column D
  clientLocation?: string;         // Column E - INSIDE/OUTSIDE NEPAL
  currentCountry?: string;         // Column F - Country name
  contactNo?: string;              // Column G
  whatsappNo?: string;             // Column H
  email?: string;                  // Column I - Client email
  eventLocation?: string;          // Column J
  eventCity?: string;              // Column K
  events?: string;                 // Column L
  eventYear?: string;              // Column M
  eventMonth?: string;             // Column N
  eventDay?: string;               // Column O
  eventDateAD?: string;            // Column P
  whoAdded?: string;               // Column Q
  inquiryDateAD?: string;          // Column R
  inquiryDateBS?: string;          // Column S
  inquiryTime?: string;            // Column T
  description?: string;            // Column U
  quotationData?: string;          // Column V - quotation amounts
  statusLog?: string;              // Column W
  initialStatus?: string;          // For initial status selection
  clientHandler?: string;          // Column X - who is handling this client
  callLog?: string;                // Column Y - call attempt history
  mindset?: string;                // Column Z - mindset with timestamp
  ourBargainedRates?: string;      // Column AA - our bargained rates
  clientBargainedRates?: string;   // Column AB - client bargained rates
  comments?: string;               // Column AC - comments with timestamps
  finalQuotation?: string;         // Column AD - final booked quotation
  paymentsMade?: string;           // Column AE - payments made log
  paymentDatesAD?: string;         // Column AF - payment dates in AD format
  remainingPayment?: string;       // Column AG - remaining payment
  companyName?: string;            // Column AH - company name
  serviceTypes?: string;           // Column AI - service types (multi, "/" separated)
}

export interface BookedClientData extends ClientData {
  bookedRowNumber: number;
  originalRowNumber: number;
  bookedDateTime: string;
}

// Spreadsheet ID is now configured as a backend secret
// These functions are kept for backward compatibility
export function getSpreadsheetId(): string {
  return "configured"; // Return non-empty to indicate configured
}

export function setSpreadsheetId(_id: string): void {
  // No-op - spreadsheet ID is now managed as a backend secret
  console.log("Spreadsheet ID is now configured as a backend secret");
}

async function callSheetsFunction<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  // Spreadsheet ID is configured in the backend secret
  const { data: result, error } = await supabase.functions.invoke("google-sheets", {
    body: {
      action,
      ...data,
    },
  });

  if (error) {
    console.error("Sheets API error:", error);
    throw new Error(error.message || "Failed to connect to Google Sheets");
  }

  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  return result.data as T;
}

export async function getDropdowns(): Promise<DropdownData> {
  return callSheetsFunction<DropdownData>("getDropdowns");
}

export async function getClients(limit = 50): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("getClients", { limit });
}

export async function addClient(clientData: ClientData): Promise<void> {
  await callSheetsFunction("addClient", { data: clientData });
}

export async function updateClient(clientData: ClientData): Promise<void> {
  await callSheetsFunction("updateClient", { data: clientData });
}

export async function searchClients(query: string): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("searchClients", { searchQuery: query });
}

export async function getClientStatuses(): Promise<string[]> {
  return callSheetsFunction<string[]>("getClientStatuses");
}

export async function updateClientStatus(
  rowNumber: number,
  newStatus: string,
  existingStatusLog: string
): Promise<{ success: boolean; statusLog: string }> {
  // Generate timestamp on client side to ensure correct local time
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const clientTimestamp = `${month}/${day}/${year}, ${hours}:${mins}:${secs}`;
  
  return callSheetsFunction<{ success: boolean; statusLog: string }>("updateClientStatus", {
    data: { rowNumber, newStatus, existingStatusLog, clientTimestamp },
  });
}

export async function addOldClient(clientName: string): Promise<{ success: boolean; message: string; alreadyExists: boolean }> {
  return callSheetsFunction<{ success: boolean; message: string; alreadyExists: boolean }>("addOldClient", {
    data: { clientName },
  });
}

export async function bulkUpdateStatus(fromStatus: string, toStatus: string): Promise<{ success: boolean; updatedCount: number }> {
  return callSheetsFunction<{ success: boolean; updatedCount: number }>("bulkUpdateStatus", {
    data: { fromStatus, toStatus },
  });
}

export async function updateClientHandler(
  rowNumber: number,
  handler: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientHandler", {
    data: { rowNumber, handler },
  });
}

export async function logCallAttempt(
  rowNumber: number,
  callType: 'DIRECT' | 'WHATSAPP',
  existingCallLog: string
): Promise<{ success: boolean; callLog: string }> {
  // Generate timestamp on client side to ensure correct local time
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
  
  return callSheetsFunction<{ success: boolean; callLog: string }>("logCallAttempt", {
    data: { rowNumber, callType, existingCallLog, clientTime: timeStr, clientDate: dateStr },
  });
}

export async function updateClientQuotation(
  rowNumber: number,
  quotationData: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientQuotation", {
    data: { rowNumber, quotationData },
  });
}

export async function updateClientMindset(
  rowNumber: number,
  mindset: string
): Promise<{ success: boolean; mindset: string }> {
  // Generate timestamp on client side to ensure correct local time
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const clientTimestamp = `${month}/${day}/${year}, ${hours}:${mins}:${secs}`;
  
  return callSheetsFunction<{ success: boolean; mindset: string }>("updateClientMindset", {
    data: { rowNumber, mindset, clientTimestamp },
  });
}

export async function updateBargainingRates(
  rowNumber: number,
  ourRates: string,
  clientRates: string
): Promise<{ success: boolean; ourBargainedRates: string; clientBargainedRates: string }> {
  return callSheetsFunction<{ success: boolean; ourBargainedRates: string; clientBargainedRates: string }>("updateBargainingRates", {
    data: { rowNumber, ourRates, clientRates },
  });
}

// Update only client bargained rates (Column AB) - used in BARGAINING IS ON category
export async function updateClientBargainedRates(
  rowNumber: number,
  clientRates: string
): Promise<{ success: boolean; clientBargainedRates: string }> {
  return callSheetsFunction<{ success: boolean; clientBargainedRates: string }>("updateClientBargainedRates", {
    data: { rowNumber, clientRates },
  });
}

// Update only our counter rates (Column AA) - used in BARGAINING IS ON category
export async function updateOurCounterRates(
  rowNumber: number,
  ourRates: string
): Promise<{ success: boolean; ourBargainedRates: string }> {
  return callSheetsFunction<{ success: boolean; ourBargainedRates: string }>("updateOurCounterRates", {
    data: { rowNumber, ourRates },
  });
}

export async function addClientComment(
  rowNumber: number,
  comment: string,
  existingComments: string
): Promise<{ success: boolean; comments: string }> {
  // Generate timestamp on client side to ensure correct local time
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const clientTimestamp = `${month}/${day}/${year} ${hours}:${mins}`;
  
  return callSheetsFunction<{ success: boolean; comments: string }>("addClientComment", {
    data: { rowNumber, comment, existingComments, clientTimestamp },
  });
}

export async function updateFinalQuotation(
  rowNumber: number,
  finalQuotation: string
): Promise<{ success: boolean; finalQuotation: string }> {
  return callSheetsFunction<{ success: boolean; finalQuotation: string }>("updateFinalQuotation", {
    data: { rowNumber, finalQuotation },
  });
}

export async function addPayment(
  rowNumber: number,
  paymentAmount: string,
  paymentType: string,
  nepaliDate: string,
  nepaliDateAD: string, // AD equivalent of the selected Nepali date
  bank: string,
  existingPaymentsMade: string,
  existingPaymentDatesAD: string,
  finalQuotationAmount: number,
  registeredDateTimeAD?: string, // For two-way sync
  sourceSheet?: 'tracker' | 'booked' // Which sheet the payment is coming from
): Promise<{ 
  success: boolean; 
  paymentsMade: string; 
  paymentDatesAD: string;
  remainingPayment: string;
  totalPaid: number;
}> {
  return callSheetsFunction<{ 
    success: boolean; 
    paymentsMade: string; 
    paymentDatesAD: string;
    remainingPayment: string;
    totalPaid: number;
  }>("addPayment", {
    data: { 
      rowNumber, 
      paymentAmount, 
      paymentType, 
      nepaliDate, 
      nepaliDateAD,
      bank, 
      existingPaymentsMade, 
      existingPaymentDatesAD,
      finalQuotationAmount,
      registeredDateTimeAD,
      sourceSheet
    },
  });
}

export interface ConnectionTestResult {
  title: string;
  sheets: string[];
  serviceAccountEmail: string;
  spreadsheetIdMasked: string;
}

export async function testConnection(): Promise<ConnectionTestResult> {
  return callSheetsFunction<ConnectionTestResult>("testConnection");
}

// Check if the sheets integration is configured
// Now always returns true since it's configured via backend secret
export function isSheetsConfigured(): boolean {
  return true;
}

// Get all booked clients from BOOKED CLIENTS sheet
export async function getBookedClients(limit = 100): Promise<BookedClientData[]> {
  return callSheetsFunction<BookedClientData[]>("getBookedClients", { limit });
}

// Migrate existing booked clients from CLIENT TRACKER to BOOKED CLIENTS
export async function migrateExistingBookedClients(): Promise<{ success: boolean; migratedCount: number }> {
  return callSheetsFunction<{ success: boolean; migratedCount: number }>("migrateExistingBookedClients");
}

// Resync all booked clients: sync payment data from CLIENT TRACKER to BOOKED CLIENTS
export async function resyncAllBookedClients(): Promise<{ 
  success: boolean; 
  syncedCount: number; 
  skippedCount: number; 
  notFoundCount: number; 
  totalBooked: number; 
}> {
  return callSheetsFunction<{ 
    success: boolean; 
    syncedCount: number; 
    skippedCount: number; 
    notFoundCount: number; 
    totalBooked: number; 
  }>("resyncAllBookedClients");
}

// Full resync all booked clients: sync ALL data (not just payments) from CLIENT TRACKER to BOOKED CLIENTS
// Also finds and copies missing BOOKED clients from CLIENT TRACKER
// forceSync = true will skip comparison and always copy ALL data from tracker
export async function fullResyncAllBookedClients(forceSync: boolean = false): Promise<{ 
  success: boolean;
  copiedCount: number;
  syncedCount: number; 
  skippedCount: number; 
  notFoundCount: number; 
  totalBooked: number; 
}> {
  return callSheetsFunction<{ 
    success: boolean;
    copiedCount: number;
    syncedCount: number; 
    skippedCount: number; 
    notFoundCount: number; 
    totalBooked: number; 
  }>("fullResyncAllBookedClients", { data: { forceSync } });
}

// Update a booked client (syncs to both sheets)
export async function updateBookedClient(
  bookedRowNumber: number,
  originalRowNumber: number,
  updates: Partial<BookedClientData>
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateBookedClient", {
    data: { bookedRowNumber, originalRowNumber, updates },
  });
}

// Helper to get current status from status log
export function getCurrentStatus(statusLog: string): string {
  if (!statusLog) return 'UNTOUCHED';
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return 'UNTOUCHED';
  // Get the last line and extract status (format: "STATUS [timestamp]" or "STATUS - timestamp")
  const lastLine = lines[lines.length - 1];
  // Handle both formats: "STATUS [timestamp]" and "STATUS - timestamp"
  let statusPart = lastLine.split(' [')[0]; // Try bracket format first
  if (statusPart === lastLine) {
    statusPart = lastLine.split(' - ')[0]; // Fallback to dash format
  }
  return statusPart.trim().toUpperCase();
}
