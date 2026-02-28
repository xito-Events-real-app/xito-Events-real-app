import { supabase } from "@/integrations/supabase/client";
import { getFreelancers, addFreelancer, FreelancerData } from "./freelancer-api";
import { updateAssignmentInCache, updateCategoriesInCache, rowToAssignment } from "./freelancer-assignment-cache";

export interface FreelancerAssignment {
  id?: string;
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

// Database-only: read assignments from Supabase
export async function getClientFreelancerAssignments(registeredDateTimeAD: string): Promise<FreelancerAssignment[]> {
  const { data: cached, error } = await supabase
    .from('freelancer_assignments')
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('event_year', { ascending: true })
    .order('event_month', { ascending: true })
    .order('event_day', { ascending: true });

  if (error) {
    console.error('[assignments] Supabase read failed:', error);
    return [];
  }

  return (cached as any[] || []).map(rowToAssignment);
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

// Database-only: check availability by querying freelancer_assignments table directly
const ROLE_COLUMNS: { field: FreelancerField; column: string; label: string }[] = [
  { field: 'photographerBride', column: 'photographer_bride', label: 'Photographer Bride' },
  { field: 'photographerGroom', column: 'photographer_groom', label: 'Photographer Groom' },
  { field: 'videographerBride', column: 'videographer_bride', label: 'Videographer Bride' },
  { field: 'videographerGroom', column: 'videographer_groom', label: 'Videographer Groom' },
  { field: 'extraPhotographer', column: 'extra_photographer', label: 'Extra Photographer' },
  { field: 'extraVideographer', column: 'extra_videographer', label: 'Extra Videographer' },
  { field: 'assistant', column: 'assistant', label: 'Assistant' },
  { field: 'iphoneShooter', column: 'iphone_shooter', label: 'iPhone Shooter' },
  { field: 'droneOperator', column: 'drone_operator', label: 'Drone Operator' },
  { field: 'fpvOperator', column: 'fpv_operator', label: 'FPV Operator' },
];

export async function checkFreelancerAvailability(
  freelancerName: string,
  eventDateAD: string
): Promise<AvailabilityConflict[]> {
  if (!freelancerName || !eventDateAD) return [];

  try {
    // Query all assignments on the given date
    const { data: rows, error } = await supabase
      .from('freelancer_assignments')
      .select('*')
      .eq('event_date_ad', eventDateAD);

    if (error || !rows) return [];

    const conflicts: AvailabilityConflict[] = [];
    const upperName = freelancerName.trim().toUpperCase();

    for (const row of rows) {
      for (const { column, label } of ROLE_COLUMNS) {
        const val = (row[column] || '').trim().toUpperCase();
        if (val === upperName) {
          conflicts.push({
            clientName: row.client_name || '',
            event: row.event || '',
            role: label,
          });
        }
      }
    }

    return conflicts;
  } catch (err) {
    console.error('[checkFreelancerAvailability] Query failed:', err);
    return [];
  }
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

// Database-only: get freelancer bookings from Supabase
export async function getFreelancerBookings(freelancerName: string): Promise<FreelancerBooking[]> {
  if (!freelancerName) return [];

  try {
    const { data: rows, error } = await supabase
      .from('freelancer_assignments')
      .select('*')
      .order('event_year', { ascending: true })
      .order('event_month', { ascending: true })
      .order('event_day', { ascending: true });

    if (error || !rows) return [];

    const bookings: FreelancerBooking[] = [];
    const upperName = freelancerName.trim().toUpperCase();

    for (const row of rows) {
      for (const { field, column, label } of ROLE_COLUMNS) {
        const val = (row[column] || '').trim().toUpperCase();
        if (val === upperName) {
          bookings.push({
            clientName: row.client_name || '',
            event: row.event || '',
            eventYear: row.event_year || '',
            eventMonth: row.event_month || '',
            eventDay: row.event_day || '',
            eventDateAD: row.event_date_ad || '',
            role: field,
            roleLabel: label,
            registeredDateTimeAD: row.registered_date_time_ad || '',
          });
        }
      }
    }

    return bookings;
  } catch (err) {
    console.error('[getFreelancerBookings] Query failed:', err);
    return [];
  }
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

// Database-only: read all assignments from Supabase
export async function getAllFreelancerAssignments(): Promise<FreelancerAssignment[]> {
  const { data: cached, error } = await supabase
    .from('freelancer_assignments')
    .select('*')
    .order('event_year', { ascending: true })
    .order('event_month', { ascending: true })
    .order('event_day', { ascending: true });

  if (error) {
    console.error('[getAllAssignments] Supabase read failed:', error);
    return [];
  }

  return (cached as any[] || []).map(rowToAssignment);
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
