import { supabase } from "@/integrations/supabase/client";
import { getCurrentStatus } from "@/lib/client-card-utils";

export interface PhotoEditRow {
  id: string;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  photoEditStatus: string;
  urgency: string;
  priority: string;
  subEventName: string;
  editType: string;
  editor: string;
  colorist: string;
  companyNotes: string;
  clientDemand: string;
  reference: string;
  songs: string;
  forceSplit: boolean;
  isPlaying: boolean;
  playingSince: string;
  editStartedAt: string;
  deadline: string;
  stageHistory: string;
  youtubeLink: string;
}

const PHOTO_SECTION = "photos";
const DEFAULT_ON_TYPES = ["all_photos"] as const;
const FINALIZED_CUTOFF_YEAR = 2082;
const FINALIZED_CUTOFF_MONTH = 12;

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  all_photos: "All Photos",
  selected_photos: "Selected Photos",
  insta_post: "Insta Post",
};

function normalizeKeyPart(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function makeEventKey(registeredDateTimeAD: string, eventName: string | null | undefined): string {
  return `${registeredDateTimeAD}||${normalizeKeyPart(eventName)}`;
}

function makeTrackerCompositeKey(
  registeredDateTimeAD: string,
  eventName: string | null | undefined,
  subEventName: string | null | undefined,
  editType: string | null | undefined,
): string {
  return `${registeredDateTimeAD}||${normalizeKeyPart(eventName)}||${normalizeKeyPart(subEventName)}||${normalizeKeyPart(editType)}`;
}

function makeEnabledRowKey(subEventName: string | null | undefined, editType: string | null | undefined): string {
  return `${normalizeKeyPart(subEventName)}||${normalizeKeyPart(editType)}`;
}

function normalizeEditType(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (DELIVERABLE_TYPE_LABELS[key]) return DELIVERABLE_TYPE_LABELS[key];
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function editTypeToDeliverableKey(editType: string): string {
  const map: Record<string, string> = {
    "All Photos": "all_photos",
    "Selected Photos": "selected_photos",
    "Insta Post": "insta_post",
  };
  return map[editType] || editType.toLowerCase().replace(/\s+/g, "_");
}

function splitItemNames(value: string | null | undefined): string[] {
  return (value || "")
    .split(/\|\|\||,/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function isDefaultOnType(deliverableType: string): boolean {
  const key = deliverableType.toLowerCase().replace(/[\s_-]+/g, "_");
  return (DEFAULT_ON_TYPES as readonly string[]).includes(key);
}

function isAtOrBeforeChaitra2082(eventYear: string | null | undefined, eventMonth: string | null | undefined): boolean {
  const year = Number(eventYear || 0);
  const month = Number(eventMonth || 0);
  if (!year) return false;
  if (year < FINALIZED_CUTOFF_YEAR) return true;
  if (year > FINALIZED_CUTOFF_YEAR) return false;
  return month > 0 && month <= FINALIZED_CUTOFF_MONTH;
}

function computeEffectiveDeliverables(allDeliverablesForEvent: any[]): any[] {
  const byType = new Map<string, any>();
  for (const d of allDeliverablesForEvent) {
    byType.set(d.deliverable_type, d);
  }

  const effective: any[] = [];
  for (const defaultType of DEFAULT_ON_TYPES) {
    const row = byType.get(defaultType);
    if (!row) {
      effective.push({ deliverable_type: defaultType, enabled: true, quantity: 1, item_names: "" });
    } else if (row.enabled) {
      effective.push(row);
    }
  }

  for (const type of Array.from(byType.keys())) {
    const row = byType.get(type)!;
    if ((DEFAULT_ON_TYPES as readonly string[]).includes(type)) continue;
    if (row.enabled) effective.push(row);
  }

  return effective;
}

function dbToRow(r: any): PhotoEditRow {
  return {
    id: r.id,
    registeredDateTimeAD: r.registered_date_time_ad || "",
    registeredDateBS: r.registered_date_bs || "",
    clientName: r.client_name || "",
    eventName: r.event_name || "",
    eventYear: r.event_year || "",
    eventMonth: r.event_month || "",
    eventDay: r.event_day || "",
    eventDateAD: r.event_date_ad || "",
    photoEditStatus: r.photo_edit_status || "QUEUE",
    urgency: r.urgency || "",
    priority: "",
    subEventName: "",
    editType: normalizeEditType(r.edit_type),
    editor: r.editor || "",
    colorist: "",
    companyNotes: r.company_notes || "",
    clientDemand: r.client_demand || "",
    reference: r.reference || "",
    songs: "",
    forceSplit: false,
    isPlaying: r.is_playing || false,
    playingSince: r.playing_since || "",
    editStartedAt: r.edit_started_at || "",
    deadline: r.deadline || "",
    stageHistory: r.stage_history || "",
    youtubeLink: "",
  };
}

export async function getPhotoEditRows(): Promise<PhotoEditRow[]> {
  const { data, error } = await supabase
    .from("photo_edit_tracker")
    .select("*")
    .eq("deleted", false)
    .order("event_date_ad", { ascending: true });

  if (error) {
    console.error("[PHOTO-EDIT] Load error:", error);
    return [];
  }

  return (data || []).map(dbToRow);
}

export async function updatePhotoEditField(id: string, field: string, value: string): Promise<void> {
  const fieldMap: Record<string, string> = {
    urgency: "urgency",
    editor: "editor",
    photoEditStatus: "photo_edit_status",
    companyNotes: "company_notes",
    clientDemand: "client_demand",
    reference: "reference",
    deadline: "deadline",
  };
  const dbField = fieldMap[field] || field;

  const updateData: Record<string, any> = {
    [dbField]: field === "editType" ? normalizeEditType(value) : value,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  };

  if (field === "editor") {
    const { data: existing } = await supabase
      .from("photo_edit_tracker")
      .select("editor, stage_history")
      .eq("id", id)
      .single();

    if (existing?.editor && existing.editor !== value) {
      const historyEntry = `EDITOR_CHANGED_FROM_${existing.editor}_TO_${value} [${new Date().toISOString()}]`;
      updateData.stage_history = existing.stage_history
        ? `${existing.stage_history}\n${historyEntry}`
        : historyEntry;
    }
  }

  const { error } = await supabase.from("photo_edit_tracker").update(updateData).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function pushPhotoToStatus(id: string, newStatus: string): Promise<void> {
  const PROGRESS_STAGES = ["EDIT_ON_PROGRESS", "RE_EDIT_ON_PROGRESS"];
  const updateData: Record<string, any> = {
    photo_edit_status: newStatus,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("photo_edit_tracker")
    .select("edit_started_at, stage_history")
    .eq("id", id)
    .single();

  if (PROGRESS_STAGES.includes(newStatus) && !existing?.edit_started_at) {
    updateData.edit_started_at = new Date().toISOString();
  }

  if (newStatus === "EDIT_ON_PROGRESS") {
    updateData.is_playing = true;
    updateData.playing_since = new Date().toISOString();
  }

  const historyEntry = `${newStatus} [${new Date().toISOString()}]`;
  updateData.stage_history = existing?.stage_history ? `${existing.stage_history}\n${historyEntry}` : historyEntry;

  const { error } = await supabase.from("photo_edit_tracker").update(updateData).eq("id", id);
  if (error) throw new Error(error.message);
}

function generateRowsFromEffective(
  effective: any[],
  baseRow: any,
  eventName: string,
  regDateTimeAD: string,
  existingKeys: Set<string>,
): any[] {
  const rows: any[] = [];

  for (const d of effective) {
    const editType = normalizeEditType(d.deliverable_type);
    if (!editType) continue;

    const qty = d.quantity || 1;
    const itemNames = splitItemNames(d.item_names);

    if (qty <= 1 && itemNames.length <= 1) {
      const compositeKey = makeTrackerCompositeKey(regDateTimeAD, eventName, itemNames[0] || "", editType);
      if (!existingKeys.has(compositeKey)) {
        rows.push({ ...baseRow, edit_type: editType });
        existingKeys.add(compositeKey);
      }
    } else {
      for (let i = 0; i < qty; i++) {
        const subName = itemNames[i] || `${editType} ${i + 1}`;
        const compositeKey = makeTrackerCompositeKey(regDateTimeAD, eventName, subName, editType);
        if (!existingKeys.has(compositeKey)) {
          rows.push({ ...baseRow, edit_type: editType, reference: subName });
          existingKeys.add(compositeKey);
        }
      }
    }
  }

  return rows;
}

export async function ensurePhotoEditRows(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: events, error: evErr } = await supabase
    .from("event_details_cache")
    .select("registered_date_time_ad, event_name, event_year, event_month, event_day, event_date_ad")
    .lte("event_date_ad", today)
    .neq("event_date_ad", "")
    .not("event_date_ad", "is", null);

  if (evErr || !events?.length) return 0;

  const regDates = Array.from(new Set(events.map((e) => e.registered_date_time_ad)));
  const allClients: any[] = [];

  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from("clients_cache")
      .select("registered_date_time_ad, client_name, registered_date_bs, status_log")
      .in("registered_date_time_ad", batch);
    if (data) allClients.push(...data);
  }

  const bookedMap = new Map<string, { client_name: string; registered_date_bs: string }>();
  for (const c of allClients) {
    const status = getCurrentStatus(c.status_log || "").toUpperCase();
    if (status.includes("BOOKED") && !status.includes("SOMEWHERE ELSE")) {
      bookedMap.set(c.registered_date_time_ad, {
        client_name: c.client_name || "",
        registered_date_bs: c.registered_date_bs || "",
      });
    }
  }
  if (bookedMap.size === 0) return 0;

  const bookedEvents = events.filter((e) => bookedMap.has(e.registered_date_time_ad));

  const { data: existingRows } = await supabase
    .from("photo_edit_tracker")
    .select("registered_date_time_ad, event_name, edit_type, reference")
    .eq("deleted", false);

  const existingKeys = new Set(
    (existingRows || []).map((r) => makeTrackerCompositeKey(r.registered_date_time_ad, r.event_name || "", r.reference || "", normalizeEditType(r.edit_type))),
  );

  const bookedRegDates = Array.from(bookedMap.keys());
  const allDeliverables: any[] = [];
  for (let i = 0; i < bookedRegDates.length; i += 50) {
    const batch = bookedRegDates.slice(i, i + 50);
    const { data } = await supabase
      .from("client_deliverables")
      .select("*")
      .in("registered_date_time_ad", batch)
      .eq("section", PHOTO_SECTION);
    if (data) allDeliverables.push(...data);
  }

  const eventDeliverablesMap = new Map<string, any[]>();
  for (const d of allDeliverables) {
    const key = makeEventKey(d.registered_date_time_ad, d.event_name);
    if (!eventDeliverablesMap.has(key)) eventDeliverablesMap.set(key, []);
    eventDeliverablesMap.get(key)!.push(d);
  }

  const newRows: any[] = [];
  for (const ev of bookedEvents) {
    const client = bookedMap.get(ev.registered_date_time_ad)!;
    const delKey = makeEventKey(ev.registered_date_time_ad, ev.event_name || "");
    const rawDeliverables = eventDeliverablesMap.get(delKey) || [];
    const effective = computeEffectiveDeliverables(rawDeliverables);
    const autoStatus = isAtOrBeforeChaitra2082(ev.event_year, ev.event_month) ? "FINALIZED" : "QUEUE";

    const baseRow = {
      registered_date_time_ad: ev.registered_date_time_ad,
      registered_date_bs: client.registered_date_bs,
      client_name: client.client_name,
      event_name: ev.event_name || "",
      event_year: ev.event_year || "",
      event_month: ev.event_month || "",
      event_day: ev.event_day || "",
      event_date_ad: ev.event_date_ad || "",
      photo_edit_status: autoStatus,
      synced_to_sheet: false,
      stage_history: `${autoStatus} [${new Date().toISOString()}]`,
    };

    newRows.push(...generateRowsFromEffective(effective, baseRow, ev.event_name || "", ev.registered_date_time_ad, existingKeys));
  }

  if (newRows.length === 0) return 0;

  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    const { error } = await supabase.from("photo_edit_tracker").insert(batch);
    if (error && error.code !== "23505") console.error("[PHOTO-EDIT] Insert error:", error);
  }

  return newRows.length;
}

export async function syncPhotoRowsWithDeliverables(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: queueRows } = await supabase
    .from("photo_edit_tracker")
    .select("id, registered_date_time_ad, event_name, edit_type, reference, event_date_ad")
    .eq("deleted", false)
    .eq("photo_edit_status", "QUEUE");

  if (!queueRows?.length) return 0;

  const regDates = Array.from(new Set(queueRows.map((r) => r.registered_date_time_ad)));
  const allDeliverables: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from("client_deliverables")
      .select("*")
      .in("registered_date_time_ad", batch)
      .eq("section", PHOTO_SECTION);
    if (data) allDeliverables.push(...data);
  }

  const eventDeliverablesMap = new Map<string, any[]>();
  for (const d of allDeliverables) {
    const key = makeEventKey(d.registered_date_time_ad, d.event_name);
    if (!eventDeliverablesMap.has(key)) eventDeliverablesMap.set(key, []);
    eventDeliverablesMap.get(key)!.push(d);
  }

  const effectiveEnabledMap = new Map<string, Set<string>>();
  for (const groupKey of Array.from(eventDeliverablesMap.keys())) {
    const effective = computeEffectiveDeliverables(eventDeliverablesMap.get(groupKey) || []);
    const enabledSet = new Set<string>();
    for (const d of effective) {
      const editType = normalizeEditType(d.deliverable_type);
      const qty = d.quantity || 1;
      const itemNames = splitItemNames(d.item_names);
      if (qty <= 1 && itemNames.length <= 1) {
        enabledSet.add(makeEnabledRowKey(itemNames[0] || "", editType));
      } else {
        for (let i = 0; i < qty; i++) {
          const subName = itemNames[i] || `${editType} ${i + 1}`;
          enabledSet.add(makeEnabledRowKey(subName, editType));
        }
      }
    }
    effectiveEnabledMap.set(groupKey, enabledSet);
  }

  const toDelete: string[] = [];
  for (const row of queueRows) {
    if ((row.event_date_ad || "") > today) {
      toDelete.push(row.id);
      continue;
    }

    const normalizedGroupKey = makeEventKey(row.registered_date_time_ad, row.event_name || "");
    const rowEditType = normalizeEditType(row.edit_type || "");
    const rowKey = makeEnabledRowKey(row.reference || "", rowEditType);
    const deliverableKey = editTypeToDeliverableKey(rowEditType);
    const hasRecords = eventDeliverablesMap.has(normalizedGroupKey);

    if (!hasRecords) {
      if (!isDefaultOnType(deliverableKey)) toDelete.push(row.id);
    } else {
      const enabledSet = effectiveEnabledMap.get(normalizedGroupKey);
      if (!enabledSet || !enabledSet.has(rowKey)) toDelete.push(row.id);
    }
  }

  if (toDelete.length === 0) return 0;

  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    await supabase
      .from("photo_edit_tracker")
      .update({ deleted: true, synced_to_sheet: false, updated_at: new Date().toISOString() })
      .in("id", batch);
  }

  return toDelete.length;
}
