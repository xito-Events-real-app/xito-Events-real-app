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

/**
 * Fetches venue types from "EVENT DETAILS SETUP DATA" sheet Column A
 */
export async function getVenueTypes(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getEventDetailsSetupData' }
  });

  if (error) {
    console.error('Error fetching venue types:', error);
    throw new Error('Failed to fetch venue types');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch venue types');
  }

  return data.data || [];
}

/**
 * Fetches venues from a specific type sheet (e.g., "BANQUET", "DECORATION")
 * @param venueType - The venue type (sheet name)
 */
export async function getVenuesByType(venueType: string): Promise<VenueEntry[]> {
  if (!venueType) return [];
  
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'getVenuesByType',
      data: { venueType }
    }
  });

  if (error) {
    console.error('Error fetching venues:', error);
    throw new Error('Failed to fetch venues');
  }

  if (!data.success) {
    // If sheet doesn't exist, return empty array
    if (data.error?.includes('Unable to parse range') || data.error?.includes('sheet')) {
      console.warn(`No sheet found for venue type: ${venueType}`);
      return [];
    }
    throw new Error(data.error || 'Failed to fetch venues');
  }

  return data.data || [];
}

/**
 * Adds a new venue entry to the type-specific sheet
 * @param venueType - The venue type (sheet name)
 * @param venueData - The venue data (name, city, area, googleMap required)
 */
export async function addVenueEntry(
  venueType: string, 
  venueData: { name: string; city: string; area: string; googleMap: string }
): Promise<void> {
  if (!venueType || !venueData.name) {
    throw new Error('Venue type and name are required');
  }

  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'addVenueEntry',
      data: { venueType, ...venueData }
    }
  });

  if (error) {
    console.error('Error adding venue:', error);
    throw new Error('Failed to add venue');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add venue');
  }
}

/**
 * Refreshes client venue/parlour data from vendor sheets.
 * Syncs City, Area, and Map Link from vendor type sheets to client event details.
 * @param registeredDateTimeAD - The unique client identifier
 * @returns boolean indicating if refresh was successful
 */
export async function refreshClientVendorData(registeredDateTimeAD: string): Promise<boolean> {
  if (!registeredDateTimeAD) return false;
  
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: {
      action: 'refreshClientVendorData',
      data: { registeredDateTimeAD }
    }
  });

  if (error) {
    console.error('Error refreshing vendor data:', error);
    return false;
  }

  return data?.success || false;
}
