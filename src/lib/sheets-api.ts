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
  relationOptions: string[]; // Column R - Relation options for backup contacts
  companyNames: string[]; // Column W - Company names
  serviceTypes: string[]; // Column X - Service types
  allEvents: string[]; // From EVENT SETUP DATA sheet - single source of truth
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
  lastActivityLog?: string;        // Column AJ - Last activity timestamp log
  priority?: string;               // Column AK - Star rating (1-5)
  benzoKeepNotes?: string;         // Column AL - Benzo Keep notes (JSON format)
  _source?: 'tracker' | 'booked'; // Source sheet indicator for unified queries
}

export interface BookedClientData extends ClientData {
  bookedRowNumber: number;
  originalRowNumber: number;
  bookedDateTime: string;
}

export interface BookedEventDetails {
  rowNumber: number;
  registeredDateTimeAD: string;   // A - Unique ID
  registeredDateBS: string;       // B
  clientName: string;             // C
  events: string;                 // D (from L)
  eventYear: string;              // E (from M)
  eventMonth: string;             // F (from N)
  eventDay: string;               // G (from O)
  eventDateAD: string;            // H (from P)
  // Column I is empty/reserved
  venueType: string;              // J
  venueName: string;              // K
  venueCity: string;              // L
  venueArea: string;              // M
  venueMap: string;               // N
  eventStartTime: string;         // O
  eventEndTime: string;           // P
  parlourType: string;            // Q
  parlourName: string;            // R
  parlourCity: string;            // S
  parlourArea: string;            // T
  parlourMap: string;             // U
  parlourStartTime: string;       // V
  parlourEndTime: string;         // W
  preShootVenueType: string;      // X
  preShootVenueName: string;      // Y
  preShootVenueCity: string;      // Z
  preShootVenueArea: string;      // AA
  preShootVenueMap: string;       // AB
  preShootStartTime: string;      // AC
  preShootEndTime: string;        // AD
  doGroomComeInMehndi: string;    // AE
  noOfGuest: string;              // AF
  eventDemand: string;            // AG
  eventReferences: string;        // AH
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

// Get all events from EVENT SETUP DATA sheet
export async function getEventSetupData(): Promise<string[]> {
  return callSheetsFunction<string[]>("getEventSetupData");
}

export async function getClients(limit = 50): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("getClients", { limit });
}

// Get ALL clients from BOTH sheets (CLIENT TRACKER + BOOKED CLIENTS)
// This is the primary endpoint for features needing unified data: Hot Dates, Calendar, Search
export async function getAllClients(limit = 500): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("getAllClients", { limit });
}

// Get a single client by their unique registeredDateTimeAD identifier
// Searches both CLIENT TRACKER and BOOKED CLIENTS sheets
export async function getSingleClient(registeredDateTimeAD: string): Promise<ClientData | null> {
  return callSheetsFunction<ClientData | null>("getSingleClient", {
    data: { registeredDateTimeAD },
  });
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
  existingStatusLog: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; statusLog: string; movedToBooked?: boolean; actualRowNumber?: number }> {
  // Generate timestamp on client side to ensure correct local time
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const clientTimestamp = `${month}/${day}/${year}, ${hours}:${mins}:${secs}`;
  
  return callSheetsFunction<{ success: boolean; statusLog: string; movedToBooked?: boolean; actualRowNumber?: number }>("updateClientStatus", {
    data: { rowNumber, newStatus, existingStatusLog, clientTimestamp, registeredDateTimeAD },
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
  quotationData: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientQuotation", {
    data: { rowNumber, quotationData, registeredDateTimeAD },
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

// Update client priority (Column AK) - Star rating 1-5
export async function updateClientPriority(
  rowNumber: number,
  priority: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientPriority", {
    data: { rowNumber, priority, registeredDateTimeAD },
  });
}

// Update Benzo Keep Notes (Column AL) - JSON formatted notes
export async function updateBenzoKeepNotes(
  rowNumber: number,
  notesData: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; benzoKeepNotes: string }> {
  return callSheetsFunction<{ success: boolean; benzoKeepNotes: string }>("updateBenzoKeepNotes", {
    data: { rowNumber, notesData, registeredDateTimeAD },
  });
}

export async function addClientComment(
  rowNumber: number,
  comment: string,
  existingComments: string,
  registeredDateTimeAD?: string
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
    data: { rowNumber, comment, existingComments, clientTimestamp, registeredDateTimeAD },
  });
}

