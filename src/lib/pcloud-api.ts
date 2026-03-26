import { supabase } from "@/integrations/supabase/client";

const PCLOUD_API = 'https://api.pcloud.com';

export interface PCloudItem {
  name: string;
  isfolder: boolean;
  folderid?: number;
  fileid?: number;
  size?: number;
  created?: string;
  modified?: string;
  contenttype?: string;
  icon?: string;
  thumb?: boolean;
  contents?: PCloudItem[];
}

export interface PCloudFolder {
  metadata: PCloudItem;
  contents: PCloudItem[];
}

// Client-side token cache — fetched once from edge function, then reused for ~1 hour
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const { data, error } = await supabase.functions.invoke('pcloud-api', {
    body: { action: 'getauth', params: {} },
  });
  if (error) throw new Error(`pCloud auth error: ${error.message}`);
  if (!data?.auth) throw new Error('No auth token returned');

  cachedToken = {
    token: data.auth,
    expiresAt: Date.now() + 3500 * 1000, // ~58 minutes
  };
  return cachedToken.token;
}

// Call pCloud API directly from browser (no edge function proxy)
async function callPCloudDirect(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const auth = await getAuthToken();
  const query = new URLSearchParams({ auth, ...params });
  const res = await fetch(`${PCLOUD_API}${endpoint}?${query}`);
  if (!res.ok) throw new Error(`pCloud HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== 0 && data.result !== undefined) {
    throw new Error(data.error || `pCloud error code ${data.result}`);
  }
  return data;
}

export async function listPCloudFolder(folderId: number = 0): Promise<PCloudFolder> {
  const data = await callPCloudDirect('/listfolder', {
    folderid: String(folderId),
    recursive: '0',
    showdeleted: '0',
  });
  const metadata = data.metadata || {};
  return {
    metadata,
    contents: (metadata.contents || []) as PCloudItem[],
  };
}

export async function createPCloudFolder(parentId: number, name: string): Promise<PCloudItem> {
  const data = await callPCloudDirect('/createfolder', {
    folderid: String(parentId),
    name,
  });
  return data.metadata as PCloudItem;
}

export async function getPCloudFileLink(fileid: number): Promise<string> {
  const data = await callPCloudDirect('/getfilelink', { fileid: String(fileid) });
  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }
  throw new Error('Could not get file link');
}

export async function getPCloudThumbUrl(fileid: number, size: string = '200x200'): Promise<string> {
  const data = await callPCloudDirect('/getthumblink', { fileid: String(fileid), size });
  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }
  throw new Error('Could not get thumb link');
}

// Batch fetch thumbnails — all in parallel directly from pCloud
export async function getPCloudThumbsBatch(fileids: number[], size: string = '200x200'): Promise<Record<number, string>> {
  if (fileids.length === 0) return {};
  const auth = await getAuthToken();
  const results: Record<number, string> = {};

  // Fetch all thumbs in parallel (batches of 50)
  for (let i = 0; i < fileids.length; i += 50) {
    const chunk = fileids.slice(i, i + 50);
    const promises = chunk.map(async (fid) => {
      try {
        const query = new URLSearchParams({ auth, fileid: String(fid), size });
        const res = await fetch(`${PCLOUD_API}/getthumblink?${query}`);
        const d = await res.json();
        if (d.hosts && d.path) {
          results[fid] = `https://${d.hosts[0]}${d.path}`;
        }
      } catch { /* skip failed thumbs */ }
    });
    await Promise.all(promises);
  }

  return results;
}

export async function deletePCloudFile(fileid: number): Promise<void> {
  await callPCloudDirect('/deletefile', { fileid: String(fileid) });
}

export async function deletePCloudFolder(folderid: number): Promise<void> {
  await callPCloudDirect('/deletefolderrecursive', { folderid: String(folderid) });
}

export async function renamePCloudFolder(folderid: number, newName: string): Promise<void> {
  await callPCloudDirect('/renamefolder', { folderid: String(folderid), toname: newName });
}

// Upload still goes through edge function (needs server-side credential handling for FormData)
export async function uploadToPCloud(folderId: number, file: File): Promise<any> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const formData = new FormData();
  formData.append('file', file, file.name);

  const url = `${supabaseUrl}/functions/v1/pcloud-api?folderid=${folderId}&filename=${encodeURIComponent(file.name)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  return await res.json();
}

export function formatPCloudSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isPCloudImage(item: PCloudItem): boolean {
  const ct = item.contenttype || '';
  if (ct.startsWith('image/')) return true;
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','heic'].includes(ext);
}

export function isPCloudVideo(item: PCloudItem): boolean {
  const ct = item.contenttype || '';
  if (ct.startsWith('video/')) return true;
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  return ['mp4','mov','avi','mkv','webm','m4v','wmv','flv'].includes(ext);
}
