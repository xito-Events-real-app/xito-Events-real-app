import { supabase } from "@/integrations/supabase/client";

export interface EditedFile {
  id: string;
  registered_date_time_ad: string;
  client_name: string;
  file_type: string;
  event_name: string;
  folder_event_name: string;
  side_folder: string;
  photographer_name: string;
  file_name: string;
  file_path: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  upload_status: string;
  upload_progress: number;
  storage_type: string;
  pcloud_file_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface EditedFileLink {
  id: string;
  registered_date_time_ad: string;
  client_name: string;
  link_type: string;
  link_url: string;
  link_title: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Suggest a clean folder name from event name (e.g. "Wedding BS" → "Wedding")
export function suggestFolderName(eventName: string): string {
  return eventName
    .replace(/\s+(BS|GS|bs|gs)\s*$/i, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}$/, '')
    .trim() || eventName;
}

// Suggest side folder from photographer role code
export function suggestSideFolder(roleField: string): string {
  if (['photographer_bride', 'extra_photographer'].includes(roleField)) return 'Bride Side';
  if (roleField === 'photographer_groom') return 'Groom Side';
  return '';
}

// Build display path
export function buildDisplayPath(
  clientName: string,
  fileType: 'photo' | 'video',
  eventFolder?: string,
  sideFolder?: string
): string {
  const parts = [clientName];
  if (fileType === 'photo') {
    parts.push('Photos');
    if (eventFolder) parts.push(eventFolder);
    if (sideFolder) parts.push(sideFolder);
  } else {
    parts.push('Videos');
  }
  return parts.join(' \\ ');
}

// Build storage path for the bucket
export function buildStoragePath(
  registeredDateTimeAD: string,
  fileType: string,
  eventFolder: string,
  sideFolder: string,
  fileName: string
): string {
  const parts = [registeredDateTimeAD, fileType];
  if (eventFolder) parts.push(eventFolder);
  if (sideFolder) parts.push(sideFolder);
  parts.push(fileName);
  return parts.join('/');
}

// Upload a file to storage and create DB record
export async function uploadEditedFile(
  file: File,
  meta: {
    registered_date_time_ad: string;
    client_name: string;
    file_type: 'photo' | 'video';
    event_name: string;
    folder_event_name: string;
    side_folder: string;
    photographer_name: string;
  }
): Promise<EditedFile | null> {
  const storagePath = buildStoragePath(
    meta.registered_date_time_ad,
    meta.file_type,
    meta.folder_event_name,
    meta.side_folder,
    file.name
  );
  const displayPath = buildDisplayPath(
    meta.client_name,
    meta.file_type,
    meta.folder_event_name || undefined,
    meta.side_folder || undefined
  );

  // Insert DB record first
  const { data: record, error: dbErr } = await (supabase.from('edited_files') as any)
    .insert({
      registered_date_time_ad: meta.registered_date_time_ad,
      client_name: meta.client_name,
      file_type: meta.file_type,
      event_name: meta.event_name,
      folder_event_name: meta.folder_event_name,
      side_folder: meta.side_folder,
      photographer_name: meta.photographer_name,
      file_name: file.name,
      file_path: displayPath,
      storage_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      upload_status: 'uploading',
      upload_progress: 0,
    })
    .select()
    .single();

  if (dbErr) {
    console.error('Failed to create edited_files record:', dbErr);
    return null;
  }

  // Upload to storage
  const { error: uploadErr } = await supabase.storage
    .from('edited-files')
    .upload(storagePath, file, { upsert: true });

  if (uploadErr) {
    console.error('Failed to upload file:', uploadErr);
    await (supabase.from('edited_files') as any)
      .update({ upload_status: 'failed' })
      .eq('id', record.id);
    return { ...record, upload_status: 'failed' };
  }

  // Mark completed
  await (supabase.from('edited_files') as any)
    .update({ upload_status: 'completed', upload_progress: 100 })
    .eq('id', record.id);

  return { ...record, upload_status: 'completed', upload_progress: 100 };
}

// Get all edited files
export async function getEditedFiles(): Promise<EditedFile[]> {
  const { data, error } = await (supabase.from('edited_files') as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// Get files for a specific client
export async function getEditedFilesForClient(registeredDateTimeAD: string): Promise<EditedFile[]> {
  const { data, error } = await (supabase.from('edited_files') as any)
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// Delete an edited file
export async function deleteEditedFile(id: string, storagePath: string): Promise<boolean> {
  await supabase.storage.from('edited-files').remove([storagePath]);
  const { error } = await (supabase.from('edited_files') as any).delete().eq('id', id);
  return !error;
}

// Get public URL for a file
export function getEditedFileUrl(storagePath: string): string {
  const { data } = supabase.storage.from('edited-files').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ---- Links ----

export async function getLinksForClient(registeredDateTimeAD: string): Promise<EditedFileLink[]> {
  const { data, error } = await (supabase.from('edited_files_links') as any)
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addLink(link: Omit<EditedFileLink, 'id' | 'created_at' | 'updated_at'>): Promise<EditedFileLink | null> {
  const { data, error } = await (supabase.from('edited_files_links') as any)
    .insert(link)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteLink(id: string): Promise<boolean> {
  const { error } = await (supabase.from('edited_files_links') as any).delete().eq('id', id);
  return !error;
}

// Get distinct clients that have edited files
export async function getEditedFilesClients(): Promise<{ registered_date_time_ad: string; client_name: string; file_count: number; total_size: number }[]> {
  const { data, error } = await (supabase.from('edited_files') as any)
    .select('registered_date_time_ad, client_name, file_size_bytes');
  if (error) { console.error(error); return []; }

  const map = new Map<string, { registered_date_time_ad: string; client_name: string; file_count: number; total_size: number }>();
  for (const row of (data || [])) {
    const key = row.registered_date_time_ad;
    if (!map.has(key)) {
      map.set(key, { registered_date_time_ad: key, client_name: row.client_name, file_count: 0, total_size: 0 });
    }
    const entry = map.get(key)!;
    entry.file_count++;
    entry.total_size += Number(row.file_size_bytes || 0);
  }
  return Array.from(map.values());
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
