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
  iphoneShooter: string;
}

// Helper: convert Supabase row to FreelancerData
function cacheRowToFreelancer(row: any): FreelancerData {
  return {
    rowNumber: row.row_number || 0,
    name: row.name || '',
    contactNo: row.contact_no || '',
    whatsappNo: row.whatsapp_no || '',
    instagram: row.instagram || '',
    facebook: row.facebook || '',
    city: row.city || '',
    area: row.area || '',
    mapLink: row.map_link || '',
    pathaoLandmark: row.pathao_landmark || '',
    mainJob: row.main_job || '',
    photographer: row.photographer || 'NO',
    videographer: row.videographer || 'NO',
    photoEditor: row.photo_editor || 'NO',
    videoEditor: row.video_editor || 'NO',
    hybridShooter: row.hybrid_shooter || 'NO',
    hybridEditor: row.hybrid_editor || 'NO',
    droneOperator: row.drone_operator || 'NO',
    fpvOperator: row.fpv_operator || 'NO',
    iphoneShooter: row.iphone_shooter || 'NO',
  };
}

// triggerFreelancersSync removed — no more Sheets reads

export async function getFreelancers(limit = 500): Promise<FreelancerData[]> {
  // Try Supabase cache first
  try {
    const { data: cached, error } = await supabase
      .from('freelancers_cache')
      .select('*')
      .order('row_number', { ascending: true })
      .limit(limit);

    if (!error && cached && cached.length > 0) {
      // Deduplicate: if same row_number appears twice, keep newest, delete rest
      const seenRowNumbers = new Map<number, any>();
      const toDelete: string[] = [];

      for (const row of cached) {
        const rn = row.row_number;
        if (rn && seenRowNumbers.has(rn)) {
          const existing = seenRowNumbers.get(rn);
          if (new Date(row.updated_at) > new Date(existing.updated_at)) {
            toDelete.push(existing.id);
            seenRowNumbers.set(rn, row);
          } else {
            toDelete.push(row.id);
          }
        } else {
          seenRowNumbers.set(rn, row);
        }
      }

      if (toDelete.length > 0) {
        console.log(`[freelancer-api] Deduplicating ${toDelete.length} stale row(s) from cache`);
        await supabase.from('freelancers_cache').delete().in('id', toDelete);
        return cached
          .filter(r => !toDelete.includes(r.id))
          .map(cacheRowToFreelancer);
      }

      console.log(`[freelancer-api] Loaded ${cached.length} freelancers from cache`);
      return cached.map(cacheRowToFreelancer);
    }
  } catch (err) {
    console.warn('[freelancer-api] Cache read failed, falling back to Sheets:', err);
  }

  // Cache empty — return empty array (no Sheets fallback)
  console.log('[freelancer-api] Cache empty, returning empty array');
  return [];
}

export async function addFreelancer(freelancerData: Partial<FreelancerData>): Promise<void> {
  // STEP 1: Write to Supabase immediately (~50ms) — synced_to_sheet: false marks as pending
  const cachePayload = {
    name: freelancerData.name || '',
    contact_no: freelancerData.contactNo || '',
    whatsapp_no: freelancerData.whatsappNo || '',
    instagram: freelancerData.instagram || '',
    facebook: freelancerData.facebook || '',
    city: freelancerData.city || '',
    area: freelancerData.area || '',
    map_link: freelancerData.mapLink || '',
    pathao_landmark: freelancerData.pathaoLandmark || '',
    main_job: freelancerData.mainJob || '',
    photographer: freelancerData.photographer || '',
    videographer: freelancerData.videographer || '',
    photo_editor: freelancerData.photoEditor || '',
    video_editor: freelancerData.videoEditor || '',
    hybrid_shooter: freelancerData.hybridShooter || '',
    hybrid_editor: freelancerData.hybridEditor || '',
    drone_operator: freelancerData.droneOperator || '',
    fpv_operator: freelancerData.fpvOperator || '',
    iphone_shooter: freelancerData.iphoneShooter || '',
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  };

  const { error: cacheError } = await supabase
    .from('freelancers_cache')
    .upsert(cachePayload as any, { onConflict: 'name' });

  if (cacheError) {
    console.error('[freelancer-api] Supabase upsert failed:', cacheError);
    throw new Error('Failed to add freelancer to cache');
  }

  // STEP 2: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'addFreelancer', data: freelancerData }
  }).then(({ data, error }) => {
    if (!error && data?.success) {
      void supabase.from('freelancers_cache')
        .update({ synced_to_sheet: true })
        .eq('name', freelancerData.name || '');
    } else {
      console.warn('[BACKGROUND-SHEETS] addFreelancer sync failed:', error || data?.error);
    }
  }).catch(err => {
    console.warn('[BACKGROUND-SHEETS] addFreelancer Sheets call failed:', err);
  });
}

