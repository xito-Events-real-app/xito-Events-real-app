import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────
export interface StorageDevice {
  id: string;
  device_type: string;
  device_name: string;
  pc_drive_letter: string | null;
  total_storage_gb: number;
  used_storage_gb: number;
  remaining_storage_gb: number;
  health_percent: number;
  safety_status: string;
  speed_rating: number;
  purchase_date_ad: string;
  purchase_date_bs: string;
  price_npr: number;
  purchased_from: string;
  cloud_type: string;
  expiry_date_ad: string;
  synced_to_sheet: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  registered_date_time_ad: string;
  registered_date_bs: string;
  client_name: string;
  event_name: string;
  event_year: string;
  event_month: string;
  event_day: string;
  event_date_ad: string;
  freelancer_type: string;
  freelancer_name: string;
  storage_type: string;
  storage_device_id: string | null;
  year_event_folder: string;
  category: string;
  client_folder_name: string;
  event_folder_name: string;
  side: string;
  card_label: string;
  size_gb: number;
  number_of_items: number;
  format_type: string;
  who_copied: string;
  reconfirmation: boolean;
  double_backup: boolean;
  double_backup_path: string;
  triple_backup: boolean;
  triple_backup_path: string;
  drive_upload: boolean;
  drive_upload_path: string;
  deleted_or_not: boolean;
  final_generated_path: string;
  synced_to_sheet: boolean;
  created_at: string;
  updated_at: string;
  // New columns for redesign
  backup_1_device_name: string;
  backup_2_path: string;
  backup_2_device_name: string;
  backup_3_path: string;
  backup_3_device_name: string;
  drive_link: string;
  notes: string;
  confirmed: boolean;
  backup_1_recorded_at: string;
  backup_2_recorded_at: string;
  backup_3_recorded_at: string;
  backup_history: string;
}

