import { supabase } from "@/integrations/supabase/client";

export interface VideoEditRow {
  rowNumber: number;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  videoEditStatus: string;
  urgency: string;
  priority: string;
  subEventName: string;
  editType: string;
  editor: string;
  companyNotes: string;
  clientDemand: string;
  reference: string;
  songs: string; // JSON: {link, notes}
}

async function callSheetsFunction<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  const { data: result, error } = await supabase.functions.invoke("google-sheets", {
    body: { action, ...data },
  });

  if (error) {
    console.error("Video Edit API error:", error);
    throw new Error(error.message || "Failed to connect to backend");
  }

  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  return result.data as T;
}

export async function getVideoEditRows(): Promise<VideoEditRow[]> {
  return callSheetsFunction<VideoEditRow[]>("getVideoEditRows");
}

export async function updateVideoEditField(
  rowNumber: number,
  field: string,
  value: string
): Promise<{ success: boolean }> {
  return callSheetsFunction("updateVideoEditRow", {
    data: { rowNumber, updates: { [field]: value } },
  });
}

export async function updateVideoEditRow(
  rowNumber: number,
  updates: Record<string, string>
): Promise<{ success: boolean }> {
  return callSheetsFunction("updateVideoEditRow", {
    data: { rowNumber, updates },
  });
}

export async function generateVideoEditRows(): Promise<{ success: boolean; generatedCount: number }> {
  return callSheetsFunction("generateVideoEditRows");
}

export async function pushToLab(rowNumber: number): Promise<{ success: boolean }> {
  return callSheetsFunction("pushVideoEditToLab", {
    data: { rowNumber },
  });
}
