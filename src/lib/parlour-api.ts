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

/**
 * Fetches parlour types from "EVENT DETAILS SETUP DATA" sheet Column C
 */
export async function getParlourTypes(): Promise<string[]> {
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

  return data.data || [];
}

/**
 * Fetches parlours from a specific type sheet (e.g., "MAKEUP STUDIO", "BEAUTY PARLOUR")
 * @param parlourType - The parlour type (sheet name)
 */
export async function getParloursByType(parlourType: string): Promise<ParlourEntry[]> {
  if (!parlourType) return [];
  
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'getParloursByType',
      data: { parlourType }
    }
  });

  if (error) {
    console.error('Error fetching parlours:', error);
    throw new Error('Failed to fetch parlours');
  }

  if (!data.success) {
    // If sheet doesn't exist, return empty array
    if (data.error?.includes('Unable to parse range') || data.error?.includes('sheet')) {
      console.warn(`No sheet found for parlour type: ${parlourType}`);
      return [];
    }
    throw new Error(data.error || 'Failed to fetch parlours');
  }

  return data.data || [];
}

/**
 * Adds a new parlour entry to the type-specific sheet
 * @param parlourType - The parlour type (sheet name)
 * @param parlourData - The parlour data (name, city, area, googleMap required)
 */
export async function addParlourEntry(
  parlourType: string, 
  parlourData: { name: string; city: string; area: string; googleMap: string }
): Promise<void> {
  if (!parlourType || !parlourData.name) {
    throw new Error('Parlour type and name are required');
  }

  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'addParlourEntry',
      data: { parlourType, ...parlourData }
    }
  });

  if (error) {
    console.error('Error adding parlour:', error);
    throw new Error('Failed to add parlour');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add parlour');
  }
}