// ── Storage Devices API ─────────────────────────────────
export async function getStorageDevices(): Promise<StorageDevice[]> {
  const { data, error } = await (supabase as any)
    .from("storage_devices")
    .select("*")
    .order("device_type", { ascending: true })
    .order("device_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addStorageDevice(device: Partial<StorageDevice>): Promise<StorageDevice> {
  const { data, error } = await (supabase as any)
    .from("storage_devices")
    .insert(device)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStorageDevice(id: string, updates: Partial<StorageDevice>): Promise<StorageDevice> {
  const { data, error } = await (supabase as any)
    .from("storage_devices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStorageDevice(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("storage_devices")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Files Management API ─────────────────────────────────
export async function getFileRecords(filters?: {
  clientName?: string;
  eventMonth?: string;
  eventYear?: string;
}): Promise<FileRecord[]> {
  let query = (supabase as any)
    .from("files_management")
    .select("*")
    .eq("deleted_or_not", false)
    .order("created_at", { ascending: false });

  if (filters?.clientName) query = query.eq("client_name", filters.clientName);
  if (filters?.eventMonth) query = query.eq("event_month", filters.eventMonth);
  if (filters?.eventYear) query = query.eq("event_year", filters.eventYear);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addFileRecord(record: Partial<FileRecord>): Promise<FileRecord> {
  const { data, error } = await (supabase as any)
    .from("files_management")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFileRecord(id: string, updates: Partial<FileRecord>): Promise<FileRecord> {
  const { data, error } = await (supabase as any)
    .from("files_management")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFileRecord(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("files_management")
    .update({ deleted_or_not: true })
    .eq("id", id);
  if (error) throw error;
}

// ── Auto-generate file rows from freelancer assignments ──
export const CREW_CODE_MAP: Record<string, { field: string; code: string; category: string; side: string }> = {
  photographer_bride: { field: "photographer_bride", code: "PB", category: "PHOTOS", side: "BRIDE SIDE" },
  photographer_groom: { field: "photographer_groom", code: "PG", category: "PHOTOS", side: "GROOM SIDE" },
  videographer_bride: { field: "videographer_bride", code: "VB", category: "VIDEOS", side: "BRIDE SIDE" },
  videographer_groom: { field: "videographer_groom", code: "VG", category: "VIDEOS", side: "GROOM SIDE" },
  extra_photographer: { field: "extra_photographer", code: "EP", category: "PHOTOS", side: "" },
  extra_videographer: { field: "extra_videographer", code: "EV", category: "VIDEOS", side: "" },
  drone_operator: { field: "drone_operator", code: "DRONE", category: "VIDEOS", side: "" },
  fpv_operator: { field: "fpv_operator", code: "FPV", category: "VIDEOS", side: "" },
  iphone_shooter: { field: "iphone_shooter", code: "IPHONE", category: "VIDEOS", side: "" },
  assistant: { field: "assistant", code: "ASST", category: "", side: "" },
};

export function autoGenerateFileRows(registeredDateTimeAD: string): Promise<FileRecord[]> {
  return _autoGenerateFileRows(registeredDateTimeAD, 1);
}

async function _autoGenerateFileRows(registeredDateTimeAD: string, cardNum: number): Promise<FileRecord[]> {
  const { data: assignments, error: assignErr } = await (supabase as any)
    .from("freelancer_assignments")
    .select("*")
    .eq("registered_date_time_ad", registeredDateTimeAD);
  if (assignErr) throw assignErr;
  if (!assignments || assignments.length === 0) return [];

  const { data: clientData } = await (supabase as any)
    .from("clients_cache")
    .select("client_name, registered_date_bs")
    .eq("registered_date_time_ad", registeredDateTimeAD)
    .single();

  const clientName = clientData?.client_name || "";
  const registeredDateBS = clientData?.registered_date_bs || "";

  const newRows: Partial<FileRecord>[] = [];

  for (const assignment of assignments) {
    const eventName = assignment.event || "";
    const eventYear = assignment.event_year || "";
    const eventMonth = assignment.event_month || "";
    const eventDay = assignment.event_day || "";
    const eventDateAD = assignment.event_date_ad || "";
    const yearEventFolder = eventMonth && eventYear
      ? (() => {
          const mn = parseInt(eventMonth, 10);
          const MONTHS: Record<number, string> = {1:"BAISAKH",2:"JESTHA",3:"ASHADH",4:"SHRAWAN",5:"BHADRA",6:"ASHWIN",7:"KARTIK",8:"MANGSIR",9:"POUSH",10:"MAGH",11:"FALGUN",12:"CHAITRA"};
          return `${MONTHS[mn] || eventMonth.toUpperCase()} EVENTS ${eventYear}`;
        })()
      : "";

    for (const [field, config] of Object.entries(CREW_CODE_MAP)) {
      const freelancerName = assignment[field];
      if (!freelancerName || freelancerName.trim() === "") continue;

      newRows.push({
        registered_date_time_ad: registeredDateTimeAD,
        registered_date_bs: registeredDateBS,
        client_name: clientName,
        event_name: eventName,
        event_year: eventYear,
        event_month: eventMonth,
        event_day: eventDay,
        event_date_ad: eventDateAD,
        freelancer_type: config.code,
        freelancer_name: freelancerName,
        year_event_folder: yearEventFolder,
        category: config.category,
        client_folder_name: clientName.toUpperCase(),
        event_folder_name: eventName.toUpperCase(),
        side: config.side,
        synced_to_sheet: false,
      });
    }
  }

  if (newRows.length === 0) return [];

  const { data, error } = await (supabase as any)
    .from("files_management")
    .insert(newRows)
    .select();
  if (error) throw error;
  return data ?? [];
}

// ── Path Builder Helpers ─────────────────────────────────
export function buildFilePath(params: {
  storageType: string;
  deviceName: string;
  pcDriveLetter?: string;
  yearEventFolder: string;
  category: string;
  clientFolderName: string;
  eventFolderName: string;
  side: string;
  freelancerName: string;
  cardLabel: string;
}): string {
  const segments = [
    params.yearEventFolder,
    params.category,
    params.clientFolderName,
    params.eventFolderName,
    params.side,
    params.freelancerName,
    params.cardLabel,
  ].filter(Boolean);

  if (params.storageType === "PC") {
    const drive = params.pcDriveLetter ? `${params.pcDriveLetter}:` : "";
    return `\\\\${params.deviceName}\\${drive}\\${segments.join("\\")}`;
  } else if (params.storageType === "HARD_DRIVE" || params.storageType === "SSD") {
    return `${params.deviceName}\\${segments.join("\\")}`;
  } else {
    return `${params.deviceName}\\${segments.join("\\")}`;
  }
}

// ── Stats helpers ────────────────────────────────────────
export async function getFileManagementStats(): Promise<{
  totalFiles: number;
  totalSizeGB: number;
  devicesCount: number;
  warningDevices: number;
}> {
  const [filesRes, devicesRes] = await Promise.all([
    (supabase as any).from("files_management").select("size_gb", { count: "exact" }).eq("deleted_or_not", false),
    (supabase as any).from("storage_devices").select("*"),
  ]);

  const files = filesRes.data ?? [];
  const devices = devicesRes.data ?? [];
  const totalSizeGB = files.reduce((sum: number, f: any) => sum + (Number(f.size_gb) || 0), 0);
  const warningDevices = devices.filter((d: any) => {
    const remaining = Number(d.remaining_storage_gb) || 0;
    const total = Number(d.total_storage_gb) || 1;
    return (remaining / total) < 0.1 || d.safety_status === "UNSAFE";
  }).length;

  return {
    totalFiles: filesRes.count ?? files.length,
    totalSizeGB: Math.round(totalSizeGB * 100) / 100,
    devicesCount: devices.length,
    warningDevices,
  };
}

// ── Google Sheets Sync Helpers ───────────────────────────
export async function syncStorageDevicesFromSheets(): Promise<{ upserted: number }> {
  const { data, error } = await supabase.functions.invoke("google-sheets", {
    body: { action: "pullStorageDevices" },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Failed to pull storage devices");
  return data.data;
}

export async function pushStorageDevicesToSheets(): Promise<{ pushed: number }> {
  const { data, error } = await supabase.functions.invoke("google-sheets", {
    body: { action: "pushStorageDevicesToSheet" },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Failed to push storage devices to sheet");
  return data.data;
}

export async function pushFilesToSheets(): Promise<{ pushed: number }> {
  const { data, error } = await supabase.functions.invoke("google-sheets", {
    body: { action: "pushFilesToSheet", data: { onlyWithBackup: false } },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Failed to push files to sheet");
  return data.data;
}

// ── Month-based helpers for Files redesign ──────────────
export interface FileMonthData {
  year: string;
  month: string;
  label: string;
  value: string;
}

export async function getAvailableFileMonths(): Promise<FileMonthData[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await (supabase as any)
    .from("freelancer_assignments")
    .select("event_year, event_month, event_date_ad")
    .neq("event_year", "")
    .neq("event_month", "")
    .neq("event_date_ad", "");

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const pastRows = data.filter((r: any) => {
    const d = r.event_date_ad || "";
    if (d.includes("**")) return false;
    return d <= today;
  });

  const seen = new Set<string>();
  const months: FileMonthData[] = [];
  for (const r of pastRows) {
    const key = `${r.event_year}-${r.event_month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const monthNum = parseInt(r.event_month, 10);
    const NEPALI_MONTHS: Record<number, string> = {
      1: "BAISAKH", 2: "JESTHA", 3: "ASHADH", 4: "SHRAWAN",
      5: "BHADRA", 6: "ASHWIN", 7: "KARTIK", 8: "MANGSIR",
      9: "POUSH", 10: "MAGH", 11: "FALGUN", 12: "CHAITRA",
    };
    months.push({
      year: r.event_year,
      month: r.event_month,
      label: `${NEPALI_MONTHS[monthNum] || `Month ${monthNum}`} ${r.event_year}`,
      value: key,
    });
  }

  months.sort((a, b) => {
    const ya = parseInt(a.year), yb = parseInt(b.year);
    if (ya !== yb) return yb - ya;
    return parseInt(b.month) - parseInt(a.month);
  });

  return months;
}

// Module-level lock to prevent concurrent ensure calls
let _ensureLock: Promise<void> | null = null;

export async function ensureFileRowsForMonth(eventYear: string, eventMonth: string): Promise<void> {
  if (_ensureLock) await _ensureLock;
  let resolve!: () => void;
  _ensureLock = new Promise(r => { resolve = r; });
  try {
    await _ensureFileRowsForMonthInner(eventYear, eventMonth);
  } finally {
    resolve();
    _ensureLock = null;
  }
}

async function _ensureFileRowsForMonthInner(eventYear: string, eventMonth: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: assignments, error: aErr } = await (supabase as any)
    .from("freelancer_assignments")
    .select("*")
    .eq("event_year", eventYear)
    .eq("event_month", eventMonth)
    .neq("event_date_ad", "");

  if (aErr) throw aErr;
  if (!assignments || assignments.length === 0) return;

  const pastAssignments = assignments.filter((a: any) => {
    const d = a.event_date_ad || "";
    if (d.includes("**")) return false;
    return d <= today;
  });

  if (pastAssignments.length === 0) return;

  const { data: existingFiles } = await (supabase as any)
    .from("files_management")
    .select("registered_date_time_ad, event_name, freelancer_type, freelancer_name")
    .eq("event_year", eventYear)
    .eq("event_month", eventMonth)
    .eq("deleted_or_not", false);

  const existingKeys = new Set(
    (existingFiles || []).map((f: any) =>
      `${f.registered_date_time_ad}||${f.event_name}||${f.freelancer_type}||${f.freelancer_name}`
    )
  );

  const uniqueRegDates = [...new Set(pastAssignments.map((a: any) => a.registered_date_time_ad))];
  const { data: clientsData } = await (supabase as any)
    .from("clients_cache")
    .select("registered_date_time_ad, client_name, registered_date_bs")
    .in("registered_date_time_ad", uniqueRegDates);

  const clientMap = new Map<string, { client_name: string; registered_date_bs: string }>();
  for (const c of clientsData || []) {
    clientMap.set(c.registered_date_time_ad, { client_name: c.client_name || "", registered_date_bs: c.registered_date_bs || "" });
  }

  const newRows: Partial<FileRecord>[] = [];

  for (const assignment of pastAssignments) {
    const regDate = assignment.registered_date_time_ad;
    const clientInfo = clientMap.get(regDate) || { client_name: assignment.client_name || "", registered_date_bs: "" };
    const eventName = assignment.event || "";
    const evYear = assignment.event_year || "";
    const evMonth = assignment.event_month || "";
    const evDay = assignment.event_day || "";
    const eventDateAD = assignment.event_date_ad || "";
    const yearEventFolder = evMonth && evYear
      ? (() => {
        const mn = parseInt(evMonth, 10);
        const MONTHS: Record<number, string> = {1:"BAISAKH",2:"JESTHA",3:"ASHADH",4:"SHRAWAN",5:"BHADRA",6:"ASHWIN",7:"KARTIK",8:"MANGSIR",9:"POUSH",10:"MAGH",11:"FALGUN",12:"CHAITRA"};
        return `${MONTHS[mn] || evMonth} EVENTS ${evYear}`;
      })()
      : "";

    for (const [field, config] of Object.entries(CREW_CODE_MAP)) {
      const freelancerName = assignment[field];
      if (!freelancerName || freelancerName.trim() === "") continue;

      const key = `${regDate}||${eventName}||${config.code}||${freelancerName}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      newRows.push({
        registered_date_time_ad: regDate,
        registered_date_bs: clientInfo.registered_date_bs,
        client_name: clientInfo.client_name,
        event_name: eventName,
        event_year: evYear,
        event_month: evMonth,
        event_day: evDay,
        event_date_ad: eventDateAD,
        freelancer_type: config.code,
        freelancer_name: freelancerName,
        year_event_folder: yearEventFolder,
        category: config.category,
        client_folder_name: clientInfo.client_name.toUpperCase(),
        event_folder_name: eventName.toUpperCase(),
        side: config.side,
        card_label: "1",
        synced_to_sheet: false,
      });
    }
  }

  if (newRows.length === 0) return;

  for (let i = 0; i < newRows.length; i += 50) {
    const batch = newRows.slice(i, i + 50);
    const { error } = await (supabase as any)
      .from("files_management")
      .insert(batch);
    if (error) throw error;
  }
}

// ── Duplicate file row for additional card ──────────────
export async function duplicateFileRowForCard(fileId: string, cardNumber: number): Promise<FileRecord> {
  const { data: original, error: fetchErr } = await (supabase as any)
    .from("files_management")
    .select("*")
    .eq("id", fileId)
    .single();
  if (fetchErr) throw fetchErr;

  const newRow: Partial<FileRecord> = {
    registered_date_time_ad: original.registered_date_time_ad,
    registered_date_bs: original.registered_date_bs,
    client_name: original.client_name,
    event_name: original.event_name,
    event_year: original.event_year,
    event_month: original.event_month,
    event_day: original.event_day,
    event_date_ad: original.event_date_ad,
    freelancer_type: original.freelancer_type,
    freelancer_name: original.freelancer_name,
    year_event_folder: original.year_event_folder,
    category: original.category,
    client_folder_name: original.client_folder_name,
    event_folder_name: original.event_folder_name,
    side: original.side,
    card_label: String(cardNumber),
    format_type: original.format_type,
    storage_type: "",
    storage_device_id: null,
    size_gb: 0,
    number_of_items: 0,
    final_generated_path: "",
    synced_to_sheet: false,
  };

  const { data, error } = await (supabase as any)
    .from("files_management")
    .insert(newRow)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Auto Card Increment ─────────────────────────────────
export async function getNextCardLabel(
  clientName: string,
  freelancerName: string,
  formatType: string
): Promise<string> {
  if (!formatType) return "";

  const prefixMap: Record<string, string> = {
    RAW_ONLY: "RAW",
    JPEG_ONLY: "JPEG",
    RAW_JPEG: "RJ",
    CF: "CF",
    NORMAL: "N",
    CF_NORMAL: "CFN",
  };
  const prefix = prefixMap[formatType] || formatType;

  const { data } = await (supabase as any)
    .from("files_management")
    .select("card_label")
    .eq("client_name", clientName)
    .eq("freelancer_name", freelancerName)
    .eq("deleted_or_not", false);

  if (!data || data.length === 0) return `${prefix}1`;

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");
  for (const row of data) {
    const match = (row.card_label || "").match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}${maxNum + 1}`;
}

// ── Helper: determine which backup number to set next ───
export function getNextBackupNumber(file: FileRecord): number {
  if (!file.final_generated_path) return 1;
  if (!file.backup_2_path) return 2;
  if (!file.backup_3_path) return 3;
  return 0; // all 3 filled
}