// Add comment to BOOKED CLIENTS sheet (Column AC) and sync to CLIENT TRACKER
export async function addBookedClientComment(
  bookedRowNumber: number,
  comment: string,
  existingComments: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; comments: string }> {
  // Generate timestamp on client side to ensure correct local time
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const clientTimestamp = `${month}/${day}/${year} ${hours}:${mins}`;
  
  return callSheetsFunction<{ success: boolean; comments: string }>("addBookedClientComment", {
    data: { bookedRowNumber, comment, existingComments, clientTimestamp, registeredDateTimeAD },
  });
}

export async function updateFinalQuotation(
  rowNumber: number,
  finalQuotation: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; finalQuotation: string }> {
  return callSheetsFunction<{ success: boolean; finalQuotation: string }>("updateFinalQuotation", {
    data: { rowNumber, finalQuotation, registeredDateTimeAD },
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
  registeredDateTimeAD?: string, // For row lookup in BOOKED CLIENTS
  clientName?: string // For income statement in WTN INCOME & EXPENSES
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
      clientName
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

// Sync detail for the report
export interface SyncDetail {
  clientName: string;
  bookedRow: number;
  trackerRow: number;
  changedColumns: string[];
}

// Full resync all booked clients: validates existing data in BOOKED CLIENTS
// NOTE: This function NO LONGER copies clients between sheets (single source of truth)
// The ONLY way to add a client to BOOKED CLIENTS is via status change to "BOOKED"
export async function fullResyncAllBookedClients(forceSync: boolean = false): Promise<{ 
  success: boolean;
  restoredToTrackerCount?: number;
  restoredToTracker?: string[];
  copiedCount: number;
  syncedCount: number; 
  skippedCount: number; 
  notFoundCount: number; 
  totalBooked: number;
  syncDetails?: SyncDetail[];
  message?: string;
}> {
  return callSheetsFunction<{ 
    success: boolean;
    restoredToTrackerCount?: number;
    restoredToTracker?: string[];
    copiedCount: number;
    syncedCount: number; 
    skippedCount: number; 
    notFoundCount: number; 
    totalBooked: number;
    syncDetails?: SyncDetail[];
    message?: string;
  }>("fullResyncAllBookedClients", { data: { forceSync } });
}

// One-time cleanup: Delete BOOKED clients from CLIENT TRACKER that already exist in BOOKED CLIENTS
// This enforces the single source of truth architecture
export async function cleanupDuplicateBookedFromTracker(): Promise<{
  success: boolean;
  deletedCount: number;
  deletedClients: string[];
  message: string;
}> {
  return callSheetsFunction<{
    success: boolean;
    deletedCount: number;
    deletedClients: string[];
    message: string;
  }>("cleanupDuplicateBookedFromTracker");
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

// Update an existing payment entry
export async function updatePayment(
  rowNumber: number,
  paymentIndex: number,
  newAmount: string,
  newType: string,
  newYear: string,
  newMonth: string,
  newDay: string,
  newBank: string,
  existingPaymentsMade: string,
  finalQuotationAmount: number,
  registeredDateTimeAD?: string
): Promise<{ 
  success: boolean; 
  paymentsMade: string; 
  remainingPayment: string;
}> {
  return callSheetsFunction<{ 
    success: boolean; 
    paymentsMade: string; 
    remainingPayment: string;
  }>("updatePayment", {
    data: { 
      rowNumber, 
      paymentIndex,
      newAmount, 
      newType, 
      newYear,
      newMonth,
      newDay,
      newBank, 
      existingPaymentsMade, 
      finalQuotationAmount,
      registeredDateTimeAD
    },
  });
}

// Helper to get current status from status log — robust, timestamp-aware parser
// Re-exports the canonical implementation from client-card-utils
import { getCurrentStatus as _getStatusImpl } from '@/lib/client-card-utils';
export function getCurrentStatus(statusLog: string): string {
  return _getStatusImpl(statusLog);
}

// ============= BOOKED CLIENTS EVENT DETAILS API =============

// Get all event details from BOOKED CLIENTS EVENT DETAILS sheet
export async function getBookedEventDetails(limit = 200): Promise<BookedEventDetails[]> {
  return callSheetsFunction<BookedEventDetails[]>("getBookedEventDetails", { limit });
}

// Sync a single client to EVENT DETAILS (by registeredDateTimeAD)
export async function syncToEventDetails(registeredDateTimeAD: string): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("syncToEventDetails", {
    data: { registeredDateTimeAD },
  });
}

// Full sync: Copy all missing clients from BOOKED CLIENTS to EVENT DETAILS
// Also updates columns A-C and D-H for existing entries (preserving J-AH user data)
export async function fullSyncEventDetails(): Promise<{ 
  success: boolean; 
  copiedCount: number; 
  updatedCount: number; 
  totalEvents: number;
}> {
  return callSheetsFunction<{ 
    success: boolean; 
    copiedCount: number; 
    updatedCount: number; 
    totalEvents: number;
  }>("fullSyncEventDetails");
}

// Update event detail columns (J-AH) for a specific row
export async function updateEventDetails(
  rowNumber: number,
  updates: Partial<BookedEventDetails>
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateEventDetails", {
    data: { rowNumber, updates },
  });
}

// ============= EVENT DETAILS BY CLIENT (NEW) =============

export interface ClientEventDetail {
  eventIndex: number;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  venueType: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  eventStartTime: string;
  eventEndTime: string;
  parlourType: string;
  parlourName: string;
  parlourCity: string;
  parlourArea: string;
  parlourMap: string;
  parlourStartTime: string;
  parlourEndTime: string;
  doGroomComeInMehndi: string;
  guestCount: string;
  eventDemands: string[];
  eventReferences: string[];
}

export interface ClientEventDetailsResponse {
  rowNumber: number;
  events: ClientEventDetail[];
}

// Get event details for a specific client, parsed by event index
export async function getClientEventDetails(
  registeredDateTimeAD: string
): Promise<ClientEventDetailsResponse> {
  return callSheetsFunction<ClientEventDetailsResponse>("getClientEventDetails", {
    data: { registeredDateTimeAD },
  });
}

// Update event details for a specific event (by event index) for a client
export async function updateClientEventDetails(
  registeredDateTimeAD: string,
  eventIndex: number,
  updates: Partial<Omit<ClientEventDetail, 'eventIndex' | 'eventName' | 'eventYear' | 'eventMonth' | 'eventDay' | 'eventDateAD' | 'eventDemands' | 'eventReferences'>> & {
    eventDemands?: string;
    eventReferences?: string;
  }
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientEventDetails", {
    data: { registeredDateTimeAD, eventIndex, updates },
  });
}

