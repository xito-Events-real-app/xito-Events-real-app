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
}

// Get spreadsheet ID from localStorage
export function getSpreadsheetId(): string {
  return localStorage.getItem("wtn_spreadsheet_id") || "";
}

export function setSpreadsheetId(id: string): void {
  localStorage.setItem("wtn_spreadsheet_id", id);
}

async function callSheetsFunction<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  const spreadsheetId = getSpreadsheetId();
  
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID not configured. Please set it in settings.");
  }

  const { data: result, error } = await supabase.functions.invoke("google-sheets", {
    body: {
      action,
      spreadsheetId,
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

export async function searchClients(query: string): Promise<ClientData[]> {
  return callSheetsFunction<ClientData[]>("searchClients", { searchQuery: query });
}

// Check if the sheets integration is configured
export function isSheetsConfigured(): boolean {
  return !!getSpreadsheetId();
}
