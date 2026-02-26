import { supabase } from "@/integrations/supabase/client";

export interface VendorData {
  rowNumber: number;
  vendorName: string;
  vendorType: string;
  companyContactNo: string;
  owner1Name: string;
  owner1ContactNo: string;
  owner1WhatsappNo: string;
  owner2Name: string;
  owner2ContactNo: string;
  owner2WhatsappNo: string;
  city: string;
  area: string;
  googleMapLink: string;
  instagramLink: string;
  facebookLink: string;
  tiktokLink: string;
  youtubeLink: string;
  websiteLink: string;
  email: string;
}

function cacheRowToVendor(row: any): VendorData {
  return {
    rowNumber: row.row_number || 0,
    vendorName: row.vendor_name || '',
    vendorType: row.vendor_type || '',
    companyContactNo: row.company_contact_no || '',
    owner1Name: row.owner1_name || '',
    owner1ContactNo: row.owner1_contact_no || '',
    owner1WhatsappNo: row.owner1_whatsapp_no || '',
    owner2Name: row.owner2_name || '',
    owner2ContactNo: row.owner2_contact_no || '',
    owner2WhatsappNo: row.owner2_whatsapp_no || '',
    city: row.city || '',
    area: row.area || '',
    googleMapLink: row.google_map_link || '',
    instagramLink: row.instagram_link || '',
    facebookLink: row.facebook_link || '',
    tiktokLink: row.tiktok_link || '',
    youtubeLink: row.youtube_link || '',
    websiteLink: row.website_link || '',
    email: row.email || '',
  };
}

async function triggerVendorsSync(): Promise<void> {
  try {
    console.log('[vendor-api] Cache empty, triggering sync-all-data for vendors...');
    await supabase.functions.invoke('sync-all-data', {
      body: { tables: ['vendors'] }
    });
  } catch (err) {
    console.error('[vendor-api] Failed to trigger sync:', err);
  }
}

export async function getVendors(limit = 500): Promise<VendorData[]> {
  // Try Supabase cache first
  try {
    const { data: cached, error } = await supabase
      .from('vendors_cache')
      .select('*')
      .order('row_number', { ascending: true })
      .limit(limit);

    if (!error && cached && cached.length > 0) {
      console.log(`[vendor-api] Loaded ${cached.length} vendors from cache`);
      return cached.map(cacheRowToVendor);
    }
  } catch (err) {
    console.warn('[vendor-api] Cache read failed, falling back to Sheets:', err);
  }

  // Fallback: original Google Sheets call
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getVendors', limit }
  });

  if (error) {
    console.error('Error fetching vendors:', error);
    throw new Error('Failed to fetch vendors');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch vendors');
  }

  // Background: populate cache
  triggerVendorsSync().catch(() => {});

  return data.data || [];
}

export async function getVendorTypes(): Promise<string[]> {
  // Try Supabase cache first — get distinct vendor_type
  try {
    const { data: cached, error } = await supabase
      .from('vendors_cache')
      .select('vendor_type');

    if (!error && cached && cached.length > 0) {
      const types = [...new Set(cached.map(r => r.vendor_type).filter(Boolean))];
      if (types.length > 0) {
        console.log(`[vendor-api] Loaded ${types.length} vendor types from cache`);
        return types;
      }
    }
  } catch (err) {
    console.warn('[vendor-api] Cache read failed for types:', err);
  }

  // Fallback
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getVendorTypes' }
  });

  if (error) {
    console.error('Error fetching vendor types:', error);
    throw new Error('Failed to fetch vendor types');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch vendor types');
  }

  return data.data || [];
}

export async function addVendor(vendorData: Partial<VendorData>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'addVendor', data: vendorData }
  });

  if (error) {
    console.error('Error adding vendor:', error);
    throw new Error('Failed to add vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add vendor');
  }

  // Upsert cache
  try {
    await supabase.from('vendors_cache').insert({
      vendor_name: vendorData.vendorName || '',
      vendor_type: vendorData.vendorType || '',
      company_contact_no: vendorData.companyContactNo || '',
      owner1_name: vendorData.owner1Name || '',
      owner1_contact_no: vendorData.owner1ContactNo || '',
      owner1_whatsapp_no: vendorData.owner1WhatsappNo || '',
      owner2_name: vendorData.owner2Name || '',
      owner2_contact_no: vendorData.owner2ContactNo || '',
      owner2_whatsapp_no: vendorData.owner2WhatsappNo || '',
      city: vendorData.city || '',
      area: vendorData.area || '',
      google_map_link: vendorData.googleMapLink || '',
      instagram_link: vendorData.instagramLink || '',
      facebook_link: vendorData.facebookLink || '',
      tiktok_link: vendorData.tiktokLink || '',
      youtube_link: vendorData.youtubeLink || '',
      website_link: vendorData.websiteLink || '',
      email: vendorData.email || '',
      synced_to_sheet: true,
      updated_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    console.warn('[vendor-api] Cache insert after add failed:', err);
  }
}

export async function updateVendor(vendorData: VendorData): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'updateVendor', data: vendorData }
  });

  if (error) {
    console.error('Error updating vendor:', error);
    throw new Error('Failed to update vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to update vendor');
  }

  // Update cache instantly
  try {
    await supabase.from('vendors_cache').update({
      vendor_name: vendorData.vendorName || '',
      vendor_type: vendorData.vendorType || '',
      company_contact_no: vendorData.companyContactNo || '',
      owner1_name: vendorData.owner1Name || '',
      owner1_contact_no: vendorData.owner1ContactNo || '',
      owner1_whatsapp_no: vendorData.owner1WhatsappNo || '',
      owner2_name: vendorData.owner2Name || '',
      owner2_contact_no: vendorData.owner2ContactNo || '',
      owner2_whatsapp_no: vendorData.owner2WhatsappNo || '',
      city: vendorData.city || '',
      area: vendorData.area || '',
      google_map_link: vendorData.googleMapLink || '',
      instagram_link: vendorData.instagramLink || '',
      facebook_link: vendorData.facebookLink || '',
      tiktok_link: vendorData.tiktokLink || '',
      youtube_link: vendorData.youtubeLink || '',
      website_link: vendorData.websiteLink || '',
      email: vendorData.email || '',
      synced_to_sheet: true,
      updated_at: new Date().toISOString(),
    } as any).eq('row_number', vendorData.rowNumber);
  } catch (err) {
    console.warn('[vendor-api] Cache update after edit failed:', err);
  }
}

export async function deleteVendor(rowNumber: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'deleteVendor', data: { rowNumber } }
  });

  if (error) {
    console.error('Error deleting vendor:', error);
    throw new Error('Failed to delete vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete vendor');
  }

  // Remove from cache
  try {
    await supabase.from('vendors_cache').delete().eq('row_number', rowNumber);
  } catch (err) {
    console.warn('[vendor-api] Cache delete failed:', err);
  }
}
