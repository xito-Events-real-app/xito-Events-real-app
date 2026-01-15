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
}

export interface ClientData {
  rowNumber?: number;
  registeredDateTimeAD?: string;
  registeredDateBS?: string;
  clientName: string;
  source: string;
  clientLocation?: string;
  currentCountry?: string;
  contactNo?: string;
  whatsappNo?: string;
  eventLocation?: string;
  eventCity?: string;
  events?: string;
  eventYear?: string;
  eventMonth?: string;
  eventDay?: string;
  eventDateAD?: string;
  whoAdded?: string;
  inquiryDateAD?: string;
  inquiryDateBS?: string;
  inquiryTime?: string;
  description?: string;
  statusLog?: string;
  initialStatus?: string;
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
