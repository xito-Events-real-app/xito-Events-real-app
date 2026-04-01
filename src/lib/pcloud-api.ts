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

async function invokePCloudAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('pcloud-api', {
    body: { action, params },
  });

  if (error) {
    throw new Error(`pCloud ${action} error: ${error.message}`);
  }

  if (!data || (typeof data.result === 'number' && data.result !== 0)) {
    throw new Error(data?.error || `pCloud ${action} failed`);
  }

  return data as T;
}

export async function getPCloudFileLink(fileid: number): Promise<string> {
  const data = await invokePCloudAction<{ hosts?: string[]; path?: string }>('getfilelink', {
    fileid,
  });

  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }

  throw new Error('Could not get file link');
}

export async function getPCloudPublicUrl(fileid: number): Promise<string> {
  const data = await callPCloudDirect('/getfilepublink', { fileid: String(fileid) });
  if (data.link) {
    return data.link.startsWith('http') ? data.link : `https://u.pcloud.link${data.link}`;
  }
  throw new Error('Could not get public file link');
}

/**
 * Returns a proxy URL that streams file content through our edge function.
 * This avoids IP-bound restrictions from pCloud's getfilelink.
 */
export function getPCloudStreamUrl(fileid: number): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return `${supabaseUrl}/functions/v1/pcloud-api?streamfileid=${fileid}&apikey=${anonKey}`;
}

export async function getPCloudThumbUrl(fileid: number, size: string = '200x200'): Promise<string> {
  const data = await invokePCloudAction<{ hosts?: string[]; path?: string }>('getthumblink', {
    fileid,
    size,
  });

  if (data.hosts && data.path) {
    return `https://${data.hosts[0]}${data.path}`;
  }

  throw new Error('Could not get thumb link');
}

export async function getPCloudThumbsBatch(fileids: number[], size: string = '200x200'): Promise<Record<number, string>> {
  if (fileids.length === 0) return {};

  const data = await invokePCloudAction<{ thumbs?: Record<number, string> }>('getthumbslinks', {
    fileids,
    size,
  });

  return data.thumbs || {};
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

/**
 * Upload a file to pCloud by folder path (creates folder if needed).
 * Uses XHR for progress tracking.
 */
export async function uploadToPCloudByPath(
  folderPath: string,
  file: File,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<any> {
  // Ensure folder exists first
  const cleanPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
  const folderData = await callPCloudDirect('/createfolderifnotexists', { path: cleanPath });
  const folderId = folderData.metadata?.folderid;
  if (!folderId) throw new Error('Could not resolve folder');

  const auth = await getAuthToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (abortSignal) {
      if (abortSignal.aborted) {
        reject(new Error('Upload cancelled'));
        return;
      }
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.result !== 0) {
            reject(new Error(data.error || `pCloud upload error ${data.result}`));
          } else {
            resolve(data);
          }
        } catch { resolve(xhr.responseText); }
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));

    xhr.open('POST', `${PCLOUD_API}/uploadfile?auth=${auth}&folderid=${folderId}&filename=${encodeURIComponent(file.name)}`);
    xhr.send(formData);
  });
}

export interface PCloudQuota {
  used: number;
  total: number;
  free: number;
}

export async function getPCloudQuota(): Promise<PCloudQuota> {
  const data = await callPCloudDirect('/userinfo', {});
  const total = data.quota || 0;
  const used = data.usedquota || 0;
  return { total, used, free: total - used };
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

/**
 * Create a folder by full path, creating parent directories as needed.
 * If a parent doesn't exist, iteratively creates each segment from root.
 */
export async function createPCloudFolderByPath(path: string): Promise<PCloudItem> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  try {
    const data = await callPCloudDirect('/createfolderifnotexists', { path: cleanPath });
    return data.metadata as PCloudItem;
  } catch (err: any) {
    // If parent doesn't exist, create each segment iteratively
    if (err?.message?.includes('component of parent directory')) {
      const segments = cleanPath.split('/').filter(Boolean);
      let current = '';
      let lastResult: any = null;
      for (const seg of segments) {
        current += '/' + seg;
        lastResult = await callPCloudDirect('/createfolderifnotexists', { path: current });
      }
      return lastResult?.metadata as PCloudItem;
    }
    throw err;
  }
}

/**
 * List a folder by path instead of folder ID.
 */
export async function listPCloudFolderByPath(path: string, recursive = false): Promise<PCloudFolder> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const data = await callPCloudDirect('/listfolder', {
    path: cleanPath,
    recursive: recursive ? '1' : '0',
    showdeleted: '0',
  });
  const metadata = data.metadata || {};
  return {
    metadata,
    contents: (metadata.contents || []) as PCloudItem[],
  };
}
/**
 * Recursively list all folder paths under a given root path.
 * Returns a flat Set of relative paths (e.g. "WEDDING TALES NEPAL/MAGH EVENTS 2082/Client/Photos").
 * Uses pCloud's native recursive listing for a single API call.
 */
export async function listPCloudFolderRecursive(
  rootPath: string,
  _maxDepth: number = 5
): Promise<Set<string>> {
  const paths = new Set<string>();
  const cleanRoot = rootPath.startsWith('/') ? rootPath : `/${rootPath}`;

  // Add root itself
  const relRoot = cleanRoot.startsWith('/') ? cleanRoot.slice(1) : cleanRoot;
  paths.add(relRoot);

  try {
    const data = await callPCloudDirect('/listfolder', {
      path: cleanRoot,
      recursive: '1',
      showdeleted: '0',
    });

    // Walk the nested contents tree returned by pCloud
    function extractFolders(contents: PCloudItem[], parentPath: string) {
      for (const item of contents) {
        if (item.isfolder) {
          const itemPath = `${parentPath}/${item.name}`;
          const rel = itemPath.startsWith('/') ? itemPath.slice(1) : itemPath;
          paths.add(rel);
          if (item.contents && item.contents.length > 0) {
            extractFolders(item.contents, itemPath);
          }
        }
      }
    }

    const contents = (data.metadata?.contents || []) as PCloudItem[];
    extractFolders(contents, cleanRoot);
  } catch {
    // Root folder doesn't exist
  }

  return paths;
}
