import { supabase } from "@/integrations/supabase/client";

export interface VenueEntry {
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

function cacheRowToVenue(row: any): VenueEntry {
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
 * Fetches venue types from cache or EVENT DETAILS SETUP DATA sheet Column A
 */
export async function getVenueTypes(): Promise<string[]> {
  // Try cache first
  try {
    const { data: cached, error } = await supabase
      .from('logistics_types_cache')
      .select('type_name')
      .eq('category', 'venue');

    if (!error && cached && cached.length > 0) {
      console.log(`[event-venue-api] Loaded ${cached.length} venue types from cache`);
      return cached.map(r => r.type_name).filter(Boolean);
    }
  } catch (err) {
    console.warn('[event-venue-api] Cache read failed for venue types:', err);
  }

  // Cache empty — return empty array (no Sheets fallback)
  console.log('[event-venue-api] No venue types in cache');
  return [];
}

/**
 * Fetches venues from cache or a specific type sheet
 */
export async function getVenuesByType(venueType: string): Promise<VenueEntry[]> {
  if (!venueType) return [];

  // Try cache first
  try {
    const { data: cached, error } = await supabase
      .from('logistics_vendors_cache')
      .select('*')
      .eq('vendor_category', 'venue')
      .eq('vendor_type', venueType);

    if (!error && cached && cached.length > 0) {
      console.log(`[event-venue-api] Loaded ${cached.length} venues for "${venueType}" from cache`);
      return cached.map(cacheRowToVenue);
    }
  } catch (err) {
    console.warn('[event-venue-api] Cache read failed for venues:', err);
  }

  // Cache empty — return empty array (no Sheets fallback)
  console.log(`[event-venue-api] No venues for "${venueType}" in cache`);
  return [];
}

/**
 * Adds a new venue entry to the type-specific sheet + cache
 */
export async function addVenueEntry(
  venueType: string, 
  venueData: { name: string; city: string; area: string; googleMap: string }
): Promise<void> {
  if (!venueType || !venueData.name) {
    throw new Error('Venue type and name are required');
  }

  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'addVenueEntry', data: { venueType, ...venueData } }
  });

  if (error) {
    console.error('Error adding venue:', error);
    throw new Error('Failed to add venue');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add venue');
  }

  // Upsert cache
  try {
    await supabase.from('logistics_vendors_cache').insert({
      vendor_category: 'venue',
      vendor_type: venueType,
      name: venueData.name,
      city: venueData.city,
      area: venueData.area,
      google_map: venueData.googleMap,
      synced_to_sheet: true,
      updated_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    console.warn('[event-venue-api] Cache insert after add failed:', err);
  }
}

// refreshClientVendorData removed — no more Sheets reads
