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
  photographerName: string;
  photographerRole: string; // PB | PG | EP | ''
  photographerSide: string; // BRIDE SIDE | GROOM SIDE | ''
}

const FINALIZED_CUTOFF_YEAR = 2082;
const FINALIZED_CUTOFF_MONTH = 12;

const ALL_PHOTOS_LABEL = "All Photos";

const PHOTOGRAPHER_ROLES: { column: string; code: "PB" | "PG" | "EP"; side: string }[] = [
  { column: "photographer_bride", code: "PB", side: "BRIDE SIDE" },
  { column: "photographer_groom", code: "PG", side: "GROOM SIDE" },
  { column: "extra_photographer", code: "EP", side: "" },
];

function normalizeKeyPart(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEditType(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (key === "all_photos" || key === "all photos") return "All Photos";
  if (key === "selected_photos" || key === "selected photos") return "Selected Photos";
  if (key === "insta_post" || key === "insta post") return "Insta Post";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isAllPhotos(editType: string | null | undefined): boolean {
  return normalizeEditType(editType).toLowerCase() === "all photos";
}

function isAtOrBeforeChaitra2082(eventYear: string | null | undefined, eventMonth: string | null | undefined): boolean {
  const year = Number(eventYear || 0);
  const month = Number(eventMonth || 0);
  if (!year) return false;
  if (year < FINALIZED_CUTOFF_YEAR) return true;
  if (year > FINALIZED_CUTOFF_YEAR) return false;
  return month > 0 && month <= FINALIZED_CUTOFF_MONTH;
}

/** Split a comma / pipe / newline separated freelancer field into individual names. */
function splitFreelancerNames(value: string | null | undefined): string[] {
  return (value || "")
    .split(/[,|\n]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Compose tracker uniqueness key. Identity = event + edit-type + photographer-role + photographer-name. */
function makeTrackerCompositeKey(
  registeredDateTimeAD: string,
  eventName: string | null | undefined,
  editType: string | null | undefined,
  photographerRole: string | null | undefined,
  photographerName: string | null | undefined,
): string {
  return [
    registeredDateTimeAD,
    normalizeKeyPart(eventName),
    normalizeKeyPart(editType),
    (photographerRole || "").toUpperCase(),
    normalizeKeyPart(photographerName),
  ].join("||");
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
    photographerName: r.photographer_name || "",
    photographerRole: (r.photographer_role || "").toUpperCase(),
    photographerSide: r.photographer_side || "",
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

/**
 * Generate one tracker row per assigned photographer for "All Photos" deliverable.
 * Selected Photos / Insta Post are NOT auto-generated — they come from the
 * selection workflow in the deliverables module.
 */
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

  // Load assignments for booked events
  const bookedRegDates = Array.from(bookedMap.keys());
  const allAssignments: any[] = [];
  for (let i = 0; i < bookedRegDates.length; i += 50) {
    const batch = bookedRegDates.slice(i, i + 50);
    const { data } = await supabase
      .from("freelancer_assignments")
      .select("registered_date_time_ad, event, photographer_bride, photographer_groom, extra_photographer")
      .in("registered_date_time_ad", batch);
    if (data) allAssignments.push(...data);
  }

  const assignmentMap = new Map<string, any>(); // key = regDate||normalized event
  for (const a of allAssignments) {
    assignmentMap.set(`${a.registered_date_time_ad}||${normalizeKeyPart(a.event)}`, a);
  }

  // Existing All-Photos rows for de-duplication
  const { data: existingRows } = await supabase
    .from("photo_edit_tracker")
    .select("registered_date_time_ad, event_name, edit_type, photographer_role, photographer_name")
    .eq("deleted", false);

  const existingKeys = new Set(
    (existingRows || []).map((r) =>
      makeTrackerCompositeKey(
        r.registered_date_time_ad,
        r.event_name || "",
        r.edit_type || "",
        r.photographer_role || "",
        r.photographer_name || "",
      ),
    ),
  );

  const newRows: any[] = [];
  for (const ev of bookedEvents) {
    const client = bookedMap.get(ev.registered_date_time_ad)!;
    const assignmentKey = `${ev.registered_date_time_ad}||${normalizeKeyPart(ev.event_name)}`;
    const assignment = assignmentMap.get(assignmentKey);
    if (!assignment) continue; // no photographers assigned yet → no rows

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
      edit_type: ALL_PHOTOS_LABEL,
      synced_to_sheet: false,
      stage_history: `${autoStatus} [${new Date().toISOString()}]`,
    };

    for (const role of PHOTOGRAPHER_ROLES) {
      const names = splitFreelancerNames(assignment[role.column]);
      for (const name of names) {
        const compositeKey = makeTrackerCompositeKey(
          ev.registered_date_time_ad,
          ev.event_name || "",
          ALL_PHOTOS_LABEL,
          role.code,
          name,
        );
        if (existingKeys.has(compositeKey)) continue;
        existingKeys.add(compositeKey);
        newRows.push({
          ...baseRow,
          reference: name,
          photographer_name: name,
          photographer_role: role.code,
          photographer_side: role.side,
        });
      }
    }
  }

  if (newRows.length === 0) return 0;

  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    const { error } = await supabase.from("photo_edit_tracker").insert(batch);
    if (error && error.code !== "23505") console.error("[PHOTO-EDIT] Insert error:", error);
  }

  return newRows.length;
}

/**
 * Soft-delete auto-generated "All Photos" QUEUE rows whose photographer is
 * no longer present in the assignment for that event. Other edit types
 * (Selected Photos / Insta Post) are owned by the deliverables workflow and
 * are intentionally left untouched here.
 */
export async function syncPhotoRowsWithDeliverables(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: queueRows } = await supabase
    .from("photo_edit_tracker")
    .select("id, registered_date_time_ad, event_name, edit_type, photographer_role, photographer_name, event_date_ad")
    .eq("deleted", false)
    .eq("photo_edit_status", "QUEUE");

  if (!queueRows?.length) return 0;

  // Only consider auto-generated All Photos rows
  const allPhotosRows = queueRows.filter((r) => isAllPhotos(r.edit_type));
  if (allPhotosRows.length === 0) return 0;

  const regDates = Array.from(new Set(allPhotosRows.map((r) => r.registered_date_time_ad)));
  const allAssignments: any[] = [];
  for (let i = 0; i < regDates.length; i += 50) {
    const batch = regDates.slice(i, i + 50);
    const { data } = await supabase
      .from("freelancer_assignments")
      .select("registered_date_time_ad, event, photographer_bride, photographer_groom, extra_photographer")
      .in("registered_date_time_ad", batch);
    if (data) allAssignments.push(...data);
  }

  // Build map: assignmentKey → set of "ROLE||normalized name"
  const assignedSetMap = new Map<string, Set<string>>();
  for (const a of allAssignments) {
    const key = `${a.registered_date_time_ad}||${normalizeKeyPart(a.event)}`;
    const set = new Set<string>();
    for (const role of PHOTOGRAPHER_ROLES) {
      for (const name of splitFreelancerNames(a[role.column])) {
        set.add(`${role.code}||${normalizeKeyPart(name)}`);
      }
    }
    assignedSetMap.set(key, set);
  }

  const toDelete: string[] = [];
  for (const row of allPhotosRows) {
    if ((row.event_date_ad || "") > today) {
      toDelete.push(row.id);
      continue;
    }
    const assignmentKey = `${row.registered_date_time_ad}||${normalizeKeyPart(row.event_name || "")}`;
    const assignedSet = assignedSetMap.get(assignmentKey);
    if (!assignedSet) {
      toDelete.push(row.id);
      continue;
    }
    const rowKey = `${(row.photographer_role || "").toUpperCase()}||${normalizeKeyPart(row.photographer_name || "")}`;
    if (!assignedSet.has(rowKey)) toDelete.push(row.id);
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
