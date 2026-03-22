import { supabase } from "@/integrations/supabase/client";
import { getCurrentStatus } from "@/lib/client-card-utils";

export interface VideoEditRow {
  id: string;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  videoEditStatus: string;
  urgency: string;
  priority: string;
  subEventName: string;
  editType: string;
  editor: string;
  companyNotes: string;
  clientDemand: string;
  reference: string;
  songs: string;
}

const VIDEO_DELIVERABLE_SECTIONS = ["video", "videos"] as const;

/** These deliverable types are ON by default even when no DB row exists */
const DEFAULT_ON_TYPES = ["full_video", "highlights"] as const;

function isDefaultOnType(deliverableType: string): boolean {
  const key = deliverableType.toLowerCase().replace(/[\s_-]+/g, "_");
  return (DEFAULT_ON_TYPES as readonly string[]).includes(key);
}

/** Reverse-map normalized edit type back to deliverable_type key */
function editTypeToDeliverableKey(editType: string): string {
  const map: Record<string, string> = {
    "Full Video": "full_video",
    "Highlights": "highlights",
    "Reel": "reel",
    "Video Insta Post": "video_insta_post",
    "Overall Highlights": "overall_highlights",
    "Overall Reel": "overall_reel",
  };
  return map[editType] || editType.toLowerCase().replace(/\s+/g, "_");
}

/**
 * Compute the effective enabled deliverables for an event.
 * For default-ON types (full_video, highlights): enabled unless explicit row says enabled=false
 * For all others: enabled only if explicit row says enabled=true
 */
function computeEffectiveDeliverables(
  allDeliverablesForEvent: any[],
): any[] {
  // Build a map of type → deliverable row
  const byType = new Map<string, any>();
  for (const d of allDeliverablesForEvent) {
    byType.set(d.deliverable_type, d);
  }

  const effective: any[] = [];

  // Check default-ON types
  for (const defaultType of DEFAULT_ON_TYPES) {
    const row = byType.get(defaultType);
    if (!row) {
      // No row = default ON → create a synthetic enabled entry
      effective.push({
        deliverable_type: defaultType,
        enabled: true,
        quantity: 1,
        item_names: "",
      });
    } else if (row.enabled) {
      effective.push(row);
    }
    // If row exists and enabled=false → skip (disabled)
  }

  // Check all other types (only if explicitly enabled)
  for (const [type, row] of byType.entries()) {
    if ((DEFAULT_ON_TYPES as readonly string[]).includes(type)) continue;
    if (row.enabled) {
      effective.push(row);
    }
  }

  return effective;
}

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  full_video: "Full Video",
  highlights: "Highlights",
  reel: "Reel",
  video_insta_post: "Video Insta Post",
  overall_highlights: "Overall Highlights",
  overall_reel: "Overall Reel",
};

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

