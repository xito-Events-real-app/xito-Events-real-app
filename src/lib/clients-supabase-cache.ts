import { supabase } from "@/integrations/supabase/client";
import { ClientData, BookedClientData } from "@/lib/sheets-api";

// ============= PUSH SCHEDULER (Phase 2) =============
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isPushing = false;

/** Debounced push of unsynced rows to Google Sheets (3s, single-flight) */
export function schedulePushToSheets(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (isPushing) {
      console.log('[PUSH] Already pushing, will reschedule');
      schedulePushToSheets();
      return;
    }
    isPushing = true;
    try {
      const count = await pushUnsyncedToSheets();
      if (count > 0) {
        console.log(`[PUSH] Auto-pushed ${count} rows to Sheets`);
      }
    } catch (err) {
      console.warn('[PUSH] Auto-push failed, will retry on next edit:', err);
    } finally {
      isPushing = false;
    }
  }, 3000);
}

// Map DB snake_case columns to ClientData camelCase fields
function rowToClientData(row: any): ClientData {
  return {
    rowNumber: row.row_number || 0,
    registeredDateTimeAD: row.registered_date_time_ad || '',
    registeredDateBS: row.registered_date_bs || '',
    clientName: row.client_name || '',
    source: row.source || '',
    clientLocation: row.client_location || '',
    currentCountry: row.current_country || '',
    contactNo: row.contact_no || '',
    whatsappNo: row.whatsapp_no || '',
    email: row.email || '',
    eventLocation: row.event_location || '',
    eventCity: row.event_city || '',
    events: row.events || '',
    eventYear: row.event_year || '',
    eventMonth: row.event_month || '',
    eventDay: row.event_day || '',
    eventDateAD: row.event_date_ad || '',
    whoAdded: row.who_added || '',
    inquiryDateAD: row.inquiry_date_ad || '',
    inquiryDateBS: row.inquiry_date_bs || '',
    inquiryTime: row.inquiry_time || '',
    description: row.description || '',
    quotationData: row.quotation_data || '',
    statusLog: row.status_log || '',
    clientHandler: row.client_handler || '',
    callLog: row.call_log || '',
    mindset: row.mindset || '',
    ourBargainedRates: row.our_bargained_rates || '',
    clientBargainedRates: row.client_bargained_rates || '',
    comments: row.comments || '',
    finalQuotation: row.final_quotation || '',
    paymentsMade: row.payments_made || '',
    paymentDatesAD: row.payment_dates_ad || '',
    remainingPayment: row.remaining_payment || '',
    companyName: row.company_name || '',
    serviceTypes: row.service_types || '',
    lastActivityLog: row.last_activity_log || '',
    priority: row.priority || '',
    benzoKeepNotes: row.benzo_keep_notes || '',
    _source: row.sheet_source as 'tracker' | 'booked',
  };
}

function rowToBookedClientData(row: any): BookedClientData {
  const base = rowToClientData(row);
  return {
    ...base,
    bookedRowNumber: row.row_number || 0,
    originalRowNumber: row.row_number || 0,
    bookedDateTime: row.registered_date_time_ad || '',
  };
}

/** Load all clients from Supabase cache */
export async function loadClientsFromCache(): Promise<ClientData[]> {
  // Need to handle >1000 rows with pagination
  const allRows: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('clients_cache')
      .select('*')
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return allRows.map(rowToClientData);
}

/** Load only tracker clients */
export async function loadTrackerClientsFromCache(): Promise<ClientData[]> {
  const allRows: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('clients_cache')
      .select('*')
      .eq('sheet_source', 'tracker')
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return allRows.map(rowToClientData);
}

/** Load only booked clients */
export async function loadBookedClientsFromCache(): Promise<BookedClientData[]> {
  const allRows: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('clients_cache')
      .select('*')
      .eq('sheet_source', 'booked')
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return allRows.map(rowToBookedClientData);
}

/** Check if cache has any data */
export async function isCachePopulated(): Promise<boolean> {
  const { count, error } = await supabase
    .from('clients_cache')
    .select('registered_date_time_ad', { count: 'exact', head: true });

  if (error) return false;
  return (count || 0) > 0;
}

