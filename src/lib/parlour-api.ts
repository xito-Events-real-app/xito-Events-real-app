import { supabase } from "@/integrations/supabase/client";

export interface ParlourEntry {
  rowNumber: number;
  name: string;
  companyWhatsapp: string;
  companyContact: string;
  owner1: string;
  owner1Contact: string;
  owner1Whatsapp: string;
  owner2: string;
  owner2Contact: string;
  owner2Whatsapp: string;
  city: string;
  area: string;
  googleMap: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
  gmail: string;
  rating: string;
}

function cacheRowToParlour(row: any): ParlourEntry {
  return {
    rowNumber: row.row_number || 0,
    name: row.name || '',
    companyWhatsapp: row.company_whatsapp || '',
    companyContact: row.company_contact || '',
    owner1: row.owner1 || '',
    owner1Contact: row.owner1_contact || '',
    owner1Whatsapp: row.owner1_whatsapp || '',
    owner2: row.owner2 || '',
    owner2Contact: row.owner2_contact || '',
    owner2Whatsapp: row.owner2_whatsapp || '',
    city: row.city || '',
    area: row.area || '',
    googleMap: row.google_map || '',
    instagram: row.instagram || '',
    facebook: row.facebook || '',
    tiktok: row.tiktok || '',
    youtube: row.youtube || '',
    website: row.website || '',
    gmail: row.gmail || '',
    rating: row.rating || '',
  };
}

/**
 * Fetches parlour types from cache or EVENT DETAILS SETUP DATA sheet Column C
 */
export async function getParlourTypes(): Promise<string[]> {
  // Try cache first
  try {
    const { data: cached, error } = await supabase
      .from('logistics_types_cache')
      .select('type_name')
      .eq('category', 'parlour');

    if (!error && cached && cached.length > 0) {
      console.log(`[parlour-api] Loaded ${cached.length} parlour types from cache`);
      return cached.map(r => r.type_name).filter(Boolean);
    }
  } catch (err) {
    console.warn('[parlour-api] Cache read failed for parlour types:', err);
  }

  // Fallback
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getParlourTypes' }
  });

  if (error) {
    console.error('Error fetching parlour types:', error);
    throw new Error('Failed to fetch parlour types');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch parlour types');
  }

  // Background: populate cache
  supabase.functions.invoke('sync-all-data', { body: { tables: ['logistics'] } }).catch(() => {});

  return data.data || [];
}

/**
 * Fetches parlours from cache or a specific type sheet
 */
export async function getParloursByType(parlourType: string): Promise<ParlourEntry[]> {
  if (!parlourType) return [];
  
  // Try cache first
  try {
    const { data: cached, error } = await supabase
      .from('logistics_vendors_cache')
      .select('*')
      .eq('vendor_category', 'parlour')
      .eq('vendor_type', parlourType);

    if (!error && cached && cached.length > 0) {
      console.log(`[parlour-api] Loaded ${cached.length} parlours for "${parlourType}" from cache`);
      return cached.map(cacheRowToParlour);
    }
  } catch (err) {
    console.warn('[parlour-api] Cache read failed for parlours:', err);
  }

  // Fallback
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getParloursByType', data: { parlourType } }
  });

  if (error) {
    console.error('Error fetching parlours:', error);
    throw new Error('Failed to fetch parlours');
  }

  if (!data.success) {
    if (data.error?.includes('Unable to parse range') || data.error?.includes('sheet')) {
      console.warn(`No sheet found for parlour type: ${parlourType}`);
      return [];
    }
    throw new Error(data.error || 'Failed to fetch parlours');
  }

  return data.data || [];
}

/**
 * Adds a new parlour entry to the type-specific sheet + cache
 */
export async function addParlourEntry(
  parlourType: string, 
  parlourData: { name: string; city: string; area: string; googleMap: string }
): Promise<void> {
  if (!parlourType || !parlourData.name) {
    throw new Error('Parlour type and name are required');
  }

  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'addParlourEntry', data: { parlourType, ...parlourData } }
  });

  if (error) {
    console.error('Error adding parlour:', error);
    throw new Error('Failed to add parlour');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add parlour');
  }

  // Upsert cache
  try {
    await supabase.from('logistics_vendors_cache').insert({
      vendor_category: 'parlour',
      vendor_type: parlourType,
      name: parlourData.name,
      city: parlourData.city,
      area: parlourData.area,
      google_map: parlourData.googleMap,
      synced_to_sheet: true,
      updated_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    console.warn('[parlour-api] Cache insert after add failed:', err);
  }
}
