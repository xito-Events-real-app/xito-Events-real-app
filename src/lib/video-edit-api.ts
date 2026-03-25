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
  forceSplit: boolean;
  isPlaying: boolean;
  playingSince: string;
  editStartedAt: string;
  deadline: string;
  stageHistory: string;
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

/**
 * Compute the effective enabled deliverables for an event.
 * For default-ON types (full_video, highlights): enabled unless explicit row says enabled=false
 * For all others: enabled only if explicit row says enabled=true
 */
function computeEffectiveDeliverables(
  allDeliverablesForEvent: any[],
): any[] {
  const byType = new Map<string, any>();
  for (const d of allDeliverablesForEvent) {
    byType.set(d.deliverable_type, d);
  }

  const effective: any[] = [];

  for (const defaultType of DEFAULT_ON_TYPES) {
    const row = byType.get(defaultType);
    if (!row) {
      effective.push({
        deliverable_type: defaultType,
        enabled: true,
        quantity: 1,
        item_names: "",
      });
    } else if (row.enabled) {
      effective.push(row);
    }
  }

  for (const type of Array.from(byType.keys())) {
    const row = byType.get(type)!;
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
    forceSplit: r.force_split || false,
    isPlaying: r.is_playing || false,
    playingSince: r.playing_since || "",
    editStartedAt: r.edit_started_at || "",
    deadline: r.deadline || "",
    stageHistory: r.stage_history || "",
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
    deadline: "deadline",
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
  const PROGRESS_STAGES = ['EDIT_ON_PROGRESS', 'COLOR_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'];
  const updateData: Record<string, any> = {
    video_edit_status: newStatus,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  };

  // Fetch current row for edit_started_at and stage_history
  const { data: existing } = await supabase
    .from("video_edit_tracker")
    .select("edit_started_at, stage_history")
    .eq("id", id)
    .single();

  // Auto-set edit_started_at when first moving to a progress stage
  if (PROGRESS_STAGES.includes(newStatus)) {
    if (!existing?.edit_started_at) {
      updateData.edit_started_at = new Date().toISOString();
    }
    // Auto-start playing when moving to EDIT_ON_PROGRESS
    if (newStatus === 'EDIT_ON_PROGRESS') {
      updateData.is_playing = true;
      updateData.playing_since = new Date().toISOString();
    }
  }

  // Append to stage_history
  const historyEntry = `${newStatus} [${new Date().toISOString()}]`;
  const currentHistory = existing?.stage_history || "";
  updateData.stage_history = currentHistory ? `${currentHistory}\n${historyEntry}` : historyEntry;

  const { error } = await supabase
    .from("video_edit_tracker")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[VIDEO-EDIT] Push to status error:", error);
    throw new Error(error.message);
  }
}

/**
 * Helper: generate tracker rows from an effective deliverables list
 */
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
        rows.push({ ...baseRow, sub_event_name: itemNames[0] || "", edit_type: editType });
        existingKeys.add(compositeKey);
      }
    } else {
      for (let i = 0; i < qty; i++) {
        const subName = itemNames[i] || `${editType} ${i + 1}`;
        const compositeKey = makeTrackerCompositeKey(regDateTimeAD, eventName, subName, editType);
        if (!existingKeys.has(compositeKey)) {
          rows.push({ ...baseRow, sub_event_name: subName, edit_type: editType });
          existingKeys.add(compositeKey);
        }
      }
    }
  }
  return rows;
}

