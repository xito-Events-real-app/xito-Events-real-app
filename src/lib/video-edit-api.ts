import { supabase } from "@/integrations/supabase/client";
import { getCurrentStatus } from "@/lib/client-card-utils";

export interface VideoEditRow {
  id: string;
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
  songs: string;
}

function dbToRow(r: any): VideoEditRow {
  return {
    id: r.id,
    registeredDateTimeAD: r.registered_date_time_ad || '',
    registeredDateBS: r.registered_date_bs || '',
    clientName: r.client_name || '',
    eventName: r.event_name || '',
    eventYear: r.event_year || '',
    eventMonth: r.event_month || '',
    eventDay: r.event_day || '',
    eventDateAD: r.event_date_ad || '',
    videoEditStatus: r.video_edit_status || 'QUEUE',
    urgency: r.urgency || '',
    priority: '',
    subEventName: r.sub_event_name || '',
    editType: r.edit_type || '',
    editor: r.editor || '',
    companyNotes: r.company_notes || '',
    clientDemand: r.client_demand || '',
    reference: r.reference || '',
    songs: r.songs || '',
  };
}

export async function getVideoEditRows(): Promise<VideoEditRow[]> {
  const { data, error } = await supabase
    .from('video_edit_tracker')
    .select('*')
    .eq('deleted', false)
    .order('event_date_ad', { ascending: true });

  if (error) {
    console.error('[VIDEO-EDIT] Load error:', error);
    return [];
  }
  return (data || []).map(dbToRow);
}

