import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PCLOUD_API = 'https://api.pcloud.com';

// Cache auth token in memory to avoid re-login on every request
let cachedAuth: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedAuth && Date.now() < cachedAuth.expiresAt - 60000) {
    return cachedAuth.token;
  }

  const email = Deno.env.get('PCLOUD_EMAIL');
  const password = Deno.env.get('PCLOUD_PASSWORD');
  if (!email || !password) throw new Error('pCloud credentials not configured');

  const params = new URLSearchParams({
    getauth: '1',
    logout: '0',
    username: email,
    password: password,
    authexpire: '3600',
  });

  const res = await fetch(`${PCLOUD_API}/userinfo?${params}`);
  const data = await res.json();
  if (data.result !== 0) throw new Error(`pCloud login failed: ${data.error || 'Unknown error'}`);

  cachedAuth = {
    token: data.auth as string,
    expiresAt: Date.now() + 3600 * 1000,
  };

  return cachedAuth.token;
}

// Recursively sum file sizes from a folder listing
function sumFolderSize(contents: any[]): { totalBytes: number; fileCount: number } {
  let totalBytes = 0;
  let fileCount = 0;
  for (const item of contents) {
    if (item.isfolder && item.contents) {
      const sub = sumFolderSize(item.contents);
      totalBytes += sub.totalBytes;
      fileCount += sub.fileCount;
    } else if (!item.isfolder) {
      totalBytes += item.size || 0;
      fileCount++;
    }
  }
  return { totalBytes, fileCount };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await getAuthToken();
    const contentType = req.headers.get('content-type') || '';

    // For file uploads, handle multipart forwarding
    if (contentType.includes('multipart/form-data')) {
      const url = new URL(req.url);
      const folderId = url.searchParams.get('folderid') || '0';
      const filename = url.searchParams.get('filename') || 'file';

      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) throw new Error('No file in request');

      const pcloudForm = new FormData();
      pcloudForm.append('file', file, filename);

      const uploadRes = await fetch(
        `${PCLOUD_API}/uploadfile?auth=${auth}&folderid=${folderId}&filename=${encodeURIComponent(filename)}&nopartial=1`,
        { method: 'POST', body: pcloudForm }
      );
      const uploadData = await uploadRes.json();

      return new Response(JSON.stringify(uploadData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // JSON body for other actions
    const { action, params } = await req.json();

    let endpoint = '';
    const query = new URLSearchParams({ auth });

    switch (action) {
      case 'getauth':
        return new Response(JSON.stringify({ result: 0, auth }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'listfolder':
        endpoint = '/listfolder';
        query.set('folderid', String(params.folderid ?? 0));
        query.set('recursive', '0');
        query.set('showdeleted', '0');
        break;

      case 'createfolder':
        endpoint = '/createfolder';
        query.set('folderid', String(params.folderid ?? 0));
        query.set('name', params.name);
        break;

      case 'getfilelink':
        endpoint = '/getfilelink';
        query.set('fileid', String(params.fileid));
        break;

      case 'getthumblink':
        endpoint = '/getthumblink';
        query.set('fileid', String(params.fileid));
        query.set('size', params.size || '200x200');
        break;

      case 'getthumbslinks': {
        const fileids = params.fileids as number[];
        const size = params.size || '200x200';
        const results: Record<number, string> = {};
        
        const chunks: number[][] = [];
        for (let i = 0; i < fileids.length; i += 50) {
          chunks.push(fileids.slice(i, i + 50));
        }
        
        for (const chunk of chunks) {
          const promises = chunk.map(async (fid) => {
            try {
              const r = await fetch(`${PCLOUD_API}/getthumblink?auth=${auth}&fileid=${fid}&size=${size}`);
              const d = await r.json();
              if (d.hosts && d.path) {
                results[fid] = `https://${d.hosts[0]}${d.path}`;
              }
            } catch { /* skip failed thumbs */ }
          });
          await Promise.all(promises);
        }
        
        return new Response(JSON.stringify({ result: 0, thumbs: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getdiff': {
        const diffid = params.diffid || 0;
        const limit = params.limit || 100;
        const diffRes = await fetch(`${PCLOUD_API}/diff?auth=${auth}&diffid=${diffid}&limit=${limit}`);
        const diffData = await diffRes.json();
        return new Response(JSON.stringify(diffData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getrecentuploads': {
        // Recursively list /WEDDING TALES NEPAL, collect all files, sort by modified desc, return top N
        const wtnPath = params.path || '/WEDDING TALES NEPAL';
        const topN = params.limit || 30;
        const recRes = await fetch(`${PCLOUD_API}/listfolder?auth=${auth}&path=${encodeURIComponent(wtnPath)}&recursive=1&showdeleted=0`);
        const recData = await recRes.json();
        if (recData.result !== 0) {
          return new Response(JSON.stringify({ error: recData.error || 'Failed to list WTN' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Collect all files recursively with their full path
        interface FileEntry { name: string; path: string; size: number; modified: string; created: string; contenttype: string; }
        const allFiles: FileEntry[] = [];
        
        function collectFiles(items: any[], parentPath: string) {
          for (const item of items) {
            if (item.isfolder && item.contents) {
              collectFiles(item.contents, `${parentPath}/${item.name}`);
            } else if (!item.isfolder) {
              allFiles.push({
                name: item.name,
                path: `${parentPath}/${item.name}`,
                size: item.size || 0,
                modified: item.modified || '',
                created: item.created || '',
                contenttype: item.contenttype || '',
              });
            }
          }
        }
        
        const rootContents = recData.metadata?.contents || [];
        collectFiles(rootContents, wtnPath);
        
        // Sort by modified descending (most recent first)
        allFiles.sort((a, b) => {
          const ta = new Date(a.modified).getTime() || 0;
          const tb = new Date(b.modified).getTime() || 0;
          return tb - ta;
        });
        
        // Parse path segments for each entry
        const recent = allFiles.slice(0, topN).map(f => {
          // Path: /WEDDING TALES NEPAL/monthYear/clientName/category/event/...
          const segments = f.path.split('/').filter(Boolean);
          // segments[0] = WEDDING TALES NEPAL, [1] = monthYear, [2] = clientName, [3] = category, [4] = event, ...
          return {
            fileName: f.name,
            fullPath: f.path,
            size: f.size,
            modified: f.modified,
            created: f.created,
            contenttype: f.contenttype,
            monthYear: segments[1] || '',
            clientName: segments[2] || '',
            category: segments[3] || '',
            eventName: segments[4] || '',
          };
        });
        
        return new Response(JSON.stringify({ result: 0, files: recent, totalFiles: allFiles.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'calculatefoldersize': {
        // Calculate total size of a folder recursively
        const folderPath = params.path;
        const folderId = params.folderid;
        
        let sizeQuery: string;
        if (folderPath) {
          sizeQuery = `path=${encodeURIComponent(folderPath)}&recursive=1&showdeleted=0`;
        } else {
          sizeQuery = `folderid=${folderId}&recursive=1&showdeleted=0`;
        }
        
        const sizeRes = await fetch(`${PCLOUD_API}/listfolder?auth=${auth}&${sizeQuery}`);
        const sizeData = await sizeRes.json();
        
        if (sizeData.result !== 0) {
          return new Response(JSON.stringify({ error: sizeData.error || 'Failed to list folder' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const contents = sizeData.metadata?.contents || [];
        const { totalBytes, fileCount } = sumFolderSize(contents);
        const folderName = sizeData.metadata?.name || '';
        
        return new Response(JSON.stringify({ 
          result: 0, 
          totalBytes, 
          fileCount, 
          folderName,
          folderPath: folderPath || `folderid:${folderId}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'calculatesubfoldersizes': {
        // Calculate sizes for all immediate subfolders of a given folder
        const parentPath = params.path;
        
        // First list the parent to get subfolders
        const listRes = await fetch(`${PCLOUD_API}/listfolder?auth=${auth}&path=${encodeURIComponent(parentPath)}&recursive=0&showdeleted=0`);
        const listData = await listRes.json();
        
        if (listData.result !== 0) {
          return new Response(JSON.stringify({ error: listData.error || 'Failed to list folder' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const subfolders = (listData.metadata?.contents || []).filter((i: any) => i.isfolder);
        const results: Array<{ name: string; path: string; totalBytes: number; fileCount: number }> = [];
        
        // Process in parallel batches of 5
        const batchSize = 5;
        for (let i = 0; i < subfolders.length; i += batchSize) {
          const batch = subfolders.slice(i, i + batchSize);
          const promises = batch.map(async (sf: any) => {
            try {
              const sfPath = `${parentPath}/${sf.name}`;
              const sfRes = await fetch(`${PCLOUD_API}/listfolder?auth=${auth}&path=${encodeURIComponent(sfPath)}&recursive=1&showdeleted=0`);
              const sfData = await sfRes.json();
              if (sfData.result === 0) {
                const contents = sfData.metadata?.contents || [];
                const { totalBytes, fileCount } = sumFolderSize(contents);
                results.push({ name: sf.name, path: sfPath, totalBytes, fileCount });
              }
            } catch { /* skip */ }
          });
          await Promise.all(promises);
        }
        
        return new Response(JSON.stringify({ result: 0, folders: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'userinfo':
        endpoint = '/userinfo';
        break;

      case 'stat':
        endpoint = '/stat';
        query.set('fileid', String(params.fileid));
        break;

      case 'deletefile':
        endpoint = '/deletefile';
        query.set('fileid', String(params.fileid));
        break;

      case 'deletefolder':
        endpoint = '/deletefolderrecursive';
        query.set('folderid', String(params.folderid));
        break;

      case 'renamefolder':
        endpoint = '/renamefolder';
        query.set('folderid', String(params.folderid));
        query.set('toname', params.toname);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const res = await fetch(`${PCLOUD_API}${endpoint}?${query}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('pcloud-api error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