/**
 * Auto-generate video edit rows from past/today events of BOOKED clients.
 * Uses per-type default logic: full_video and highlights are ON by default.
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
    .from("video_edit_tracker")
    .select("registered_date_time_ad, event_name, sub_event_name, edit_type")
    .eq("deleted", false);

  const existingKeys = new Set(
    (existingRows || []).map((r) =>
      makeTrackerCompositeKey(
        r.registered_date_time_ad,
        r.event_name || "",
        r.sub_event_name || "",
        normalizeEditType(r.edit_type),
      ),
    ),
  );

  const bookedRegDates = Array.from(bookedMap.keys());
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

  const eventDeliverablesMap = new Map<string, any[]>();
  const overallDeliverablesMap = new Map<string, any[]>();

  for (const d of allDeliverables) {
    const section = (d.section || "").toLowerCase();
    if (section === "overall") {
      if (!overallDeliverablesMap.has(d.registered_date_time_ad)) {
        overallDeliverablesMap.set(d.registered_date_time_ad, []);
      }
      overallDeliverablesMap.get(d.registered_date_time_ad)!.push(d);
    } else if (VIDEO_DELIVERABLE_SECTIONS.includes(section as (typeof VIDEO_DELIVERABLE_SECTIONS)[number])) {
      const key = makeEventKey(d.registered_date_time_ad, d.event_name);
      if (!eventDeliverablesMap.has(key)) eventDeliverablesMap.set(key, []);
      eventDeliverablesMap.get(key)!.push(d);
    }
  }

  const newRows: any[] = [];
  const processedOverall = new Set<string>();

  for (const ev of bookedEvents) {
    const client = bookedMap.get(ev.registered_date_time_ad)!;
    const delKey = makeEventKey(ev.registered_date_time_ad, ev.event_name || "");
    const rawDeliverables = eventDeliverablesMap.get(delKey) || [];

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

    const effective = computeEffectiveDeliverables(rawDeliverables);
    const generated = generateRowsFromEffective(
      effective,
      baseRow,
      ev.event_name || "",
      ev.registered_date_time_ad,
      existingKeys,
    );
    newRows.push(...generated);

    if (!processedOverall.has(ev.registered_date_time_ad)) {
      processedOverall.add(ev.registered_date_time_ad);
      const overallDels = overallDeliverablesMap.get(ev.registered_date_time_ad);
      if (overallDels && overallDels.length > 0) {
        const clientEvents = bookedEvents.filter((e) => e.registered_date_time_ad === ev.registered_date_time_ad);
        const latestEvent = clientEvents.reduce(
          (latest, e) => ((e.event_date_ad || "") > (latest.event_date_ad || "") ? e : latest),
          clientEvents[0],
        );

        const enabledOverall = overallDels.filter((d) => d.enabled);
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

        const overallGenerated = generateRowsFromEffective(
          enabledOverall,
          overallBaseRow,
          "OVERALL",
          ev.registered_date_time_ad,
          existingKeys,
        );
        newRows.push(...overallGenerated);
      }
    }
  }

  if (newRows.length === 0) return 0;

  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    try {
      const { error } = await supabase.from("video_edit_tracker").insert(batch);
      if (error) {
        if (error.code === "23505") {
          console.log("[VIDEO-EDIT] Skipped duplicate rows in batch");
        } else {
          console.error("[VIDEO-EDIT] Insert error:", error);
        }
      }
    } catch (err) {
      console.error("[VIDEO-EDIT] Insert batch error:", err);
    }
  }

  console.log(`[VIDEO-EDIT] Auto-generated ${newRows.length} rows`);
  return newRows.length;
}

/**
 * Sync tracker rows with deliverables: soft-delete QUEUE rows
 * whose deliverable type is effectively disabled.
 * Uses per-type logic: full_video/highlights are ON unless explicitly disabled.
 */
export async function syncWithDeliverables(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: queueRows } = await supabase
    .from("video_edit_tracker")
    .select("id, registered_date_time_ad, event_name, sub_event_name, edit_type, event_date_ad")
    .eq("deleted", false)
    .eq("video_edit_status", "QUEUE");

  if (!queueRows?.length) return 0;

  const regDates = Array.from(new Set(queueRows.map((r) => r.registered_date_time_ad)));

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

  const allEventDetails: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from("event_details_cache")
      .select("registered_date_time_ad, event_name, event_date_ad")
      .in("registered_date_time_ad", batch);
    if (data) allEventDetails.push(...data);
  }

  const actualEventDateMap = new Map<string, string>();
  for (const event of allEventDetails) {
    actualEventDateMap.set(makeEventKey(event.registered_date_time_ad, event.event_name), event.event_date_ad || "");
  }

  const eventDeliverablesMap = new Map<string, any[]>();
  for (const d of allDeliverables) {
    const section = (d.section || "").toLowerCase();
    const eventName = section === "overall" ? "OVERALL" : d.event_name;
    const key = makeEventKey(d.registered_date_time_ad, eventName);
    if (!eventDeliverablesMap.has(key)) eventDeliverablesMap.set(key, []);
    eventDeliverablesMap.get(key)!.push(d);
  }

  const effectiveEnabledMap = new Map<string, Set<string>>();
  for (const groupKey of Array.from(eventDeliverablesMap.keys())) {
    const dels = eventDeliverablesMap.get(groupKey)!;
    const isOverall = groupKey.endsWith(`||${normalizeKeyPart("OVERALL")}`);
    let effective: any[];
    if (isOverall) {
      effective = dels.filter((d) => d.enabled);
    } else {
      effective = computeEffectiveDeliverables(dels);
    }

    const enabledSet = new Set<string>();
    for (const d of effective) {
      const editType = normalizeEditType(d.deliverable_type);
      if (!editType) continue;
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
    const normalizedGroupKey = makeEventKey(row.registered_date_time_ad, row.event_name || "");
    const actualEventDate = row.event_name === "OVERALL"
      ? null
      : actualEventDateMap.get(normalizedGroupKey);

    if ((actualEventDate && actualEventDate > today) || ((row.event_date_ad || "") > today && !actualEventDate)) {
      toDelete.push(row.id);
      continue;
    }

    const rowEditType = normalizeEditType(row.edit_type || "");
    const rowKey = makeEnabledRowKey(row.sub_event_name || "", rowEditType);
    const deliverableKey = editTypeToDeliverableKey(rowEditType);

    const hasRecords = eventDeliverablesMap.has(normalizedGroupKey);

    if (!hasRecords) {
      if (!isDefaultOnType(deliverableKey)) {
        toDelete.push(row.id);
      }
    } else {
      const enabledSet = effectiveEnabledMap.get(normalizedGroupKey);
      if (!enabledSet || !enabledSet.has(rowKey)) {
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
