import { supabase } from "@/integrations/supabase/client";

export interface PortalReference {
  id: string;
  registered_date_time_ad: string;
  event_name: string;
  entry_type: string;
  platform: string;
  link_url: string;
  link_title: string;
  description: string;
  created_at: string;
}

export async function getPortalReferences(registeredDateTimeAD: string): Promise<PortalReference[]> {
  const { data, error } = await supabase
    .from('client_portal_references')
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PortalReference[];
}

export async function addPortalReference(ref: Omit<PortalReference, 'id' | 'created_at'>): Promise<PortalReference> {
  const { data, error } = await supabase
    .from('client_portal_references')
    .insert(ref)
    .select()
    .single();
  if (error) throw error;
  return data as PortalReference;
}

export async function deletePortalReference(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_portal_references')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