/** Update a single field in the cache (instant, marks unsynced) */
export async function updateClientFieldInCache(
  registeredDateTimeAD: string,
  field: string,
  value: string
): Promise<void> {
  // Map camelCase field to snake_case column
  const fieldMap: Record<string, string> = {
    clientName: 'client_name',
    source: 'source',
    clientLocation: 'client_location',
    currentCountry: 'current_country',
    contactNo: 'contact_no',
    whatsappNo: 'whatsapp_no',
    email: 'email',
    eventLocation: 'event_location',
    eventCity: 'event_city',
    events: 'events',
    eventYear: 'event_year',
    eventMonth: 'event_month',
    eventDay: 'event_day',
    eventDateAD: 'event_date_ad',
    whoAdded: 'who_added',
    description: 'description',
    quotationData: 'quotation_data',
    statusLog: 'status_log',
    clientHandler: 'client_handler',
    callLog: 'call_log',
    mindset: 'mindset',
    ourBargainedRates: 'our_bargained_rates',
    clientBargainedRates: 'client_bargained_rates',
    comments: 'comments',
    finalQuotation: 'final_quotation',
    paymentsMade: 'payments_made',
    paymentDatesAD: 'payment_dates_ad',
    remainingPayment: 'remaining_payment',
    companyName: 'company_name',
    serviceTypes: 'service_types',
    lastActivityLog: 'last_activity_log',
    priority: 'priority',
    benzoKeepNotes: 'benzo_keep_notes',
  };

  const column = fieldMap[field] || field;

  const { error } = await supabase
    .from('clients_cache')
    .update({
      [column]: value,
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('registered_date_time_ad', registeredDateTimeAD);

  if (error) throw error;
  schedulePushToSheets();
}

/** Update a full client record in cache */
export async function updateClientInCacheRecord(client: ClientData): Promise<void> {
  if (!client.registeredDateTimeAD) return;

  const { error } = await supabase
    .from('clients_cache')
    .update({
      client_name: client.clientName || '',
      source: client.source || '',
      client_location: client.clientLocation || '',
      current_country: client.currentCountry || '',
      contact_no: client.contactNo || '',
      whatsapp_no: client.whatsappNo || '',
      email: client.email || '',
      event_location: client.eventLocation || '',
      event_city: client.eventCity || '',
      events: client.events || '',
      event_year: client.eventYear || '',
      event_month: client.eventMonth || '',
      event_day: client.eventDay || '',
      event_date_ad: client.eventDateAD || '',
      who_added: client.whoAdded || '',
      description: client.description || '',
      quotation_data: client.quotationData || '',
      status_log: client.statusLog || '',
      client_handler: client.clientHandler || '',
      call_log: client.callLog || '',
      mindset: client.mindset || '',
      our_bargained_rates: client.ourBargainedRates || '',
      client_bargained_rates: client.clientBargainedRates || '',
      comments: client.comments || '',
      final_quotation: client.finalQuotation || '',
      payments_made: client.paymentsMade || '',
      payment_dates_ad: client.paymentDatesAD || '',
      remaining_payment: client.remainingPayment || '',
      company_name: client.companyName || '',
      service_types: client.serviceTypes || '',
      last_activity_log: client.lastActivityLog || '',
      priority: client.priority || '',
      benzo_keep_notes: client.benzoKeepNotes || '',
      synced_to_sheet: false,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('registered_date_time_ad', client.registeredDateTimeAD);

  if (error) throw error;
  schedulePushToSheets();
}

/**
 * Atomically migrate a client from 'tracker' to 'booked' in Supabase cache.
 * Sets sheet_source = 'booked', writes all payment + status fields, marks synced_to_sheet = false.
 * This is the Supabase-first step for the BOOKED status migration — no Sheets await required.
 */
export async function migrateClientToBookedInCache(
  registeredDateTimeAD: string,
  newStatusLog: string,
  newPaymentsMade: string,
  newPaymentDatesAD: string,
  newRemainingPayment: string,
): Promise<void> {
  const { error } = await supabase
    .from('clients_cache')
    .update({
      sheet_source: 'booked',
      row_number: 0,              // Invalidate tracker row to prevent overwriting wrong booked row
      status_log: newStatusLog,
      payments_made: newPaymentsMade,
      payment_dates_ad: newPaymentDatesAD,
      remaining_payment: newRemainingPayment,
      synced_to_sheet: true,      // Let updateClientStatus handle the sheet MOVE properly
      updated_at: new Date().toISOString(),
    } as any)
    .eq('registered_date_time_ad', registeredDateTimeAD);

  if (error) throw error;
  schedulePushToSheets();
}

// populateCacheFromSheets REMOVED — database is the sole source of truth

/** Push unsynced rows to Google Sheets */
export async function pushUnsyncedToSheets(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-clients-to-sheets', {
    body: { action: 'push' }
  });
  if (error) throw error;
  return data?.syncedCount || 0;
}

/** Get count of unsynced rows */
export async function getUnsyncedClientCount(): Promise<number> {
  const { count, error } = await supabase
    .from('clients_cache')
    .select('registered_date_time_ad', { count: 'exact', head: true })
    .eq('synced_to_sheet', false);

  if (error) return 0;
  return count || 0;
}