// ============= BULK EVENT DETAILS API =============

export interface BulkEventDetail {
  eventIndex: number;
  eventName: string;
  eventDateAD: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  eventStartTime: string;
  eventEndTime: string;
  parlourName: string;
  parlourCity: string;
  parlourArea: string;
  parlourMap: string;
  parlourStartTime: string;
  parlourEndTime: string;
  guestCount: string;
  eventDemand: string;
  eventReferences: string;
}

// Get event details for multiple clients in a single API call
// Returns a map keyed by registeredDateTimeAD
export async function getBulkEventDetails(
  clientIds: string[]
): Promise<Record<string, BulkEventDetail[]>> {
  if (!clientIds || clientIds.length === 0) {
    return {};
  }
  return callSheetsFunction<Record<string, BulkEventDetail[]>>("getBulkEventDetails", {
    data: { clientIds },
  });
}

// ============= CONTACT DETAILS SYNC API =============

// Full sync: Copy all missing clients from BOOKED CLIENTS to BOOKED CLIENTS CONTACT DETAILS
// Also updates columns A-C for existing entries (preserving D-AA user data)
export async function fullSyncContactDetails(): Promise<{ 
  success: boolean; 
  copiedCount: number; 
  updatedCount: number; 
  totalClients: number;
}> {
  return callSheetsFunction<{ 
    success: boolean; 
    copiedCount: number; 
    updatedCount: number; 
    totalClients: number;
  }>("fullSyncContactDetails");
}

