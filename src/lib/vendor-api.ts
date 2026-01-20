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

export async function getVendors(limit = 500): Promise<VendorData[]> {
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

  return data.data || [];
}

export async function getVendorTypes(): Promise<string[]> {
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
    body: { 
      action: 'addVendor',
      data: vendorData
    }
  });

  if (error) {
    console.error('Error adding vendor:', error);
    throw new Error('Failed to add vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add vendor');
  }
}

export async function updateVendor(vendorData: VendorData): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'updateVendor',
      data: vendorData
    }
  });

  if (error) {
    console.error('Error updating vendor:', error);
    throw new Error('Failed to update vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to update vendor');
  }
}

export async function deleteVendor(rowNumber: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { 
      action: 'deleteVendor',
      data: { rowNumber }
    }
  });

  if (error) {
    console.error('Error deleting vendor:', error);
    throw new Error('Failed to delete vendor');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete vendor');
  }
}
