import { supabase } from "@/integrations/supabase/client";
import { adToBS, nepaliMonthsEnglish } from "@/lib/nepali-date";

export interface XitoTransfer {
  id: string;
  created_at: string;
  transfer_type: string;
  title: string;
  content: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  url: string;
  url_description: string;
  expires_at: string;
}

export async function fetchTransfers(): Promise<XitoTransfer[]> {
  const { data, error } = await supabase
    .from("xito_transfers")
    .select("*")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addNote(title: string, content: string) {
  const { error } = await supabase.from("xito_transfers").insert({
    transfer_type: "note",
    title,
    content,
  });
  if (error) throw error;
}

export async function addUrl(url: string, url_description: string) {
  const { error } = await supabase.from("xito_transfers").insert({
    transfer_type: "url",
    title: url_description || url,
    url,
    url_description,
  });
  if (error) throw error;
}

export async function uploadFile(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error("File must be less than 20MB");
  const path = `${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("xito-transfers").upload(path, file);
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from("xito-transfers").getPublicUrl(path);
  const { error } = await supabase.from("xito_transfers").insert({
    transfer_type: "file",
    title: file.name,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
  });
  if (error) throw error;
}

export async function deleteTransfer(id: string, fileUrl?: string) {
  if (fileUrl) {
    const parts = fileUrl.split("/xito-transfers/");
    if (parts[1]) {
      await supabase.storage.from("xito-transfers").remove([parts[1]]);
    }
  }
  const { error } = await supabase.from("xito_transfers").delete().eq("id", id);
  if (error) throw error;
}

export function formatTransferDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const adStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

  try {
    const bs = adToBS(date);
    const bsMonthName = nepaliMonthsEnglish[bs.month - 1];
    return `${adStr} / ${bs.day} ${bsMonthName} ${bs.year}`;
  } catch {
    return adStr;
  }
}

export function groupByDate(transfers: XitoTransfer[]): { label: string; items: XitoTransfer[] }[] {
  const groups: Record<string, XitoTransfer[]> = {};
  const order: string[] = [];

  for (const t of transfers) {
    const label = formatTransferDate(t.created_at);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(t);
  }

  // Sort: Today first, Tomorrow second, then chronological
  const priority = (l: string) => (l === "Today" ? 0 : l === "Tomorrow" ? 1 : 2);
  order.sort((a, b) => priority(a) - priority(b));

  return order.map(label => ({ label, items: groups[label] }));
}

export function daysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