export async function updateFreelancer(freelancerData: FreelancerData): Promise<void> {
  let oldName: string | null = null;

  // STEP 0: Detect rename — find current names for this row_number
  if (freelancerData.rowNumber) {
    try {
      const { data: existing } = await supabase
        .from('freelancers_cache')
        .select('name, id')
        .eq('row_number', freelancerData.rowNumber);

      if (existing && existing.length > 0) {
        const staleRows = existing.filter(r => r.name !== freelancerData.name);
        if (staleRows.length > 0) {
          oldName = staleRows[0].name;
          console.log(`[freelancer-api] Rename detected: "${oldName}" → "${freelancerData.name}", deleting stale rows`);
          await supabase
            .from('freelancers_cache')
            .delete()
            .eq('row_number', freelancerData.rowNumber)
            .neq('name', freelancerData.name);
        }
      }
    } catch (err) {
      console.warn('[freelancer-api] Old row cleanup failed:', err);
    }
  }

  // STEP 1: Upsert new data — Supabase first (~50ms)
  const { error: cacheError } = await supabase.from('freelancers_cache').upsert({
    row_number: freelancerData.rowNumber,
    name: freelancerData.name,
    contact_no: freelancerData.contactNo,
    whatsapp_no: freelancerData.whatsappNo,
    instagram: freelancerData.instagram,
    facebook: freelancerData.facebook,
    city: freelancerData.city,
    area: freelancerData.area,
    map_link: freelancerData.mapLink,
    pathao_landmark: freelancerData.pathaoLandmark,
    main_job: freelancerData.mainJob,
    photographer: freelancerData.photographer,
    videographer: freelancerData.videographer,
    photo_editor: freelancerData.photoEditor,
    video_editor: freelancerData.videoEditor,
    hybrid_shooter: freelancerData.hybridShooter,
    hybrid_editor: freelancerData.hybridEditor,
    drone_operator: freelancerData.droneOperator,
    fpv_operator: freelancerData.fpvOperator,
    iphone_shooter: freelancerData.iphoneShooter,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: 'name' });

  if (cacheError) {
    console.error('[freelancer-api] Supabase upsert failed:', cacheError);
    throw new Error('Failed to update freelancer in cache');
  }

  // STEP 2: If renamed, sweep all assignment columns in Supabase with the new name
  if (oldName && oldName !== freelancerData.name) {
    const assignmentColumns = [
      'photographer_bride', 'photographer_groom',
      'videographer_bride', 'videographer_groom',
      'extra_photographer', 'extra_videographer',
      'assistant', 'iphone_shooter',
      'drone_operator', 'fpv_operator'
    ];
    for (const col of assignmentColumns) {
      const updatePayload: Record<string, unknown> = {
        [col]: freelancerData.name,
        synced_to_sheet: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (supabase.from('freelancer_assignments') as any)
        .update(updatePayload)
        .eq(col, oldName as string);
      await query;
    }
    console.log(`[freelancer-api] Swept assignments: "${oldName}" → "${freelancerData.name}"`);
  }

  // STEP 3: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateFreelancer', data: freelancerData }
  }).then(({ data, error }) => {
    if (!error && data?.success) {
      void supabase.from('freelancers_cache')
        .update({ synced_to_sheet: true })
        .eq('name', freelancerData.name);
    } else {
      console.warn('[BACKGROUND-SHEETS] updateFreelancer sync failed:', error || data?.error);
    }
  }).catch(err => {
    console.warn('[BACKGROUND-SHEETS] updateFreelancer Sheets call failed:', err);
  });
}

export async function deleteFreelancer(rowNumber: number): Promise<void> {
  // Get the name before deleting so we can remove from cache
  let nameToDelete = '';
  try {
    const { data: cached } = await supabase
      .from('freelancers_cache')
      .select('name')
      .eq('row_number', rowNumber)
      .single();
    if (cached) nameToDelete = cached.name;
  } catch {}

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

  // Remove from cache
  if (nameToDelete) {
    try {
      await supabase.from('freelancers_cache').delete().eq('name', nameToDelete);
    } catch (err) {
      console.warn('[freelancer-api] Cache delete failed:', err);
    }
  }
}

export async function syncFreelancerCategories(): Promise<{ mirrored: number }> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'syncFreelancerCategories' }
  });

  if (error) {
    console.error('Error syncing freelancer categories:', error);
    throw new Error('Failed to sync freelancer categories');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to sync freelancer categories');
  }

  return data.data;
}
