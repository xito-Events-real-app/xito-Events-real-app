import { supabase } from "@/integrations/supabase/client";

export interface DailyTask {
  rowNumber: number;
  dateAD: string;
  dateBS: string;
  taskName: string;
  description: string;
  deadline: string;
  handler: string;
  backupHandler: string;
  contactNo: string;
  whatsappNo: string;
  urgency: number;
  status: string;
}

export interface DailyTaskSetupData {
  handlers: string[];
  handlerWhatsApp: Record<string, string>;
}

async function callEdgeFunction(action: string, data?: Record<string, unknown>) {
  const { data: result, error } = await supabase.functions.invoke('google-sheets', {
    body: { action, data },
  });

  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!result?.success) throw new Error(result?.error || 'Unknown error');
  return result.data;
}

export async function getDailyTasks(): Promise<DailyTask[]> {
  return callEdgeFunction('getDailyTasks');
}

export async function addDailyTask(task: Omit<DailyTask, 'rowNumber'>): Promise<{ success: boolean }> {
  return callEdgeFunction('addDailyTask', task as unknown as Record<string, unknown>);
}

export async function updateDailyTaskStatus(rowNumber: number, newStatus: string): Promise<{ success: boolean }> {
  return callEdgeFunction('updateDailyTaskStatus', { rowNumber, newStatus });
}

export async function getDailyTaskSetupData(): Promise<DailyTaskSetupData> {
  return callEdgeFunction('getDailyTaskSetupData');
}
