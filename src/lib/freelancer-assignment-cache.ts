import { supabase } from "@/integrations/supabase/client";
import { FreelancerAssignment, FreelancerField } from "./freelancer-assignment-api";

// Map frontend camelCase fields to Supabase snake_case columns
const FIELD_TO_COLUMN: Record<FreelancerField, string> = {
  photographerBride: 'photographer_bride',
  photographerGroom: 'photographer_groom',
  videographerBride: 'videographer_bride',
  videographerGroom: 'videographer_groom',
  extraPhotographer: 'extra_photographer',
  extraVideographer: 'extra_videographer',
  assistant: 'assistant',
  iphoneShooter: 'iphone_shooter',
  droneOperator: 'drone_operator',
  fpvOperator: 'fpv_operator',
};

interface SupabaseAssignmentRow {
  id: string;
  registered_date_time_ad: string;
  registered_date_bs: string;
  client_name: string;
  event: string;
  event_year: string;
  event_month: string;
  event_day: string;
  event_date_ad: string;
  photographer_bride: string;
  photographer_groom: string;
  videographer_bride: string;
  videographer_groom: string;
  extra_photographer: string;
  extra_videographer: string;
  assistant: string;
  iphone_shooter: string;
  drone_operator: string;
  fpv_operator: string;
  required_categories: string;
  synced_to_sheet: boolean;
  updated_at: string;
}

function rowToAssignment(row: SupabaseAssignmentRow): FreelancerAssignment {
  return {
    rowNumber: 0, // Not relevant for Supabase-backed data
    registeredDateTimeAD: row.registered_date_time_ad,
    registeredDateBS: row.registered_date_bs || '',
    clientName: row.client_name || '',
    event: row.event,
    eventYear: row.event_year || '',
    eventMonth: row.event_month || '',
    eventDay: row.event_day || '',
    eventDateAD: row.event_date_ad || '',
    photographerBride: row.photographer_bride || '',
    photographerGroom: row.photographer_groom || '',
    videographerBride: row.videographer_bride || '',
    videographerGroom: row.videographer_groom || '',
    extraPhotographer: row.extra_photographer || '',
    extraVideographer: row.extra_videographer || '',
    assistant: row.assistant || '',
    iphoneShooter: row.iphone_shooter || '',
    droneOperator: row.drone_operator || '',
    fpvOperator: row.fpv_operator || '',
    requiredCategories: row.required_categories || '',
  };
}

/** Load all assignments from Supabase cache */
export async function loadAssignmentsFromCache(): Promise<FreelancerAssignment[]> {
  const { data, error } = await supabase
    .from('freelancer_assignments')
    .select('*')
    .order('event_year', { ascending: true })
    .order('event_month', { ascending: true })
    .order('event_day', { ascending: true });

  if (error) throw error;
  return (data as unknown as SupabaseAssignmentRow[]).map(rowToAssignment);
}

/** Check if cache has any data */
export async function isCachePopulated(): Promise<boolean> {
  const { count, error } = await supabase
    .from('freelancer_assignments')
    .select('id', { count: 'exact', head: true });

  if (error) return false;
  return (count || 0) > 0;
}

/** Update a single assignment field in Supabase (instant) */
export async function updateAssignmentInCache(
  registeredDateTimeAD: string,
  event: string,
  field: FreelancerField,
  value: string
): Promise<void> {
  const column = FIELD_TO_COLUMN[field];
  if (!column) throw new Error(`Invalid field: ${field}`);

  const { error } = await supabase
    .from('freelancer_assignments')
    .update({
      [column]: value,
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .eq('event', event);

  if (error) throw error;
}

/** Update required categories in cache */
export async function updateCategoriesInCache(
  registeredDateTimeAD: string,
  event: string,
  categories: string
): Promise<void> {
  const { error } = await supabase
    .from('freelancer_assignments')
    .update({
      required_categories: categories,
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .eq('event', event);

  if (error) throw error;
}

/** Get count of unsynced rows */
export async function getUnsyncedCount(): Promise<number> {
  const { count, error } = await supabase
    .from('freelancer_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('synced_to_sheet', false);

  if (error) return 0;
  return count || 0;
}

/** Trigger the sync edge function to push unsynced rows to Google Sheets */
export async function pushUnsyncedToSheets(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-crew-to-sheets', {
    body: { action: 'push' }
  });
  if (error) throw error;
  return data?.syncedCount || 0;
}

/** Populate Supabase cache from Google Sheets (full pull) */
export async function populateCacheFromSheets(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-crew-to-sheets', {
    body: { action: 'pull' }
  });
  if (error) throw error;
  return data?.count || 0;
}
