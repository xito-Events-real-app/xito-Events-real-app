import { supabase } from "@/integrations/supabase/client";
import { getFreelancers, addFreelancer, FreelancerData } from "./freelancer-api";
import { updateAssignmentInCache, updateCategoriesInCache, rowToAssignment } from "./freelancer-assignment-cache";

export interface FreelancerAssignment {
  rowNumber: number;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  event: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  photographerBride: string;
  photographerGroom: string;
  videographerBride: string;
  videographerGroom: string;
  extraPhotographer: string;
  extraVideographer: string;
  assistant: string;
  iphoneShooter: string;
  droneOperator: string;
  fpvOperator: string;
  requiredCategories: string;
}

export type FreelancerField = 
  | 'photographerBride' | 'photographerGroom'
  | 'videographerBride' | 'videographerGroom'
  | 'extraPhotographer' | 'extraVideographer'
  | 'assistant' | 'iphoneShooter'
  | 'droneOperator' | 'fpvOperator';

export interface AvailabilityConflict {
  clientName: string;
  event: string;
  role: string;
}

// Category code mapping
export const CATEGORY_CODES: Record<FreelancerField, string> = {
  photographerBride: 'PB',
  photographerGroom: 'PG',
  videographerBride: 'VB',
  videographerGroom: 'VG',
  extraPhotographer: 'EP',
  extraVideographer: 'EV',
  assistant: 'Asst',
  iphoneShooter: 'iPhone',
  droneOperator: 'Drone',
  fpvOperator: 'FPV',
};

export const CATEGORY_CODE_TO_FIELD: Record<string, FreelancerField> = Object.fromEntries(
  Object.entries(CATEGORY_CODES).map(([field, code]) => [code, field as FreelancerField])
) as Record<string, FreelancerField>;

export const ALL_CATEGORY_CODES = Object.values(CATEGORY_CODES);

export async function getClientFreelancerAssignments(registeredDateTimeAD: string): Promise<FreelancerAssignment[]> {
  // STEP 1: Read from Supabase first (~50ms)
  try {
    const { data: cached, error } = await supabase
      .from('freelancer_assignments')
      .select('*')
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .order('event_year', { ascending: true })
      .order('event_month', { ascending: true })
      .order('event_day', { ascending: true });

    if (!error && cached && cached.length > 0) {
      return (cached as any[]).map(rowToAssignment);
    }
  } catch (err) {
    console.warn('[assignments] Supabase read failed, falling back to Sheets:', err);
  }

  // STEP 2: Fallback to Google Sheets only if no data in Supabase
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getClientFreelancerAssignments', data: { registeredDateTimeAD } }
  });
  if (error) throw new Error('Failed to fetch freelancer assignments');
  if (!data.success) throw new Error(data.error || 'Failed to fetch freelancer assignments');
  return data.data || [];
}

export async function updateFreelancerAssignment(
  registeredDateTimeAD: string,
  eventName: string,
  eventDateAD: string,
  field: FreelancerField,
  value: string
): Promise<void> {
  // STEP 1: Write to Supabase immediately (marks synced_to_sheet: false)
  await updateAssignmentInCache(registeredDateTimeAD, eventName, field, value, eventDateAD);

  // STEP 2: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateFreelancerAssignment', data: { registeredDateTimeAD, eventName, eventDateAD, field, value } }
  }).then(({ data, error }) => {
    if (error || !data?.success) {
      console.warn('[BACKGROUND-SHEETS] Assignment sync failed — will retry on next push:', error || data?.error);
    }
  }).catch(err => {
    console.warn('[BACKGROUND-SHEETS] Assignment Sheets call failed:', err);
  });
}

export async function checkFreelancerAvailability(
  freelancerName: string,
  eventDateAD: string
): Promise<AvailabilityConflict[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'checkFreelancerAvailability', data: { freelancerName, eventDateAD } }
  });
  if (error) return [];
  if (!data.success) return [];
  return data.data?.conflicts || [];
}

export async function fullSyncFreelancerAssignments(): Promise<{ copiedCount: number; updatedCount: number; totalFreelancers: number }> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'fullSyncFreelancerAssignments' }
  });
  if (error) throw new Error('Failed to sync freelancer assignments');
  if (!data.success) throw new Error(data.error || 'Failed to sync freelancer assignments');
  return data.data;
}

export async function updateRequiredCrewCategories(
  registeredDateTimeAD: string,
  eventName: string,
  eventDateAD: string,
  categories: string
): Promise<void> {
  // STEP 1: Write to Supabase immediately
  await updateCategoriesInCache(registeredDateTimeAD, eventName, categories, eventDateAD);

  // STEP 2: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateRequiredCrewCategories', data: { registeredDateTimeAD, eventName, eventDateAD, categories } }
  }).catch(err => console.warn('[BACKGROUND-SHEETS] Categories sync failed:', err));
}