function splitItemNames(value: string | null | undefined): string[] {
  return (value || "")
    .split(/\|\|\||,/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function dbToRow(r: any): VideoEditRow {
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
    videoEditStatus: r.video_edit_status || "QUEUE",
    urgency: r.urgency || "",
    priority: "",
    subEventName: r.sub_event_name || "",
    editType: normalizeEditType(r.edit_type),
    editor: r.editor || "",
    companyNotes: r.company_notes || "",
    clientDemand: r.client_demand || "",
    reference: r.reference || "",
    songs: r.songs || "",
  };
}

export async function getVideoEditRows(): Promise<VideoEditRow[]> {
  const { data, error } = await supabase
    .from("video_edit_tracker")
    .select("*")
    .eq("deleted", false)
    .order("event_date_ad", { ascending: true });

  if (error) {
    console.error("[VIDEO-EDIT] Load error:", error);
    return [];
  }
  return (data || []).map(dbToRow);
}

export async function updateVideoEditField(id: string, field: string, value: string): Promise<void> {
  const fieldMap: Record<string, string> = {
    urgency: "urgency",
    editor: "editor",
    videoEditStatus: "video_edit_status",
    companyNotes: "company_notes",
    clientDemand: "client_demand",
    reference: "reference",
    songs: "songs",
    subEventName: "sub_event_name",
    editType: "edit_type",
  };
  const dbField = fieldMap[field] || field;

  const normalizedValue = field === "editType" ? normalizeEditType(value) : value;

  const { error } = await supabase
    .from("video_edit_tracker")
    .update({ [dbField]: normalizedValue, synced_to_sheet: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[VIDEO-EDIT] Update error:", error);
    throw new Error(error.message);
  }
}

export async function pushToStatus(id: string, newStatus: string): Promise<void> {
  const { error } = await supabase
    .from("video_edit_tracker")
    .update({ video_edit_status: newStatus, synced_to_sheet: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[VIDEO-EDIT] Push to status error:", error);
    throw new Error(error.message);
  }
}

/**
 * Auto-generate video edit rows from past/today events of BOOKED clients.
 * Mirrors the file management auto-generation pattern.
 */
export async function ensureVideoEditRows(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: events, error: evErr } = await supabase
    .from("event_details_cache")
    .select("registered_date_time_ad, event_name, event_year, event_month, event_day, event_date_ad")
    .lte("event_date_ad", today)
    .neq("event_date_ad", "")
    .not("event_date_ad", "is", null);

  if (evErr || !events?.length) return 0;

  const regDates = [...new Set(events.map((e) => e.registered_date_time_ad))];

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
    .from("video_edit_tracker")
    .select("registered_date_time_ad, event_name, sub_event_name, edit_type")
    .eq("deleted", false);

  const existingKeys = new Set(
    (existingRows || []).map(
      (r) =>
        `${r.registered_date_time_ad}||${r.event_name}||${r.sub_event_name || ""}||${normalizeEditType(r.edit_type)}`,
    ),
  );

  const bookedRegDates = [...bookedMap.keys()];
  const allDeliverables: any[] = [];
  for (let i = 0; i < bookedRegDates.length; i += 50) {
    const batch = bookedRegDates.slice(i, i + 50);
    const { data } = await supabase
      .from("client_deliverables")
      .select("*")
      .in("registered_date_time_ad", batch)
      .in("section", [...VIDEO_DELIVERABLE_SECTIONS, "overall"]);
    if (data) allDeliverables.push(...data);
  }

  const deliverablesMap = new Map<string, any[]>();
  const overallDeliverablesMap = new Map<string, any[]>();
  const hasAnyRecordsMap = new Set<string>();

  for (const d of allDeliverables) {
    const section = (d.section || "").toLowerCase();
    const eventName = section === "overall" ? "OVERALL" : d.event_name;
    const groupKey = `${d.registered_date_time_ad}||${eventName}`;
    hasAnyRecordsMap.add(groupKey);

    if (!d.enabled) continue;

    if (section === "overall") {
      if (!overallDeliverablesMap.has(d.registered_date_time_ad)) overallDeliverablesMap.set(d.registered_date_time_ad, []);
      overallDeliverablesMap.get(d.registered_date_time_ad)!.push(d);
      continue;
    }

    if (!VIDEO_DELIVERABLE_SECTIONS.includes(section as (typeof VIDEO_DELIVERABLE_SECTIONS)[number])) continue;

    const key = `${d.registered_date_time_ad}||${d.event_name}`;
    if (!deliverablesMap.has(key)) deliverablesMap.set(key, []);
    deliverablesMap.get(key)!.push(d);
  }

  const newRows: any[] = [];
  const processedOverall = new Set<string>();

  for (const ev of bookedEvents) {
    const client = bookedMap.get(ev.registered_date_time_ad)!;
    const delKey = `${ev.registered_date_time_ad}||${ev.event_name}`;
    const deliverables = deliverablesMap.get(delKey);

    const baseRow = {
      registered_date_time_ad: ev.registered_date_time_ad,
      registered_date_bs: client.registered_date_bs,
      client_name: client.client_name,
      event_name: ev.event_name || "",
      event_year: ev.event_year || "",
      event_month: ev.event_month || "",
      event_day: ev.event_day || "",
      event_date_ad: ev.event_date_ad || "",
      video_edit_status: "QUEUE",
      synced_to_sheet: false,
    };

    if (deliverables && deliverables.length > 0) {
      for (const d of deliverables) {
        const editType = normalizeEditType(d.deliverable_type);
        if (!editType) continue;

        const qty = d.quantity || 1;
        const itemNames = splitItemNames(d.item_names);

        if (qty <= 1 && itemNames.length <= 1) {
          const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||${itemNames[0] || ""}||${editType}`;
          if (!existingKeys.has(compositeKey)) {
            newRows.push({ ...baseRow, sub_event_name: itemNames[0] || "", edit_type: editType });
            existingKeys.add(compositeKey);
          }
        } else {
          for (let i = 0; i < qty; i++) {
            const subName = itemNames[i] || `${editType} ${i + 1}`;
            const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||${subName}||${editType}`;
            if (!existingKeys.has(compositeKey)) {
              newRows.push({ ...baseRow, sub_event_name: subName, edit_type: editType });
              existingKeys.add(compositeKey);
            }
          }
        }
      }
    } else {
      const eventGroupKey = `${ev.registered_date_time_ad}||${ev.event_name}`;
      if (!hasAnyRecordsMap.has(eventGroupKey)) {
        for (const editType of ["Full Video", "Highlights"]) {
          const compositeKey = `${ev.registered_date_time_ad}||${ev.event_name}||||${editType}`;
          if (!existingKeys.has(compositeKey)) {
            newRows.push({ ...baseRow, sub_event_name: "", edit_type: editType });
            existingKeys.add(compositeKey);
          }
        }
      }
    }

    if (!processedOverall.has(ev.registered_date_time_ad)) {
      processedOverall.add(ev.registered_date_time_ad);
      const overallDels = overallDeliverablesMap.get(ev.registered_date_time_ad);
      if (overallDels) {
        const clientEvents = bookedEvents.filter((e) => e.registered_date_time_ad === ev.registered_date_time_ad);
        const latestEvent = clientEvents.reduce(
          (latest, e) => ((e.event_date_ad || "") > (latest.event_date_ad || "") ? e : latest),
          clientEvents[0],
        );

        for (const d of overallDels) {
          const editType = normalizeEditType(d.deliverable_type);
          if (!editType) continue;

          const qty = d.quantity || 1;
          const itemNames = splitItemNames(d.item_names);

          const overallBaseRow = {
            registered_date_time_ad: ev.registered_date_time_ad,
            registered_date_bs: client.registered_date_bs,
            client_name: client.client_name,
            event_name: "OVERALL",
            event_year: latestEvent.event_year || "",
            event_month: latestEvent.event_month || "",
            event_day: latestEvent.event_day || "",
            event_date_ad: latestEvent.event_date_ad || "",
            video_edit_status: "QUEUE",
            synced_to_sheet: false,
          };

          if (qty <= 1 && itemNames.length <= 1) {
            const compositeKey = `${ev.registered_date_time_ad}||OVERALL||${itemNames[0] || ""}||${editType}`;
            if (!existingKeys.has(compositeKey)) {
              newRows.push({ ...overallBaseRow, sub_event_name: itemNames[0] || "", edit_type: editType });
              existingKeys.add(compositeKey);
            }
          } else {
            for (let i = 0; i < qty; i++) {
              const subName = itemNames[i] || `${editType} ${i + 1}`;
              const compositeKey = `${ev.registered_date_time_ad}||OVERALL||${subName}||${editType}`;
              if (!existingKeys.has(compositeKey)) {
                newRows.push({ ...overallBaseRow, sub_event_name: subName, edit_type: editType });
                existingKeys.add(compositeKey);
              }
            }
          }
        }
      }
    }
  }

  if (newRows.length === 0) return 0;

  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    const { error } = await supabase.from("video_edit_tracker").insert(batch);
    if (error) {
      console.error("[VIDEO-EDIT] Insert error:", error);
    }
  }

  console.log(`[VIDEO-EDIT] Auto-generated ${newRows.length} rows`);
  return newRows.length;
}

