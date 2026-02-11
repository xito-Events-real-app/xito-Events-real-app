import { supabase } from "@/integrations/supabase/client";

export interface FreelancerData {
  rowNumber: number;
  name: string;
  contactNo: string;
  whatsappNo: string;
  instagram: string;
  facebook: string;
  city: string;
  area: string;
  mapLink: string;
  pathaoLandmark: string;
  mainJob: string;
  photographer: string;
  videographer: string;
  photoEditor: string;
  videoEditor: string;
  hybridShooter: string;
  hybridEditor: string;
  droneOperator: string;
  fpvOperator: string;
}

export async function getFreelancers(limit = 500): Promise<FreelancerData[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getFreelancers', limit }
  });

  if (error) {
    console.error('Error fetching freelancers:', error);
    throw new Error('Failed to fetch freelancers');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch freelancers');
  }

  return data.data || [];
}

export async function addFreelancer(freelancerData: Partial<FreelancerData>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'addFreelancer', data: freelancerData }
  });

  if (error) {
    console.error('Error adding freelancer:', error);
    throw new Error('Failed to add freelancer');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to add freelancer');
  }
}

export async function updateFreelancer(freelancerData: FreelancerData): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'updateFreelancer', data: freelancerData }
  });

  if (error) {
    console.error('Error updating freelancer:', error);
    throw new Error('Failed to update freelancer');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to update freelancer');
  }
}

export async function deleteFreelancer(rowNumber: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'deleteFreelancer', data: { rowNumber } }
  });

  if (error) {
    console.error('Error deleting freelancer:', error);
    throw new Error('Failed to delete freelancer');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete freelancer');
  }
}