export interface FreelancerBooking {
  clientName: string;
  event: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  role: string;
  roleLabel: string;
  registeredDateTimeAD: string;
}

export async function getFreelancerBookings(freelancerName: string): Promise<FreelancerBooking[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getFreelancerBookings', data: { freelancerName } }
  });
  if (error) throw new Error('Failed to fetch freelancer bookings');
  if (!data.success) throw new Error(data.error || 'Failed to fetch freelancer bookings');
  return data.data || [];
}

// Role-based filtering from WTN FREELANCERS
const ROLE_FILTER_MAP: Record<string, keyof FreelancerData> = {
  photographerBride: 'photographer',
  photographerGroom: 'photographer',
  extraPhotographer: 'photographer',
  videographerBride: 'videographer',
  videographerGroom: 'videographer',
  extraVideographer: 'videographer',
  
  iphoneShooter: 'iphoneShooter',
  droneOperator: 'droneOperator',
  fpvOperator: 'fpvOperator',
};

export function getFilteredFreelancersByRole(freelancers: FreelancerData[], field: FreelancerField): string[] {
  const filterKey = ROLE_FILTER_MAP[field];
  if (!filterKey) return freelancers.map(f => f.name).filter(Boolean);
  return freelancers
    .filter(f => (f[filterKey] as string || '').toUpperCase() === 'YES')
    .map(f => f.name)
    .filter(Boolean);
}

export async function getAllFreelancerAssignments(): Promise<FreelancerAssignment[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getAllFreelancerAssignments' }
  });
  if (error) throw new Error('Failed to fetch all freelancer assignments');
  if (!data.success) throw new Error(data.error || 'Failed to fetch all freelancer assignments');
  return data.data || [];
}

const JOB_PRIORITY: [string, string][] = [
  ['photographer', 'PHOTOGRAPHER'],
  ['videographer', 'VIDEOGRAPHER'],
  ['photoEditor', 'PHOTO EDITOR'],
  ['videoEditor', 'VIDEO EDITOR'],
  ['droneOperator', 'DRONE OPERATOR'],
  ['fpvOperator', 'FPV OPERATOR'],
  ['iphoneShooter', 'IPHONE SHOOTER'],
];

export async function quickAddFreelancer(
  name: string,
  contactNo: string,
  roleField: FreelancerField,
  skills?: Record<string, boolean>,
  mainJobOverride?: string
): Promise<void> {
  if (skills) {
    const data: Partial<FreelancerData> = { name, contactNo };
    if (skills.photographer) data.photographer = 'YES';
    if (skills.videographer) data.videographer = 'YES';
    if (skills.photoEditor) data.photoEditor = 'YES';
    if (skills.videoEditor) data.videoEditor = 'YES';
    if (skills.droneOperator) data.droneOperator = 'YES';
    if (skills.fpvOperator) data.fpvOperator = 'YES';
    if (skills.iphoneShooter) data.iphoneShooter = 'YES';
    data.hybridShooter = (skills.photographer && skills.videographer) ? 'YES' : '';
    data.hybridEditor = (skills.photoEditor && skills.videoEditor) ? 'YES' : '';
    data.mainJob = mainJobOverride || JOB_PRIORITY.find(([key]) => skills[key])?.[1] || '';
    await addFreelancer(data);
  } else {
    // Fallback: old behavior
    const roleMap: Record<string, Partial<FreelancerData>> = {
      photographerBride: { photographer: 'YES', mainJob: 'PHOTOGRAPHER' },
      photographerGroom: { photographer: 'YES', mainJob: 'PHOTOGRAPHER' },
      extraPhotographer: { photographer: 'YES', mainJob: 'PHOTOGRAPHER' },
      videographerBride: { videographer: 'YES', mainJob: 'VIDEOGRAPHER' },
      videographerGroom: { videographer: 'YES', mainJob: 'VIDEOGRAPHER' },
      extraVideographer: { videographer: 'YES', mainJob: 'VIDEOGRAPHER' },
      assistant: { hybridShooter: 'YES', mainJob: 'HYBRID SHOOTER' },
      iphoneShooter: { iphoneShooter: 'YES', mainJob: 'IPHONE SHOOTER' },
      droneOperator: { droneOperator: 'YES', mainJob: 'DRONE OPERATOR' },
      fpvOperator: { fpvOperator: 'YES', mainJob: 'FPV OPERATOR' },
    };
    const roleData = roleMap[roleField] || {};
    await addFreelancer({ name, contactNo, ...roleData });
  }
}
