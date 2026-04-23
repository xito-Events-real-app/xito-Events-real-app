import { supabase } from "@/integrations/supabase/client";

export const OFFICIAL_VENUE_TYPES = [
  "Banquet",
  "Hotel",
  "Resort",
  "Restaurant",
  "Church",
  "Temple",
  "Gumba",
  "Mosque",
  "Park",
  "Court",
  "Gurudwara",
  "Home",
] as const;

/** Normalize a venue type string to Title Case (e.g. "BANQUET" → "Banquet"). */
export function normalizeVenueType(input: string): string {
  const t = (input || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export interface XitoGlobalVenue {
  id: string;
  venue_type: string;
  venue_name: string;
  city: string;
  area: string;
  location_briefing: string;
  company_whatsapp: string;
  company_contact: string;
  gmail: string;
  owner1_name: string;
  owner1_contact: string;
  owner1_whatsapp: string;
  owner2_name: string;
  owner2_contact: string;
  owner2_whatsapp: string;
  google_map: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  rating: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export type VenueDraft = Omit<
  XitoGlobalVenue,
  "id" | "created_at" | "updated_at" | "source"
> & { source?: string };

const TABLE = "xito_global_all_venues" as const;

export async function getAllVenues(): Promise<XitoGlobalVenue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("venue_name", { ascending: true });

  if (error) {
    console.error("[xito-global-venues-api] getAllVenues error:", error);
    return [];
  }
  return (data || []) as XitoGlobalVenue[];
}

export async function getVenueById(id: string): Promise<XitoGlobalVenue | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[xito-global-venues-api] getVenueById error:", error);
    return null;
  }
  return (data as XitoGlobalVenue) || null;
}

export async function addVenue(draft: VenueDraft): Promise<XitoGlobalVenue> {
  const payload = { ...draft, source: draft.source || "manual" };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload as any)
    .select("*")
    .single();
  if (error) {
    console.error("[xito-global-venues-api] addVenue error:", error);
    throw error;
  }
  return data as XitoGlobalVenue;
}

export async function updateVenue(
  id: string,
  patch: Partial<VenueDraft>
): Promise<XitoGlobalVenue> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("[xito-global-venues-api] updateVenue error:", error);
    throw error;
  }
  return data as XitoGlobalVenue;
}

export async function deleteVenue(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[xito-global-venues-api] deleteVenue error:", error);
    throw error;
  }
}

/** Mirror writer used by the Event Details flow. Never throws. */
export async function mirrorVenueFromEventDetails(input: {
  venueType: string;
  name: string;
  city: string;
  area: string;
  googleMap: string;
}): Promise<void> {
  try {
    const payload = {
      venue_type: normalizeVenueType(input.venueType) || "Other",
      venue_name: input.name || "",
      city: input.city || "",
      area: input.area || "",
      location_briefing: "",
      company_whatsapp: "",
      company_contact: "",
      gmail: "",
      owner1_name: "",
      owner1_contact: "",
      owner1_whatsapp: "",
      owner2_name: "",
      owner2_contact: "",
      owner2_whatsapp: "",
      google_map: input.googleMap || "",
      website: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      rating: 0,
      source: "event_details",
    };
    if (!payload.venue_name) return;
    // Best-effort insert; ignore unique-violation silently.
    const { error } = await supabase.from(TABLE).insert(payload as any);
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      console.warn("[xito-global-venues-api] mirror insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[xito-global-venues-api] mirror exception:", err);
  }
}

/** Returns booking counts and per-venue client lists keyed by lowercased venue name. */
export interface VenueBooking {
  client_name: string;
  event_name: string;
  event_date_ad: string;
  registered_date_time_ad: string;
}
export interface VenueBookingsMap {
  [lowerName: string]: VenueBooking[];
}

export async function getVenueBookings(): Promise<VenueBookingsMap> {
  const { data, error } = await supabase
    .from("event_details_cache")
    .select(
      "venue_name, event_name, event_date_ad, registered_date_time_ad, client_name:registered_date_time_ad"
    );
  if (error) {
    console.error("[xito-global-venues-api] getVenueBookings error:", error);
    return {};
  }
  // event_details_cache doesn't have client_name; we need to join via clients_cache.
  return {};
}

/**
 * Fetches bookings grouped by lowercased venue name. Joins event_details_cache
 * with clients_cache via registered_date_time_ad.
 */
export async function getVenueBookingsWithClients(): Promise<VenueBookingsMap> {
  const [eventsRes, clientsRes] = await Promise.all([
    supabase
      .from("event_details_cache")
      .select("venue_name, event_name, event_date_ad, registered_date_time_ad"),
    supabase
      .from("clients_cache")
      .select("registered_date_time_ad, client_name"),
  ]);

  if (eventsRes.error) {
    console.error("[xito-global-venues-api] events fetch error:", eventsRes.error);
    return {};
  }
  if (clientsRes.error) {
    console.error("[xito-global-venues-api] clients fetch error:", clientsRes.error);
  }

  const clientByReg = new Map<string, string>();
  (clientsRes.data || []).forEach((c: any) => {
    if (c?.registered_date_time_ad) {
      clientByReg.set(c.registered_date_time_ad, c.client_name || "");
    }
  });

  const map: VenueBookingsMap = {};
  (eventsRes.data || []).forEach((row: any) => {
    const name = (row?.venue_name || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map[key]) map[key] = [];
    map[key].push({
      client_name: clientByReg.get(row.registered_date_time_ad) || "",
      event_name: row.event_name || "",
      event_date_ad: row.event_date_ad || "",
      registered_date_time_ad: row.registered_date_time_ad || "",
    });
  });
  return map;
}