/**
 * Sync tracker rows with deliverables: soft-delete QUEUE rows
 * whose deliverable was disabled or replaced by configured ones.
 */
export async function syncWithDeliverables(): Promise<number> {
  const { data: queueRows } = await supabase
    .from("video_edit_tracker")
    .select("id, registered_date_time_ad, event_name, sub_event_name, edit_type")
    .eq("deleted", false)
    .eq("video_edit_status", "QUEUE");

  if (!queueRows?.length) return 0;

  const regDates = [...new Set(queueRows.map((r) => r.registered_date_time_ad))];

  const allDeliverables: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from("client_deliverables")
      .select("*")
      .in("registered_date_time_ad", batch)
      .in("section", [...VIDEO_DELIVERABLE_SECTIONS, "overall"]);
    if (data) allDeliverables.push(...data);
  }

  const delMap = new Map<string, Set<string>>();
  const hasAnyConfigured = new Set<string>();
  const hasEnabledConfigured = new Set<string>();

  for (const d of allDeliverables) {
    const section = (d.section || "").toLowerCase();
    const eventName = section === "overall" ? "OVERALL" : d.event_name;
    const groupKey = `${d.registered_date_time_ad}||${eventName}`;
    hasAnyConfigured.add(groupKey);

    if (!d.enabled) continue;

    const editType = normalizeEditType(d.deliverable_type);
    if (!editType) continue;

    hasEnabledConfigured.add(groupKey);
    if (!delMap.has(groupKey)) delMap.set(groupKey, new Set());
    const itemNames = splitItemNames(d.item_names);
    const qty = d.quantity || 1;

    if (qty <= 1 && itemNames.length <= 1) {
      delMap.get(groupKey)!.add(`${itemNames[0] || ""}||${editType}`);
    } else {
      for (let i = 0; i < qty; i++) {
        const subName = itemNames[i] || `${editType} ${i + 1}`;
        delMap.get(groupKey)!.add(`${subName}||${editType}`);
      }
    }
  }

  const toDelete: string[] = [];

  for (const row of queueRows) {
    const groupKey = `${row.registered_date_time_ad}||${row.event_name}`;
    const rowKey = `${row.sub_event_name || ""}||${normalizeEditType(row.edit_type || "")}`;

    if (hasAnyConfigured.has(groupKey)) {
      if (!hasEnabledConfigured.has(groupKey)) {
        toDelete.push(row.id);
      } else if (!delMap.get(groupKey)?.has(rowKey)) {
        toDelete.push(row.id);
      }
    }
  }

  if (toDelete.length === 0) return 0;

  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    await supabase
      .from("video_edit_tracker")
      .update({ deleted: true, synced_to_sheet: false, updated_at: new Date().toISOString() })
      .in("id", batch);
  }

  console.log(`[VIDEO-EDIT] Cleaned up ${toDelete.length} stale QUEUE rows`);
  return toDelete.length;
}

export async function pushVideoEditsToSheets(): Promise<number> {
  const { data, error } = await supabase.functions.invoke("google-sheets", {
    body: { action: "pushVideoEditsToSheet" },
  });

  if (error) {
    console.error("[VIDEO-EDIT] Push to sheets error:", error);
    return 0;
  }
  return data?.pushed || 0;
}
