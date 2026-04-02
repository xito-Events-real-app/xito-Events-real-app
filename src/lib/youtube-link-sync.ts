import { supabase } from "@/integrations/supabase/client";

interface TrackerRow {
  id: string;
  registeredDateTimeAD: string;
  eventName: string;
  subEventName: string;
  editType: string;
  youtubeLink: string;
  videoEditStatus: string;
}

interface PlaylistInfo {
  id: string;
  title: string;
}

interface PlaylistVideo {
  videoId: string;
  title: string;
}

const SYNC_ELIGIBLE_STAGES = [
  "EXPORTED",
  "CLIENT_REVIEW",
  "RE_EDIT_ON_PROGRESS",
  "FINALIZED",
];

function fuzzyMatch(haystack: string, needle: string): boolean {
  if (!needle || needle.length < 3) return false;
  if (haystack.includes(needle)) return true;
  const prefix = needle.slice(0, Math.min(4, needle.length));
  return haystack.includes(prefix);
}

function normalizeForMatch(s: string): string {
  return (s || "")
    .toUpperCase()
    .replace(/['''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEventKeyword(eventName: string): string {
  const norm = normalizeForMatch(eventName);
  return norm
    .replace(/^(BRIDES?|GROOMS?)\s+/i, "")
    .trim();
}

/**
 * Sync YouTube links from playlists into video_edit_tracker rows
 * that are in EXPORTED+ stages with empty youtube_link.
 */
export async function syncYouTubeLinks(rows: TrackerRow[]): Promise<number> {
  // Filter rows that need syncing
  const needsSync = rows.filter(
    (r) =>
      SYNC_ELIGIBLE_STAGES.includes((r.videoEditStatus || "").toUpperCase()) &&
      !r.youtubeLink
  );

  if (needsSync.length === 0) return 0;

  // Group by registeredDateTimeAD (client)
  const byClient: Record<string, TrackerRow[]> = {};
  for (const r of needsSync) {
    if (!byClient[r.registeredDateTimeAD]) byClient[r.registeredDateTimeAD] = [];
    byClient[r.registeredDateTimeAD].push(r);
  }

  // Fetch contact details for all clients at once
  const clientIds = Object.keys(byClient);
  const { data: contacts } = await supabase
    .from("contact_details_cache")
    .select("registered_date_time_ad, bride_full_name, groom_full_name")
    .in("registered_date_time_ad", clientIds);

  if (!contacts || contacts.length === 0) return 0;

  // Build lookup
  const contactMap: Record<string, { bride: string; groom: string }> = {};
  for (const c of contacts) {
    contactMap[c.registered_date_time_ad] = {
      bride: c.bride_full_name || "",
      groom: c.groom_full_name || "",
    };
  }

  // Fetch all playlists once
  let playlists: PlaylistInfo[] = [];
  try {
    const { data } = await supabase.functions.invoke("youtube-upload", {
      body: { action: "listPlaylists" },
    });
    playlists = data?.playlists || [];
  } catch (err) {
    console.error("[YT-SYNC] Failed to fetch playlists:", err);
    return 0;
  }

  let updatedCount = 0;

  for (const [clientId, clientRows] of Object.entries(byClient)) {
    const contact = contactMap[clientId];
    if (!contact) continue;

    const brideFirst = contact.bride.split(" ")[0]?.toLowerCase();
    const groomFirst = contact.groom.split(" ")[0]?.toLowerCase();

    if (!brideFirst || !groomFirst) continue;

    // Find matching playlist
    const matched = playlists.find((p) => {
      const t = p.title.toLowerCase();
      return fuzzyMatch(t, brideFirst) && fuzzyMatch(t, groomFirst);
    });

    if (!matched) continue;

    // Fetch playlist videos
    let videos: PlaylistVideo[] = [];
    try {
      const { data } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "getPlaylistVideos", playlistId: matched.id },
      });
      videos = data?.videos || [];
    } catch (err) {
      console.error("[YT-SYNC] Failed to fetch playlist videos:", err);
      continue;
    }

    if (videos.length === 0) continue;

    // Match each tracker row to a video by event name + edit type in title
    for (const row of clientRows) {
      const eventNorm = normalizeForMatch(row.subEventName || row.eventName);
      const eventKeyword = extractEventKeyword(row.subEventName || row.eventName);
      const editTypeNorm = normalizeForMatch(row.editType);

      // Map edit types to what appears in titles
      const editTypeVariants: string[] = [editTypeNorm];
      if (editTypeNorm === "FULL VIDEO") editTypeVariants.push("FULL VIDEO");
      if (editTypeNorm === "HIGHLIGHTS") editTypeVariants.push("HIGHLIGHT");
      if (editTypeNorm === "REEL" || editTypeNorm === "REELS") {
        editTypeVariants.push("REEL", "REELS");
      }
      if (editTypeNorm === "TEASER") editTypeVariants.push("TEASER");

      const matchedVideo = videos.find((v) => {
        const titleNorm = normalizeForMatch(v.title);
        const hasType = editTypeVariants.some((et) => titleNorm.includes(et));
        if (!hasType) return false;
        // Strategy 1: exact event name match
        if (titleNorm.includes(eventNorm)) return true;
        // Strategy 2: keyword fallback (e.g. "MEHNDI" instead of "BRIDES MEHNDI")
        if (eventKeyword && eventKeyword !== eventNorm && titleNorm.includes(eventKeyword)) return true;
        return false;
      });

      if (matchedVideo) {
        const ytLink = `https://youtu.be/${matchedVideo.videoId}`;
        try {
          await supabase
            .from("video_edit_tracker")
            .update({
              youtube_link: ytLink,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          updatedCount++;
        } catch (err) {
          console.error("[YT-SYNC] Failed to update row:", row.id, err);
        }
      }
    }
  }

  return updatedCount;
}
