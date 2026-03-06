import { supabase } from "@/integrations/supabase/client";

export interface DeliverableRow {
  registered_date_time_ad: string;
  event_name: string;
  section: string;
  deliverable_type: string;
  enabled: boolean;
  quantity: number;
  item_names: string;
  album_name: string;
  photographer_toggles: string;
  photographer_notes: string;
}

export async function loadDeliverables(registeredDateTimeAD: string): Promise<DeliverableRow[]> {
  const { data, error } = await supabase
    .from('client_deliverables')
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD);

  if (error) {
    console.error('Error loading deliverables:', error);
    return [];
  }
  return (data || []) as DeliverableRow[];
}

export async function saveDeliverable(row: DeliverableRow): Promise<void> {
  const { error } = await supabase
    .from('client_deliverables')
    .upsert(
      {
        registered_date_time_ad: row.registered_date_time_ad,
        event_name: row.event_name,
        section: row.section,
        deliverable_type: row.deliverable_type,
        enabled: row.enabled,
        quantity: row.quantity,
        item_names: row.item_names,
        album_name: row.album_name,
        photographer_toggles: row.photographer_toggles,
        photographer_notes: row.photographer_notes,
        synced_to_sheet: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'registered_date_time_ad,event_name,section,deliverable_type',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.error('Error saving deliverable:', error);
  }
}

export async function loadAlbumTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('album_types')
    .select('type_name')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading album types:', error);
    return [];
  }
  return (data || []).map(r => r.type_name);
}

export async function saveAlbumType(typeName: string): Promise<void> {
  const trimmed = typeName.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('album_types')
    .upsert({ type_name: trimmed }, { onConflict: 'type_name', ignoreDuplicates: true });

  if (error) {
    console.error('Error saving album type:', error);
  }
}