export async function updateVideoEditField(id: string, field: string, value: string): Promise<void> {
  // Map camelCase field names to snake_case DB columns
  const fieldMap: Record<string, string> = {
    urgency: 'urgency',
    editor: 'editor',
    videoEditStatus: 'video_edit_status',
    companyNotes: 'company_notes',
    clientDemand: 'client_demand',
    reference: 'reference',
    songs: 'songs',
    subEventName: 'sub_event_name',
    editType: 'edit_type',
  };
  const dbField = fieldMap[field] || field;

  const { error } = await supabase
    .from('video_edit_tracker')
    .update({ [dbField]: value, synced_to_sheet: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[VIDEO-EDIT] Update error:', error);
    throw new Error(error.message);
  }
}

export async function pushToLab(id: string): Promise<void> {
  const { error } = await supabase
    .from('video_edit_tracker')
    .update({ video_edit_status: 'LAB', synced_to_sheet: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[VIDEO-EDIT] Push to lab error:', error);
    throw new Error(error.message);
  }
}

/**
 * Auto-generate video edit rows from past/today events of BOOKED clients.
 * Mirrors the file management auto-generation pattern.
 */
export async function ensureVideoEditRows(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Get all event details where event_date_ad <= today
  const { data: events, error: evErr } = await supabase
    .from('event_details_cache')
    .select('registered_date_time_ad, event_name, event_year, event_month, event_day, event_date_ad')
    .lte('event_date_ad', today)
    .neq('event_date_ad', '')
    .not('event_date_ad', 'is', null);

  if (evErr || !events?.length) return 0;

  // 2. Get unique registered_date_time_ad values and check BOOKED status
  const regDates = [...new Set(events.map(e => e.registered_date_time_ad))];

  // Load clients in batches
  const allClients: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from('clients_cache')
      .select('registered_date_time_ad, client_name, registered_date_bs, status_log')
      .in('registered_date_time_ad', batch);
    if (data) allClients.push(...data);
  }

  // Filter to BOOKED only
  const bookedMap = new Map<string, { client_name: string; registered_date_bs: string }>();
  for (const c of allClients) {
    const status = getCurrentStatus(c.status_log || '').toUpperCase();
    if (status.includes('BOOKED') && !status.includes('SOMEWHERE ELSE')) {
      bookedMap.set(c.registered_date_time_ad, {
        client_name: c.client_name || '',
        registered_date_bs: c.registered_date_bs || '',
      });
    }
  }

  if (bookedMap.size === 0) return 0;

  // 3. Filter events to only BOOKED clients
  const bookedEvents = events.filter(e => bookedMap.has(e.registered_date_time_ad));

  // 4. Load existing video edit rows to deduplicate
  const { data: existingRows } = await supabase
    .from('video_edit_tracker')
    .select('registered_date_time_ad, event_name, sub_event_name, edit_type')
    .eq('deleted', false);

  const existingKeys = new Set(
    (existingRows || []).map(r => `${r.registered_date_time_ad}||${r.event_name}||${r.sub_event_name}||${r.edit_type}`)
  );

  // 5. Load deliverables for video section
  const bookedRegDates = [...bookedMap.keys()];
  const allDeliverables: any[] = [];
  for (let i = 0; i < bookedRegDates.length; i += 50) {
    const batch = bookedRegDates.slice(i, i + 50);
    const { data } = await supabase
      .from('client_deliverables')
      .select('*')
      .in('registered_date_time_ad', batch)
      .eq('section', 'video')
      .eq('enabled', true);
    if (data) allDeliverables.push(...data);
  }

  // Group deliverables by regDate + eventName
  const deliverablesMap = new Map<string, any[]>();
  for (const d of allDeliverables) {
    const key = `${d.registered_date_time_ad}||${d.event_name}`;
    if (!deliverablesMap.has(key)) deliverablesMap.set(key, []);
    deliverablesMap.get(key)!.push(d);
  }

  // 6. Generate rows
  const newRows: any[] = [];

  for (const ev of bookedEvents) {
    const client = bookedMap.get(ev.registered_date_time_ad)!;
    const delKey = `${ev.registered_date_time_ad}||${ev.event_name}`;
    const deliverables = deliverablesMap.get(delKey);

    const baseRow = {
      registered_date_time_ad: ev.registered_date_time_ad,
      registered_date_bs: client.registered_date_bs,
      client_name: client.client_name,
      event_name: ev.event_name || '',
      event_year: ev.event_year || '',
      event_month: ev.event_month || '',
      event_day: ev.event_day || '',
      event_date_ad: ev.event_date_ad || '',
      video_edit_status: 'QUEUE',
      synced_to_sheet: false,
    };

    if (deliverables && deliverables.length > 0) {
      // Generate from configured deliverables
      for (const d of deliverables) {
        const editType = d.deliverable_type || '';
        const qty = d.quantity || 1;
        const itemNames = d.item_names ? d.item_names.split(',').map((n: string) => n.trim()).filter(Boolean) : [];

        if (qty <= 1 && itemNames.length <= 1) {
          const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||${itemNames[0] || ''}||${editType}`;
          if (!existingKeys.has(compositeKey)) {
            newRows.push({ ...baseRow, sub_event_name: itemNames[0] || '', edit_type: editType });
            existingKeys.add(compositeKey);
          }
        } else {
          for (let i = 0; i < qty; i++) {
            const subName = itemNames[i] || `${editType} ${i + 1}`;
            const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||${subName}||${editType}`;
            if (!existingKeys.has(compositeKey)) {
              newRows.push({ ...baseRow, sub_event_name: subName, edit_type: editType });
              existingKeys.add(compositeKey);
            }
          }
        }
      }
    } else {
      // Default: Full Video + Highlights
      for (const editType of ['Full Video', 'Highlights']) {
        const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||||${editType}`;
        if (!existingKeys.has(compositeKey)) {
          newRows.push({ ...baseRow, sub_event_name: '', edit_type: editType });
          existingKeys.add(compositeKey);
        }
      }
    }
  }

  if (newRows.length === 0) return 0;

  // 7. Insert in batches
  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    const { error } = await supabase.from('video_edit_tracker').insert(batch);
    if (error) {
      console.error('[VIDEO-EDIT] Insert error:', error);
    }
  }

  console.log(`[VIDEO-EDIT] Auto-generated ${newRows.length} rows`);
  return newRows.length;
}

/**
 * Sync tracker rows with deliverables: soft-delete QUEUE rows
 * whose deliverable was disabled or replaced by configured ones.
 */
export async function syncWithDeliverables(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Load all QUEUE rows
  const { data: queueRows } = await supabase
    .from('video_edit_tracker')
    .select('id, registered_date_time_ad, event_name, sub_event_name, edit_type')
    .eq('deleted', false)
    .eq('video_edit_status', 'QUEUE');

  if (!queueRows?.length) return 0;

  // 2. Get unique regDates from queue rows
  const regDates = [...new Set(queueRows.map(r => r.registered_date_time_ad))];

  // 3. Load all enabled video deliverables for these clients
  const allDeliverables: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from('client_deliverables')
      .select('*')
      .in('registered_date_time_ad', batch)
      .eq('section', 'video')
      .eq('enabled', true);
    if (data) allDeliverables.push(...data);
  }

  // Group deliverables by regDate + eventName
  const delMap = new Map<string, Set<string>>();
  const hasConfiguredDeliverables = new Set<string>();

  for (const d of allDeliverables) {
    const groupKey = `${d.registered_date_time_ad}||${d.event_name}`;
    hasConfiguredDeliverables.add(groupKey);

    if (!delMap.has(groupKey)) delMap.set(groupKey, new Set());
    const editType = d.deliverable_type || '';
    const itemNames = d.item_names ? d.item_names.split(',').map((n: string) => n.trim()).filter(Boolean) : [];
    const qty = d.quantity || 1;

    if (qty <= 1 && itemNames.length <= 1) {
      delMap.get(groupKey)!.add(`${itemNames[0] || ''}||${editType}`);
    } else {
      for (let i = 0; i < qty; i++) {
        const subName = itemNames[i] || `${editType} ${i + 1}`;
        delMap.get(groupKey)!.add(`${subName}||${editType}`);
      }
    }
  }

  // 4. Check each QUEUE row — soft-delete if deliverable no longer exists
  const toDelete: string[] = [];

  for (const row of queueRows) {
    const groupKey = `${row.registered_date_time_ad}||${row.event_name}`;
    const rowKey = `${row.sub_event_name || ''}||${row.edit_type || ''}`;

    if (hasConfiguredDeliverables.has(groupKey)) {
      // Client has configured deliverables for this event — row must match one
      if (!delMap.get(groupKey)!.has(rowKey)) {
        toDelete.push(row.id);
      }
    }
    // If no configured deliverables, defaults (Full Video/Highlights) are kept
  }

  if (toDelete.length === 0) return 0;

  // Soft-delete in batches
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    await supabase
      .from('video_edit_tracker')
      .update({ deleted: true, synced_to_sheet: false, updated_at: new Date().toISOString() })
      .in('id', batch);
  }

  console.log(`[VIDEO-EDIT] Cleaned up ${toDelete.length} stale QUEUE rows`);
  return toDelete.length;
}

export async function pushVideoEditsToSheets(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'pushVideoEditsToSheet' },
  });

  if (error) {
    console.error('[VIDEO-EDIT] Push to sheets error:', error);
    return 0;
  }
  return data?.pushed || 0;
}
