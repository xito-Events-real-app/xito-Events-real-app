import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "idrive-e2-api";

async function callE2(action: string, params: Record<string, unknown> = {}, method: "GET" | "POST" = "POST") {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  if (method === "GET") {
    const qp = new URLSearchParams({ action, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    const url = `https://${projectId}.supabase.co/functions/v1/${FUNCTION_NAME}?${qp}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }

  const url = `https://${projectId}.supabase.co/functions/v1/${FUNCTION_NAME}?action=${encodeURIComponent(action)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export interface E2File {
  key: string;
  size: number;
  lastModified: string;
}

export interface E2ListResult {
  folders: string[];
  files: E2File[];
}

export async function listE2Folder(prefix: string): Promise<E2ListResult> {
  return callE2("list", { prefix }, "GET");
}

export async function createE2Folder(path: string): Promise<{ success: boolean; key: string }> {
  return callE2("createFolder", { path });
}

export async function uploadToE2(
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; key: string }> {
  // Get a presigned PUT URL from the edge function (no file data sent to edge fn)
  const data = await callE2("getUploadUrl", {
    path,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
  });

  // Upload directly to iDrive E2 using XMLHttpRequest for progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Direct upload failed: ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });

  return { success: true, key: data.key };
}

export async function deleteE2Object(key: string): Promise<{ success: boolean }> {
  return callE2("delete", { key });
}

export async function getE2FileUrl(key: string): Promise<string> {
  const data = await callE2("getSignedUrl", { key });
  return data.url;
}

/** Batch-fetch signed URLs for multiple keys in a single call */
export async function getE2FileUrls(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const data = await callE2("getSignedUrls", { keys });
  return data.urls;
}
