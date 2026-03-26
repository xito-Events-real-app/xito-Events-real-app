import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "idrive-e2-api";

async function callE2(action: string, params: Record<string, unknown> = {}, method: "GET" | "POST" = "POST") {
  if (method === "GET") {
    const qp = new URLSearchParams({ action, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/${FUNCTION_NAME}?${qp}`;
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME + `?action=${action}`, {
    body: params,
  });
  if (error) throw error;
  return data;
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

export async function uploadToE2(path: string, file: File): Promise<{ success: boolean; key: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const fileBase64 = btoa(binary);
  return callE2("upload", {
    path,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileBase64,
  });
}

export async function deleteE2Object(key: string): Promise<{ success: boolean }> {
  return callE2("delete", { key });
}

export async function getE2FileUrl(key: string): Promise<string> {
  const data = await callE2("getSignedUrl", { key });
  return data.url;
}
