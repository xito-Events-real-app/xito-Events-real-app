import { supabase } from "@/integrations/supabase/client";

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

async function callPCloud(action: string, params: Record<string, any>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('pcloud-api', {
    body: { action, params },
  });
  if (error) throw new Error(`pCloud API error: ${error.message}`);
  if (data?.result !== 0 && data?.result !== undefined) {
    throw new Error(data.error || `pCloud error code ${data.result}`);
  }
  return data;
}

export async function listPCloudFolder(folderId: number = 0): Promise<PCloudFolder> {
  const data = await callPCloud('listfolder', { folderid: folderId });
  const metadata = data.metadata || {};
  return {
    metadata,
    contents: (metadata.contents || []) as PCloudItem[],
  };
}

export async function createPCloudFolder(parentId: number, name: string): Promise<PCloudItem> {
  const data = await callPCloud('createfolder', { folderid: parentId, name });
  return data.metadata as PCloudItem;
}

export async function getPCloudFileLink(fileid: number): Promise<string> {
  const data = await callPCloud('getfilelink', { fileid });
  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }
  throw new Error('Could not get file link');
}

export async function getPCloudThumbUrl(fileid: number, size: string = '200x200'): Promise<string> {
  const data = await callPCloud('getthumblink', { fileid, size });
  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }
  throw new Error('Could not get thumb link');
}

export async function deletePCloudFile(fileid: number): Promise<void> {
  await callPCloud('deletefile', { fileid });
}

export async function deletePCloudFolder(folderid: number): Promise<void> {
  await callPCloud('deletefolder', { folderid });
}

export async function renamePCloudFolder(folderid: number, newName: string): Promise<void> {
  await callPCloud('renamefolder', { folderid, toname: newName });
}

export async function uploadToPCloud(folderId: number, file: File): Promise<any> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
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