// Resync a single client's A-C data from BOOKED CLIENTS to CONTACT DETAILS
export async function resyncClientContactDetails(registeredDateTimeAD: string): Promise<{
  rowNumber: number;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  brideFullName: string;
  brideContactNumber: string;
  brideWhatsappNumber: string;
  brideBackupNumber: string;
  brideBackupRelation: string;
  brideBackupNumber2: string;
  brideBackupRelation2: string;
  brideInstagram: string;
  brideHomeCity: string;
  brideHomeArea: string;
  brideHomeMap: string;
  brideHomeLandmark: string;
  groomFullName: string;
  groomContactNumber: string;
  groomWhatsappNumber: string;
  groomBackupNumber: string;
  groomBackupRelation: string;
  groomBackupNumber2: string;
  groomBackupRelation2: string;
  groomInstagram: string;
  groomHomeCity: string;
  groomHomeArea: string;
  groomHomeMap: string;
  groomHomeLandmark: string;
}> {
  return callSheetsFunction("resyncClientContactDetails", {
    data: { registeredDateTimeAD },
  });
}

// ============= UNASSIGNED BENZO KEEP NOTES =============

export interface UnassignedBenzoNote {
  id: string;
  content: string;
  markerColor: 'yellow' | 'green' | 'pink' | 'blue' | 'orange';
  createdAt: string;
  lastUpdated: string;
  isStarred?: boolean;
}

// Get all unassigned Benzo Keep notes from Column AM
export async function getUnassignedBenzoKeepNotes(): Promise<UnassignedBenzoNote[]> {
  return callSheetsFunction<UnassignedBenzoNote[]>("getUnassignedBenzoKeepNotes");
}

// Save/update an unassigned Benzo Keep note
export async function saveUnassignedBenzoKeepNote(note: UnassignedBenzoNote): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("saveUnassignedBenzoKeepNote", {
    data: { note },
  });
}

// Delete an unassigned Benzo Keep note
export async function deleteUnassignedBenzoKeepNote(noteId: string): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("deleteUnassignedBenzoKeepNote", {
    data: { noteId },
  });
}

// Transfer an unassigned note to a client's Benzo Keep (Column AL)
export async function transferBenzoKeepNote(
  noteId: string,
  targetClientRegisteredDateTimeAD: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("transferBenzoKeepNote", {
    data: { noteId, targetClientRegisteredDateTimeAD },
  });
}

// Get clients for note assignment (CLIENT TRACKER only, sorted by most recent)
export async function getClientsForNoteAssignment(): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("getClientsForNoteAssignment");
}

// Assign a new Benzo Keep note directly to a client's Column AL
export async function assignBenzoKeepNoteToClient(
  registeredDateTimeAD: string,
  notesData: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("assignBenzoKeepNoteToClient", {
    data: { registeredDateTimeAD, notesData },
  });
}

// Delete a client from all sheets and Supabase cache
export async function deleteClient(
  registeredDateTimeAD: string,
  sheetSource: 'tracker' | 'booked'
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("deleteClient", {
    data: { registeredDateTimeAD, sheetSource },
  });
}

// Reconcile booked clients stuck in tracker sheet
export async function reconcileBookedClients(): Promise<{ success: boolean; reconciledCount: number; reconciledClients?: string[]; totalStuck?: number; message?: string }> {
  return callSheetsFunction<{ success: boolean; reconciledCount: number; reconciledClients?: string[]; totalStuck?: number; message?: string }>("reconcileBookedClients", {});
}
