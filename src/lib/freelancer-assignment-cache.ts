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

export function rowToAssignment(row: SupabaseAssignmentRow): FreelancerAssignment {
  return {
    id: row.id,
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
  value: string,
  eventDateAD?: string
): Promise<void> {
  const column = FIELD_TO_COLUMN[field];
  if (!column) throw new Error(`Invalid field: ${field}`);

  const { error } = await supabase
    .from('freelancer_assignments')
    .upsert({
      [column]: value,
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
      registered_date_time_ad: registeredDateTimeAD,
      event: event,
      event_date_ad: eventDateAD || '',
    } as any, { onConflict: 'registered_date_time_ad,event,event_date_ad' });

  if (error) throw error;
}

/** Update required categories in cache */
export async function updateCategoriesInCache(
  registeredDateTimeAD: string,
  event: string,
  categories: string,
  eventDateAD?: string
): Promise<void> {
  const { error } = await supabase
    .from('freelancer_assignments')
    .upsert({
      required_categories: categories,
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
      registered_date_time_ad: registeredDateTimeAD,
      event: event,
      event_date_ad: eventDateAD || '',
    } as any, { onConflict: 'registered_date_time_ad,event,event_date_ad' });

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

// populateCacheFromSheets REMOVED — database is the sole source of truth

/**
 * Ensure freelancer_assignments rows are 1:1 with the events in clients_cache.
 * Uses positional matching to detect renames and update in-place (preserving crew assignments).
 * Also propagates renames to freelancer_event_settings and files_management.
 */
export async function ensureFreelancerAssignmentRows(
  registeredDateTimeAD: string,
  clientName: string,
  registeredDateBS: string,
  events: string,
  eventYears: string,
  eventMonths: string,
  eventDays: string,
  eventDatesAD: string
): Promise<void> {
  const names = events.split('\n').filter(Boolean);
  if (names.length === 0) return;

  const years = eventYears.split('\n');
  const months = eventMonths.split('\n');
  const days = eventDays.split('\n');
  const datesAD = eventDatesAD.split('\n');

  // Read existing rows ordered by a stable key to establish positional mapping
  const { data: existing } = await supabase
    .from('freelancer_assignments')
    .select('id, event, event_year, event_month, event_day, event_date_ad')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('event_date_ad', { ascending: true })
    .order('event', { ascending: true });

  const existingList = existing || [];

  // Build positional mapping: index i → existing row at position i
  for (let i = 0; i < names.length; i++) {
    const eventName = names[i];
    const year = years[i] || '';
    const month = months[i] || '';
    const day = days[i] || '';
    const dateAD = datesAD[i] || '';

    if (i < existingList.length) {
      const oldRow = existingList[i];
      // Check if this position's event identity changed (rename detected)
      if (oldRow.event !== eventName || oldRow.event_month !== month || oldRow.event_day !== day) {
        const oldEventName = oldRow.event;

        // Update the assignment row in-place (preserves all crew picks)
        await supabase.from('freelancer_assignments')
          .update({
            event: eventName,
            event_year: year,
            event_month: month,
            event_day: day,
            event_date_ad: dateAD,
            client_name: clientName,
            synced_to_sheet: false,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', oldRow.id);

        console.log(`[CREW SYNC] Renamed event "${oldEventName}" → "${eventName}" for ${clientName}`);

        // Propagate rename to freelancer_event_settings
        await supabase.from('freelancer_event_settings')
          .update({ event_name: eventName } as any)
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .eq('event_name', oldEventName);

        // Propagate rename to files_management
        await supabase.from('files_management')
          .update({
            event_name: eventName,
            event_year: year,
            event_month: month,
            event_day: day,
            event_date_ad: dateAD,
            synced_to_sheet: false,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .eq('event_name', oldEventName);
      }
    } else {
      // New event at a position beyond existing list — insert skeleton
      await supabase.from('freelancer_assignments').upsert({
        registered_date_time_ad: registeredDateTimeAD,
        registered_date_bs: registeredDateBS,
        client_name: clientName,
        event: eventName,
        event_year: year,
        event_month: month,
        event_day: day,
        event_date_ad: dateAD,
        synced_to_sheet: false,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'registered_date_time_ad,event,event_date_ad' });
      console.log(`[CREW SYNC] Inserted skeleton row for "${eventName}" for ${clientName}`);
    }
  }

  // Delete rows beyond the new event count (events truly removed)
  if (existingList.length > names.length) {
    const toDelete = existingList.slice(names.length);
    const ids = toDelete.map(r => r.id);
    await supabase.from('freelancer_assignments').delete().in('id', ids);

    // CASCADE: soft-delete files & video edit; hard-delete freelancer settings
    for (const removedRow of toDelete) {
      await supabase.from('files_management')
        .update({ deleted_or_not: true, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .eq('event_name', removedRow.event);

      await supabase.from('video_edit_tracker')
        .update({ deleted: true, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .eq('event_name', removedRow.event);

      await supabase.from('freelancer_event_settings')
        .delete()
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .eq('event_name', removedRow.event);
    }

    console.log(`[CREW SYNC] Deleted ${toDelete.length} removed event rows + cascaded for ${clientName}`);
  }
}
