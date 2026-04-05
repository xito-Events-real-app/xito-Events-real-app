import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Youtube, Search, Upload, ChevronDown, ChevronRight, Send, Loader2, Play, Clock, User, Palette, Calendar, Activity, Globe, RefreshCw, CheckCircle2, Eye, Link2, AlertTriangle } from "lucide-react";
import { computeVideoEditTimings } from "@/lib/video-edit-time-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useYouTubeUploadContext } from "@/contexts/YouTubeUploadContext";
import { YouTubeUploadDialog } from "./YouTubeUploadDialog";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface PlaylistInfo {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
}

interface RecentVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
}

interface PlaylistWithVideos extends PlaylistInfo {
  videos: PlaylistVideo[];
  loading: boolean;
}

interface VideoComment {
  id: string;
  video_id: string;
  author: string;
  comment: string;
  created_at: string;
}

interface TrackerRow {
  id: string;
  client_name: string | null;
  event_name: string | null;
  edit_type: string | null;
  editor: string | null;
  colorist: string | null;
  video_edit_status: string | null;
  edit_started_at: string | null;
  event_date_ad: string | null;
  stage_history: string;
  updated_at: string | null;
  youtube_link: string;
  created_at?: string | null;
  registered_date_time_ad?: string;
}

function extractYouTubeVideoId(link: string | null | undefined): string | null {
  if (!link) return null;
  const match = link.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

/** Extract ALL video IDs from a comma-separated youtube_link field */
function extractAllVideoIds(youtubeLink: string | null | undefined): string[] {
  if (!youtubeLink) return [];
  return youtubeLink.split(',').map(s => extractYouTubeVideoId(s.trim())).filter((id): id is string => !!id);
}

interface UploadSessionMapping {
  youtube_video_id: string;
  tracker_row_id: string | null;
  client_name: string;
  event_name: string;
  edit_type: string;
}

function getTrackerDisplayTitle(row: TrackerRow): string {
  return [row.client_name, row.event_name, row.edit_type].filter(Boolean).join(" ").trim() || "YouTube Video";
}

function buildRecentVideosFromTracker(rows: TrackerRow[]): RecentVideo[] {
  return rows
    .map((row) => {
      const videoId = extractYouTubeVideoId(row.youtube_link);
      if (!videoId) return null;

      return {
        videoId,
        title: getTrackerDisplayTitle(row),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: row.updated_at || row.created_at || new Date(0).toISOString(),
      } satisfies RecentVideo;
    })
    .filter((video): video is RecentVideo => Boolean(video))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function buildPlaylistsFromTracker(rows: TrackerRow[]): PlaylistWithVideos[] {
  const groups = new Map<string, PlaylistWithVideos>();

  for (const row of rows) {
    const videoId = extractYouTubeVideoId(row.youtube_link);
    if (!videoId) continue;

    const title = row.client_name?.trim() || row.event_name?.trim() || "Uncategorized";
    const existing = groups.get(title) || {
      id: `tracker-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      videos: [],
      loading: false,
    };

    existing.videos.push({
      videoId,
      title: getTrackerDisplayTitle(row),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      position: existing.videos.length,
    });

    groups.set(title, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.title.localeCompare(b.title));
}

const AUTHORS = ["BENZO", "BARUN", "SAUGAT", "NIKIT"];

const AUTHOR_COLORS: Record<string, string> = {
  BENZO: "bg-violet-600",
  BARUN: "bg-blue-600",
  SAUGAT: "bg-emerald-600",
  NIKIT: "bg-amber-600",
};

function formatDuration(ms: number): string {
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}D ${hours}H`;
  return `${hours}H`;
}

function computeEventAge(eventDateAd: string | null): string | null {
  if (!eventDateAd) return null;
  const eventDate = new Date(eventDateAd);
  if (isNaN(eventDate.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - eventDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return `in ${Math.abs(days)} days`;
  return `${days} days old`;
}

function computeTotalTime(editStartedAt: string | null, status: string | null, updatedAt: string | null): string | null {
  if (!editStartedAt) return null;
  const start = new Date(editStartedAt);
  if (isNaN(start.getTime())) return null;
  const end = status === "FINALIZED" && updatedAt ? new Date(updatedAt) : new Date();
  return formatDuration(end.getTime() - start.getTime());
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  if (days < 30) {
    if (remHrs > 0) return `${days}d ${remHrs}hr${remHrs > 1 ? 's' : ''} ago`;
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function timeAgoLarge(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  if (days < 30) {
    if (remHrs > 0) return `${days} day${days > 1 ? 's' : ''} ${remHrs} hour${remHrs > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? 's' : ''} ago`;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const adStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  // Convert to BS
  try {
    const NepaliDate = (window as any).__nepaliDateConverter;
    if (NepaliDate) {
      const nd = new NepaliDate(date);
      const nepaliMonthsEn = ["Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
      return `${adStr} / ${nepaliMonthsEn[nd.getMonth()]} ${nd.getDate()}`;
    }
  } catch {}
  return adStr;
}

// Group videos by date for section headers
function groupVideosByDate(videos: RecentVideo[]): { dateKey: string; dateHeader: string; dayLabel: string; videos: RecentVideo[] }[] {
  const groups: Map<string, RecentVideo[]> = new Map();
  for (const v of videos) {
    const d = new Date(v.publishedAt);
    const key = isNaN(d.getTime()) ? "unknown" : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  return Array.from(groups.entries()).map(([key, vids]) => ({
    dateKey: key,
    dateHeader: vids[0]?.publishedAt ? formatDateHeader(vids[0].publishedAt) : "",
    dayLabel: vids[0]?.publishedAt ? getDayLabel(vids[0].publishedAt) : "",
    videos: vids,
  }));
}

// localStorage cache helpers
const YT_CACHE_RECENT = "yt_cache_recent";
const YT_CACHE_PLAYLISTS = "yt_cache_playlists";
const YT_CACHE_RECENT_TS = "yt_cache_recent_ts";
const YT_CACHE_PLAYLISTS_TS = "yt_cache_playlists_ts";
const YT_CACHE_PLAYLIST_VIDEOS_PREFIX = "yt_cache_plvids_";
const YT_CACHE_PLAYLIST_VIDEOS_TS_PREFIX = "yt_cache_plvids_ts_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

function setCachedData(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function isCacheFresh(tsKey: string): boolean {
  try {
    const ts = localStorage.getItem(tsKey);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < CACHE_TTL_MS;
  } catch { return false; }
}

function setCacheTimestamp(tsKey: string) {
  try { localStorage.setItem(tsKey, String(Date.now())); } catch {}
}

const STAGE_COLORS: Record<string, string> = {
  QUEUE: "bg-gray-200 text-gray-700",
  EDIT_LAB: "bg-blue-100 text-blue-700",
  EDIT_ON_PROGRESS: "bg-indigo-100 text-indigo-700",
  COLOR_QUEUE: "bg-purple-100 text-purple-700",
  COLOR_ON_PROGRESS: "bg-fuchsia-100 text-fuchsia-700",
  INTERNAL_QC: "bg-orange-100 text-orange-700",
  EXPORTED: "bg-teal-100 text-teal-700",
  CLIENT_REVIEW: "bg-cyan-100 text-cyan-700",
  REVISION: "bg-rose-100 text-rose-700",
  FINALIZED: "bg-green-100 text-green-700",
};

function RunningTimeBadge({ stageHistory, currentStatus }: { stageHistory: string | null | undefined; currentStatus: string | null | undefined }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (currentStatus === "FINALIZED") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [currentStatus]);

  const entries = useMemo(() => {
    if (!stageHistory) return [];
    return stageHistory.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(.+?)\s+\[([^\]]+)\]$/);
      if (!m) return null;
      const d = new Date(m[2]);
      return isNaN(d.getTime()) ? null : { status: m[1].trim(), date: d };
    }).filter(Boolean) as { status: string; date: Date }[];
  }, [stageHistory]);

  const editStart = entries.find(e => e.status === "EDIT_ON_PROGRESS")?.date;
  if (!editStart) return null;

  const finalized = (() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].status === "FINALIZED") return entries[i].date;
    }
    return null;
  })();

  const end = finalized || new Date(now);
  const ms = end.getTime() - editStart.getTime();
  if (ms < 0) return null;

  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);

  const isRunning = !finalized;
  const display = hours >= 24
    ? `${Math.floor(hours / 24)}d ${hours % 24}h ${mins}m`
    : `${hours}h ${mins}m ${secs}s`;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0",
      isRunning ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"
    )}>
      <Clock className="w-3 h-3" />
      {display}
      {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
    </span>
  );
}

export function YouTubeDashboard({ open, onClose, initialVideoId, initialStartSeconds = 0 }: { open: boolean; onClose: () => void; initialVideoId?: string | null; initialStartSeconds?: number }) {
  const { jobs, activeCount } = useYouTubeUploadContext();
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>([]);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string; playlistTitle: string; publishedAt?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<string>("recent");
  const [allTrackerRows, setAllTrackerRows] = useState<TrackerRow[]>([]);
  const [contactDetailsMap, setContactDetailsMap] = useState<Map<string, { bride: string; groom: string }>>(new Map());

  // Infinite scroll
  const [recentNextPageToken, setRecentNextPageToken] = useState<string | null>(null);
  const [loadingMoreRecent, setLoadingMoreRecent] = useState(false);
  const recentScrollRef = useRef<HTMLDivElement>(null);

  // Stats
  const [todayUploaded, setTodayUploaded] = useState(0);
  const [totalTrackerRows, setTotalTrackerRows] = useState(0);
  const [uploadedRows, setUploadedRows] = useState(0);

  // Upload session mappings for robust video-to-tracker resolution
  const [uploadSessionMappings, setUploadSessionMappings] = useState<UploadSessionMapping[]>([]);

  // Comments
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState("BENZO");
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Video tracker details
  const [trackerInfo, setTrackerInfo] = useState<TrackerRow | null>(null);

  // Manual link dialog
  const [manualLinkOpen, setManualLinkOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  // Player
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const apiReadyRef = useRef(false);
  const pendingStartSecondsRef = useRef(0);
  const retriedRedirectLoadRef = useRef(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!open) return;
    if (window.YT && window.YT.Player) {
      apiReadyRef.current = true;
      return;
    }
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReadyRef.current = true;
      prev?.();
    };
  }, [open]);

  const initPlayer = useCallback((videoId: string, startSeconds = 0) => {
    if (!apiReadyRef.current || !playerContainerRef.current) return;
    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById({ videoId, startSeconds });
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      } catch {}
      return;
    }
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: startSeconds },
      events: {
        onReady: (e: any) => {
          e.target.unMute();
          e.target.setVolume(100);
          e.target.playVideo();
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!activeVideo) return;
    const tryInit = () => {
      if (apiReadyRef.current) {
        initPlayer(activeVideo.videoId, pendingStartSecondsRef.current);
        pendingStartSecondsRef.current = 0;
        return true;
      }
      return false;
    };
    if (tryInit()) return;
    const interval = setInterval(() => { if (tryInit()) clearInterval(interval); }, 200);
    return () => clearInterval(interval);
  }, [activeVideo, initPlayer]);

  // Cleanup player on close
  useEffect(() => {
    if (!open) {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      pendingStartSecondsRef.current = 0;
      retriedRedirectLoadRef.current = false;
    }
  }, [open]);

  // Re-load tracker rows when an upload job completes
  const prevCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const completedIds = new Set<string>(jobs.filter(j => j.status === 'completed').map(j => j.id));
    const newlyCompleted = Array.from(completedIds).filter(id => !prevCompletedRef.current.has(id));
    prevCompletedRef.current = completedIds;
    if (newlyCompleted.length > 0) {
      loadStats();
    }
  }, [open, jobs]);

  // Load data on open — show cache first, then call YouTube API only if cache is stale (>30 min)
  useEffect(() => {
    if (!open) return;

    // 1. Instantly show cached data
    const cachedRecent = getCachedData<RecentVideo[]>(YT_CACHE_RECENT);
    if (cachedRecent && cachedRecent.length > 0) {
      setRecentVideos(cachedRecent);
      setLoadingRecent(false);
    }

    const cachedPlaylists = getCachedData<PlaylistWithVideos[]>(YT_CACHE_PLAYLISTS);
    if (cachedPlaylists && cachedPlaylists.length > 0) {
      setPlaylists(cachedPlaylists);
      setLoadingPlaylists(false);
      if (cachedPlaylists.length > 0) setExpandedPlaylists(new Set([cachedPlaylists[0].id]));
    }

    // 2. Check cache freshness — only call YouTube API if stale
    const recentFresh = isCacheFresh(YT_CACHE_RECENT_TS);
    const playlistsFresh = isCacheFresh(YT_CACHE_PLAYLISTS_TS);

    if (!recentFresh) {
      // If we have cached data, do background refresh; otherwise foreground
      const hasCachedRecent = cachedRecent && cachedRecent.length > 0;
      loadRecentUploads(hasCachedRecent);
    }

    if (!playlistsFresh) {
      const hasCachedPlaylists = cachedPlaylists && cachedPlaylists.length > 0;
      loadPlaylists(hasCachedPlaylists);
    }

    // 3. If no cache at all and both are fresh (shouldn't happen), load from tracker as fallback
    if ((!cachedRecent || cachedRecent.length === 0) && recentFresh) {
      loadFromTracker();
    }

    loadStats();
  }, [open]);

  // Auto-play initial video from URL param
  useEffect(() => {
    if (open && initialVideoId) {
      pendingStartSecondsRef.current = initialStartSeconds;
      setActiveVideo({ videoId: initialVideoId, title: '', playlistTitle: '' });
    }
  }, [open, initialVideoId, initialStartSeconds]);

  // Manual refresh — force API call regardless of cache TTL
  const handleManualRefresh = async () => {
    setLoadingRecent(true);
    setLoadingPlaylists(true);
    await Promise.all([loadRecentUploads(false), loadPlaylists(false)]);
  };

  const loadFromTracker = async () => {
    setLoadingRecent(true);
    setLoadingPlaylists(true);
    try {
      const { data: trackerRows } = await supabase
        .from("video_edit_tracker")
        .select("id, client_name, event_name, edit_type, editor, colorist, video_edit_status, edit_started_at, event_date_ad, stage_history, updated_at, youtube_link, created_at, registered_date_time_ad")
        .neq("youtube_link", "")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (trackerRows && trackerRows.length > 0) {
        const recent = buildRecentVideosFromTracker(trackerRows as TrackerRow[]);
        const pls = buildPlaylistsFromTracker(trackerRows as TrackerRow[]);
        setRecentVideos(recent);
        setPlaylists(pls);
        if (pls.length > 0) setExpandedPlaylists(new Set([pls[0].id]));
      }
    } catch (err) {
      console.error("Failed to load from tracker:", err);
    } finally {
      setLoadingRecent(false);
      setLoadingPlaylists(false);
    }
  };

  // Load playlists from YouTube API (metadata only — no video fetches)
  const loadPlaylists = async (isBackground = false) => {
    if (!isBackground) setLoadingPlaylists(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "listPlaylists" },
      });
      if (error) throw error;
      const pls: PlaylistInfo[] = data?.playlists || [];
      // Don't fetch videos for each playlist here — lazy load on expand
      const withVideos: PlaylistWithVideos[] = pls.map(p => {
        // Restore cached videos if available
        const cachedVids = getCachedData<PlaylistVideo[]>(`${YT_CACHE_PLAYLIST_VIDEOS_PREFIX}${p.id}`);
        return { ...p, videos: cachedVids || [], loading: false };
      });
      setPlaylists(withVideos);
      setCachedData(YT_CACHE_PLAYLISTS, withVideos);
      setCacheTimestamp(YT_CACHE_PLAYLISTS_TS);
      if (pls.length > 0) {
        setExpandedPlaylists(new Set([pls[0].id]));
        // Lazy-load videos for the first playlist if not cached
        const firstCached = getCachedData<PlaylistVideo[]>(`${YT_CACHE_PLAYLIST_VIDEOS_PREFIX}${pls[0].id}`);
        if (!firstCached || firstCached.length === 0) {
          loadPlaylistVideos(pls[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
      // Fallback to tracker if no playlists loaded yet
      if (playlists.length === 0) await loadFromTracker();
    } finally {
      if (!isBackground) setLoadingPlaylists(false);
    }
  };

  // Lazy-load videos for a specific playlist when expanded
  const loadPlaylistVideos = async (playlistId: string) => {
    // Check per-playlist cache
    if (isCacheFresh(`${YT_CACHE_PLAYLIST_VIDEOS_TS_PREFIX}${playlistId}`)) {
      const cached = getCachedData<PlaylistVideo[]>(`${YT_CACHE_PLAYLIST_VIDEOS_PREFIX}${playlistId}`);
      if (cached && cached.length > 0) {
        setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, videos: cached, loading: false } : p));
        return;
      }
    }

    // Mark as loading
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, loading: true } : p));

    try {
      const { data: vData } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "getPlaylistVideos", playlistId },
      });
      const videos = (vData?.videos || []) as PlaylistVideo[];
      setCachedData(`${YT_CACHE_PLAYLIST_VIDEOS_PREFIX}${playlistId}`, videos);
      setCacheTimestamp(`${YT_CACHE_PLAYLIST_VIDEOS_TS_PREFIX}${playlistId}`);
      setPlaylists(prev => {
        const updated = prev.map(p => p.id === playlistId ? { ...p, videos, loading: false } : p);
        setCachedData(YT_CACHE_PLAYLISTS, updated);
        return updated;
      });
    } catch (err) {
      console.error(`Failed to load playlist videos for ${playlistId}:`, err);
      setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, loading: false } : p));
    }
  };

  const loadRecentUploads = async (isBackground = false) => {
    if (!isBackground) setLoadingRecent(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "listRecentUploads", maxResults: 50 },
      });
      if (error) throw error;
      const videos = (data?.videos || []) as RecentVideo[];
      setRecentVideos(videos);
      setRecentNextPageToken(data?.nextPageToken || null);
      setCachedData(YT_CACHE_RECENT, videos);
      setCacheTimestamp(YT_CACHE_RECENT_TS);
    } catch (err) {
      console.error("Failed to load recent uploads:", err);
      // Fallback to tracker data on API failure
      if (recentVideos.length === 0) await loadFromTracker();
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (!open || !initialVideoId || retriedRedirectLoadRef.current) return;
    if (loadingRecent || loadingPlaylists) return;

    const hasRecentData = recentVideos.length > 0;
    const hasPlaylistData = playlists.length > 0;

    if (hasRecentData && hasPlaylistData) {
      retriedRedirectLoadRef.current = true;
      return;
    }

    retriedRedirectLoadRef.current = true;
    loadFromTracker();
  }, [open, initialVideoId, loadingRecent, loadingPlaylists, recentVideos.length, playlists.length]);

  useEffect(() => {
    if (!activeVideo?.videoId || activeVideo.title) return;

    const recentMatch = recentVideos.find((video) => video.videoId === activeVideo.videoId);
    if (recentMatch) {
      setActiveVideo((prev) => prev && prev.videoId === recentMatch.videoId
        ? { ...prev, title: recentMatch.title, playlistTitle: 'Recent Upload', publishedAt: recentMatch.publishedAt }
        : prev);
      return;
    }

    for (const playlist of playlists) {
      const playlistMatch = playlist.videos.find((video) => video.videoId === activeVideo.videoId);
      if (playlistMatch) {
        setActiveVideo((prev) => prev && prev.videoId === playlistMatch.videoId
          ? { ...prev, title: playlistMatch.title, playlistTitle: playlist.title }
          : prev);
        return;
      }
    }
  }, [activeVideo?.videoId, activeVideo?.title, recentVideos, playlists]);

  // Load more recent videos (infinite scroll)
  const loadMoreRecent = async () => {
    if (!recentNextPageToken || loadingMoreRecent) return;
    setLoadingMoreRecent(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "listRecentUploads", maxResults: 50, pageToken: recentNextPageToken },
      });
      if (error) throw error;
      const newVideos = (data?.videos || []) as RecentVideo[];
      setRecentVideos(prev => {
        const combined = [...prev, ...newVideos];
        setCachedData(YT_CACHE_RECENT, combined);
        return combined;
      });
      setRecentNextPageToken(data?.nextPageToken || null);
    } catch (err) {
      console.error("Failed to load more recent:", err);
    } finally {
      setLoadingMoreRecent(false);
    }
  };

  // Infinite scroll handler
  const handleRecentScroll = useCallback(() => {
    const el = recentScrollRef.current;
    if (!el || !recentNextPageToken || loadingMoreRecent) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadMoreRecent();
    }
  }, [recentNextPageToken, loadingMoreRecent]);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [{ count: todayCount }, { data: trackerData }, { data: sessionData }, { data: contactData }] = await Promise.all([
      supabase
        .from('youtube_upload_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`),
      supabase
        .from('video_edit_tracker')
        .select('id, client_name, event_name, edit_type, editor, colorist, video_edit_status, edit_started_at, event_date_ad, stage_history, updated_at, created_at, youtube_link, deleted, registered_date_time_ad')
        .eq('deleted', false),
      supabase
        .from('youtube_upload_sessions')
        .select('youtube_video_id, tracker_row_id, client_name, event_name, edit_type')
        .eq('status', 'completed')
        .neq('youtube_video_id', '')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('contact_details_cache')
        .select('registered_date_time_ad, bride_full_name, groom_full_name'),
    ]);
    setTodayUploaded(todayCount || 0);
    if (trackerData) {
      setTotalTrackerRows(trackerData.length);
      setUploadedRows(trackerData.filter(r => r.youtube_link && r.youtube_link.trim() !== '').length);
      setAllTrackerRows(trackerData as TrackerRow[]);
    }
    if (sessionData) {
      setUploadSessionMappings(sessionData as UploadSessionMapping[]);
    }
    if (contactData) {
      const map = new Map<string, { bride: string; groom: string }>();
      for (const c of contactData) {
        map.set(c.registered_date_time_ad, {
          bride: (c.bride_full_name || '').trim(),
          groom: (c.groom_full_name || '').trim(),
        });
      }
      setContactDetailsMap(map);
    }
  };

  // Fallback: if API failed and we still have no data, use tracker rows (don't cache these as "real" data)
  useEffect(() => {
    if (loadingRecent || loadingPlaylists || !allTrackerRows.length) return;

    if (recentVideos.length === 0) {
      const fallbackRecent = buildRecentVideosFromTracker(allTrackerRows);
      if (fallbackRecent.length > 0) setRecentVideos(fallbackRecent);
    }

    if (playlists.length === 0) {
      const fallbackPlaylists = buildPlaylistsFromTracker(allTrackerRows);
      if (fallbackPlaylists.length > 0) {
        setPlaylists(fallbackPlaylists);
        setExpandedPlaylists(new Set([fallbackPlaylists[0].id]));
      }
    }
  }, [loadingRecent, loadingPlaylists, allTrackerRows, recentVideos.length, playlists.length]);

  // Load comments for active video
  useEffect(() => {
    if (!activeVideo) { setComments([]); return; }
    loadComments(activeVideo.videoId);
  }, [activeVideo?.videoId]);

  // Load tracker info for active video — match by youtube_link, upload session, OR title parsing
  useEffect(() => {
    if (!activeVideo) { setTrackerInfo(null); return; }
    findTrackerForVideo(activeVideo.videoId, activeVideo.title);
  }, [activeVideo?.videoId, allTrackerRows, uploadSessionMappings]);

  const findTrackerForVideo = async (videoId: string, videoTitle: string) => {
    // 1. Exact video-id match against parsed IDs from youtube_link (not loose .includes)
    const directMatch = allTrackerRows.find(r => {
      const ids = extractAllVideoIds(r.youtube_link);
      return ids.includes(videoId);
    });
    if (directMatch) {
      setTrackerInfo(directMatch);
      return;
    }

    // 2. Upload-session match: youtube_video_id -> tracker_row_id
    const sessionMatch = uploadSessionMappings.find(s => s.youtube_video_id === videoId);
    if (sessionMatch) {
      if (sessionMatch.tracker_row_id) {
        const trackerMatch = allTrackerRows.find(r => r.id === sessionMatch.tracker_row_id);
        if (trackerMatch) {
          setTrackerInfo(trackerMatch);
          return;
        }
      }
      // 3. Session fallback: match by client_name + event_name + edit_type
      const metaMatch = allTrackerRows.find(r =>
        r.client_name && r.event_name && r.edit_type &&
        r.client_name.toLowerCase() === sessionMatch.client_name.toLowerCase() &&
        r.event_name.toLowerCase() === sessionMatch.event_name.toLowerCase() &&
        r.edit_type.toLowerCase() === sessionMatch.edit_type.toLowerCase()
      );
      if (metaMatch) {
        setTrackerInfo(metaMatch);
        return;
      }
    }

    // 4. Legacy: Parse video title pattern "BRIDE & GROOM EVENT TYPE || WEDDING TALES NEPAL"
    const titlePart = videoTitle.split('||')[0]?.trim() || videoTitle;
    const ampersandMatch = titlePart.match(/^(.+?)\s*&\s*(.+?)(?:\s+(WEDDING|MEHNDI|RECEPTION|ENGAGEMENT|HALDI|SANGEET|SWAYAMBAR|BARATYATRA|VIDAI|JANTI|TIKA|MEHENDI|PRE[-\s]?WEDDING).*)$/i);
    
    if (ampersandMatch) {
      const name1 = ampersandMatch[1].trim().toUpperCase();
      const name2 = ampersandMatch[2].trim().split(/\s+/)[0].toUpperCase();
      
      const nameMatch = allTrackerRows.find(r => {
        if (!r.client_name) return false;
        const cn = r.client_name.toUpperCase();
        return cn.includes(name1) && cn.includes(name2);
      });
      if (nameMatch) {
        const titleUpper = titlePart.toUpperCase();
        let typeFilter: string | null = null;
        if (titleUpper.includes('HIGHLIGHT')) typeFilter = 'Highlights';
        else if (titleUpper.includes('FULL VIDEO') || titleUpper.includes('FULL FILM')) typeFilter = 'Full Video';
        else if (titleUpper.includes('TEASER')) typeFilter = 'Teaser';
        else if (titleUpper.includes('REEL')) typeFilter = 'Reel';
        
        const eventWords = titlePart.toUpperCase().match(/(WEDDING|MEHNDI|RECEPTION|ENGAGEMENT|HALDI|SANGEET|SWAYAMBAR|BARATYATRA|VIDAI|JANTI|TIKA|MEHENDI|PRE[-\s]?WEDDING)/gi) || [];
        
        const bestMatch = allTrackerRows.find(r => {
          if (!r.client_name) return false;
          const cn = r.client_name.toUpperCase();
          if (!cn.includes(name1) || !cn.includes(name2)) return false;
          if (typeFilter && r.edit_type && !r.edit_type.toLowerCase().includes(typeFilter.toLowerCase())) return false;
          if (eventWords.length > 0 && r.event_name) {
            return eventWords.some(ew => r.event_name!.toUpperCase().includes(ew.toUpperCase()));
          }
          return true;
        });
        
        setTrackerInfo(bestMatch || nameMatch);
        return;
      }
    }

    setTrackerInfo(null);
  };

  // Manual link: compute suggestions from video title, prioritizing bride/groom name matches
  const manualLinkSuggestions = useMemo(() => {
    if (!activeVideo || !manualLinkOpen) return [];
    const titlePart = activeVideo.title.split('||')[0]?.trim() || activeVideo.title;
    const titleWords = titlePart
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
      .map(w => w.toUpperCase());

    const searchUpper = linkSearch.trim().toUpperCase();

    // Score each tracker row
    const scored = allTrackerRows
      .filter(r => r.client_name || r.event_name)
      .map(r => {
        const cn = (r.client_name || '').toUpperCase();
        const en = (r.event_name || '').toUpperCase();
        const et = (r.edit_type || '').toUpperCase();
        const combined = `${cn} ${en} ${et}`;

        // Bride/groom name matching (higher priority)
        let brideGroomScore = 0;
        const regDate = r.registered_date_time_ad || '';
        const contactInfo = contactDetailsMap.get(regDate);
        if (contactInfo) {
          const brideWords = contactInfo.bride.toUpperCase().split(/\s+/).filter(w => w.length >= 3);
          const groomWords = contactInfo.groom.toUpperCase().split(/\s+/).filter(w => w.length >= 3);
          for (const w of titleWords) {
            if (brideWords.some(bw => bw.includes(w) || w.includes(bw))) brideGroomScore += 5;
            if (groomWords.some(gw => gw.includes(w) || w.includes(gw))) brideGroomScore += 5;
          }
        }

        // Title word matches against client_name / event_name
        let titleScore = 0;
        for (const w of titleWords) {
          if (combined.includes(w)) titleScore++;
        }

        // Search filter
        if (searchUpper && !combined.includes(searchUpper)) return null;

        return { row: r, totalScore: brideGroomScore + titleScore, brideGroomScore, contactInfo };
      })
      .filter((x): x is { row: TrackerRow; totalScore: number; brideGroomScore: number; contactInfo: { bride: string; groom: string } | undefined } => x !== null);

    // Sort: bride/groom matches first, then title matches, then alphabetically
    scored.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.brideGroomScore !== a.brideGroomScore) return b.brideGroomScore - a.brideGroomScore;
      return (a.row.client_name || '').localeCompare(b.row.client_name || '');
    });

    // Only show rows with matches or search matches, limit to 30
    if (!searchUpper) {
      return scored.filter(s => s.totalScore > 0).slice(0, 30);
    }
    return scored.slice(0, 30);
  }, [activeVideo, manualLinkOpen, linkSearch, allTrackerRows, contactDetailsMap]);

  // Handle manual linking
  const handleManualLink = async (row: TrackerRow) => {
    if (!activeVideo) return;
    const videoUrl = `https://youtu.be/${activeVideo.videoId}`;
    const existingLink = (row.youtube_link || '').trim();
    const newLink = existingLink ? `${existingLink}, ${videoUrl}` : videoUrl;

    await supabase
      .from('video_edit_tracker')
      .update({ youtube_link: newLink })
      .eq('id', row.id);

    // Update local state immediately
    setAllTrackerRows(prev => prev.map(r => r.id === row.id ? { ...r, youtube_link: newLink } : r));
    setTrackerInfo({ ...row, youtube_link: newLink });
    setManualLinkOpen(false);
    setLinkSearch("");
  };

  const loadComments = async (videoId: string) => {
    const { data } = await supabase
      .from('youtube_video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });
    setComments((data || []) as VideoComment[]);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !activeVideo) return;
    setSendingComment(true);
    try {
      const { data: trackerMatch } = await supabase
        .from('video_edit_tracker')
        .select('id')
        .like('youtube_link', `%${activeVideo.videoId}%`)
        .limit(1);

      await supabase.from('youtube_video_comments').insert({
        video_id: activeVideo.videoId,
        author: commentAuthor,
        comment: commentText.trim(),
        tracker_row_id: trackerMatch?.[0]?.id || null,
      });
      setCommentText("");
      loadComments(activeVideo.videoId);
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setSendingComment(false);
    }
  };

  const togglePlaylist = (id: string) => {
    setExpandedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazy-load videos for this playlist if not yet loaded
        const pl = playlists.find(p => p.id === id);
        if (pl && pl.videos.length === 0 && !pl.id.startsWith('tracker-')) {
          loadPlaylistVideos(id);
        }
      }
      return next;
    });
  };

  const selectVideo = (videoId: string, title: string, playlistTitle: string, publishedAt?: string) => {
    setActiveVideo({ videoId, title, playlistTitle, publishedAt });
  };

  // Filter
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.map(p => ({
      ...p,
      videos: p.videos.filter(v => v.title.toLowerCase().includes(q)),
    })).filter(p => p.videos.length > 0 || p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  const filteredRecentVideos = useMemo(() => {
    if (!searchQuery.trim()) return recentVideos;
    const q = searchQuery.toLowerCase();
    return recentVideos.filter(v => v.title.toLowerCase().includes(q));
  }, [recentVideos, searchQuery]);

  const remainingRows = totalTrackerRows - uploadedRows;
  const activeJobs = jobs.filter(j => j.status === 'uploading');
  const uploadPercent = totalTrackerRows > 0 ? Math.round((uploadedRows / totalTrackerRows) * 100) : 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[500] bg-white flex flex-col">
        {/* Header */}
        <div className="h-14 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-700 hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Youtube className="w-7 h-7 text-red-600" />
            <span className="text-lg font-bold tracking-tight text-gray-900">Wedding Tales Nepal</span>
          </div>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loadingRecent && loadingPlaylists}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              title="Refresh from YouTube (uses API quota)"
            >
              <RefreshCw className={cn("w-4 h-4", (loadingRecent || loadingPlaylists) && "animate-spin")} />
            </Button>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-6"
            >
              <Upload className="w-4 h-4" />
              UPLOAD
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Video Player + Details + Comments */}
          <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
            {/* Player - smaller */}
            <div className="w-full max-w-[900px] aspect-video bg-black rounded-xl overflow-hidden mb-3">
              {activeVideo ? (
                <div ref={playerContainerRef} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Youtube className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg text-gray-400">Select a video to play</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Details */}
            {activeVideo && (
              <div className="max-w-[900px] mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{activeVideo.title}</h2>
                  {trackerInfo && <RunningTimeBadge stageHistory={trackerInfo.stage_history} currentStatus={trackerInfo.video_edit_status} />}
                </div>
                {activeVideo.publishedAt && (
                  <div className="flex items-center gap-2 mt-1">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">{timeAgoLarge(activeVideo.publishedAt)}</span>
                    <span className="text-xs text-gray-400">
                      ({new Date(activeVideo.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">{activeVideo.playlistTitle}</span>
                  {trackerInfo?.video_edit_status && (
                    <Badge className={cn("text-[10px] font-semibold px-2 py-0.5 border-0", STAGE_COLORS[trackerInfo.video_edit_status] || "bg-gray-200 text-gray-600")}>
                      {trackerInfo.video_edit_status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>

                {trackerInfo && (() => {
                  const timings = computeVideoEditTimings(trackerInfo.stage_history, trackerInfo.video_edit_status);
                  return (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      {trackerInfo.editor && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-gray-500">Editor:</span>
                          <span className="font-semibold text-gray-800">{trackerInfo.editor}</span>
                        </div>
                      )}
                      {trackerInfo.colorist && (
                        <div className="flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-gray-500">Colorist:</span>
                          <span className="font-semibold text-gray-800">{trackerInfo.colorist}</span>
                        </div>
                      )}
                      {timings.editTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-gray-500">Edit Time:</span>
                          <span className="font-semibold text-gray-800">{timings.editTime}</span>
                        </div>
                      )}
                      {timings.colorTime && (
                        <div className="flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-gray-500">Color Time:</span>
                          <span className="font-semibold text-gray-800">{timings.colorTime}</span>
                        </div>
                      )}
                      {timings.totalTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-gray-500">Time till Export:</span>
                          <span className="font-semibold text-gray-800">{timings.totalTime}</span>
                        </div>
                      )}
                      {timings.actualTime && (
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-gray-500">Actual Time:</span>
                          <span className="font-semibold text-gray-800">
                            {timings.actualTime}
                            {timings.pausedTime && <span className="text-gray-400 font-normal"> ({timings.pausedTime} paused)</span>}
                          </span>
                        </div>
                      )}
                      {timings.exportedTime && (
                        <div className="flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-cyan-500" />
                          <span className="text-gray-500">Export Time:</span>
                          <span className="font-semibold text-gray-800">{timings.exportedTime}</span>
                        </div>
                      )}
                      {timings.finalizedTime && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-gray-500">Finalized Time:</span>
                          <span className="font-semibold text-gray-800">{timings.finalizedTime}</span>
                        </div>
                      )}
                      {timings.clientReviewTime && (
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-sky-500" />
                          <span className="text-gray-500">Client Review:</span>
                          <span className="font-semibold text-gray-800">{timings.clientReviewTime}</span>
                        </div>
                      )}
                      {trackerInfo.event_date_ad && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-500" />
                          <span className="text-gray-500">Event:</span>
                          <span className="font-semibold text-gray-800">{computeEventAge(trackerInfo.event_date_ad)}</span>
                        </div>
                      )}
                      {trackerInfo.edit_type && (
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-gray-500">Type:</span>
                          <span className="font-semibold text-gray-800">{trackerInfo.edit_type}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fallback: no tracker info found */}
                {!trackerInfo && activeVideo && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-amber-700">EDITING DETAILS NOT FOUND</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => { setManualLinkOpen(true); setLinkSearch(""); }}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Link Video Edit Tracker
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Link Dialog */}
            <Dialog open={manualLinkOpen} onOpenChange={(o) => { setManualLinkOpen(o); if (!o) setLinkSearch(""); }}>
              <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-sm">Link to Video Edit Tracker</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-1 truncate">
                  {activeVideo?.title}
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by client name..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px] max-h-[400px]">
                  {manualLinkSuggestions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {linkSearch ? "No matching tracker rows found" : "Type to search or suggestions will appear from video title"}
                    </p>
                  )}
                  {manualLinkSuggestions.map(item => (
                    <button
                      key={item.row.id}
                      onClick={() => handleManualLink(item.row)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{item.row.client_name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground truncate">{item.row.event_name || '-'}</span>
                        {item.row.edit_type && (
                          <>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{item.row.edit_type}</span>
                          </>
                        )}
                        {item.row.video_edit_status && (
                          <Badge className={cn("text-[9px] font-semibold px-1.5 py-0 border-0 ml-auto shrink-0", STAGE_COLORS[item.row.video_edit_status] || "bg-gray-200 text-gray-600")}>
                            {item.row.video_edit_status.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      {item.contactInfo && (item.contactInfo.bride || item.contactInfo.groom) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.contactInfo.bride && <span className="text-[10px] text-pink-500 font-medium">👰 {item.contactInfo.bride}</span>}
                          {item.contactInfo.groom && <span className="text-[10px] text-blue-500 font-medium">🤵 {item.contactInfo.groom}</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Comments Section */}
            {activeVideo && (
              <div className="max-w-[900px] flex-1 min-h-0 flex flex-col bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold mb-3 text-gray-600">
                  Company Review ({comments.length})
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[60px] max-h-[180px]">
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400">No comments yet</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", AUTHOR_COLORS[c.author] || "bg-gray-500")}>
                        {c.author.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{c.author}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-600">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 shrink-0">
                    {AUTHORS.map(a => (
                      <button
                        key={a}
                        onClick={() => setCommentAuthor(a)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold transition-all",
                          commentAuthor === a
                            ? cn(AUTHOR_COLORS[a], "text-white")
                            : "bg-gray-200 text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Add a company review..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 h-8 flex-1 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={sendingComment || !commentText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-8 px-3"
                  >
                    {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Tabbed Sidebar */}
          <div className="w-[480px] bg-gray-50 border-l border-gray-200 flex flex-col shrink-0">
            <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col flex-1 min-h-0">
              <div className="p-3 border-b border-gray-200">
                <TabsList className="w-full bg-gray-200">
                  <TabsTrigger value="recent" className="flex-1 text-xs font-bold">Recent</TabsTrigger>
                  <TabsTrigger value="playlist" className="flex-1 text-xs font-bold">Playlist</TabsTrigger>
                </TabsList>
              </div>

              {/* Recent Tab */}
              <TabsContent value="recent" className="flex-1 overflow-y-auto m-0" ref={recentScrollRef} onScroll={handleRecentScroll}>
                {loadingRecent && recentVideos.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredRecentVideos.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No videos found</p>
                ) : (
                  <>
                    {groupVideosByDate(filteredRecentVideos).map(group => (
                      <div key={group.dateKey}>
                        {/* Date section header */}
                        <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-2">
                          <p className="text-sm font-bold text-gray-800">{group.dateHeader}</p>
                          <p className="text-[11px] text-gray-500 font-medium">{group.dayLabel}</p>
                        </div>
                        {group.videos.map(v => (
                          <button
                            key={v.videoId}
                            onClick={() => selectVideo(v.videoId, v.title, 'Recent Upload', v.publishedAt)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 text-left border-b border-gray-100",
                              activeVideo?.videoId === v.videoId && "bg-blue-50"
                            )}
                          >
                            <div className="w-28 h-16 bg-gray-200 rounded overflow-hidden shrink-0 relative">
                              {v.thumbnailUrl ? (
                                <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              {activeVideo?.videoId === v.videoId && (
                                <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2">{v.title}</p>
                              {v.publishedAt && (
                                <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                                  {timeAgo(v.publishedAt)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                    {loadingMoreRecent && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {!recentNextPageToken && recentVideos.length > 0 && (
                      <p className="text-center text-[10px] text-gray-300 py-3">End of results</p>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Playlist Tab */}
              <TabsContent value="playlist" className="flex-1 overflow-y-auto m-0">
                {loadingPlaylists ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredPlaylists.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No playlists found</p>
                ) : (
                  filteredPlaylists.map(pl => {
                    const isExpanded = expandedPlaylists.has(pl.id);
                    return (
                      <div key={pl.id}>
                        <button
                          onClick={() => togglePlaylist(pl.id)}
                          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-left border-b border-gray-100"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{pl.title}</p>
                            <p className="text-xs text-gray-400">{pl.videos.length} videos</p>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="bg-white">
                            {pl.loading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              </div>
                            ) : pl.videos.length === 0 ? (
                              <p className="text-xs text-gray-400 px-8 py-3">No videos</p>
                            ) : (
                              pl.videos.map(v => (
                                <button
                                  key={v.videoId}
                                  onClick={() => selectVideo(v.videoId, v.title, pl.title)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left",
                                    activeVideo?.videoId === v.videoId && "bg-blue-50"
                                  )}
                                >
                                  <div className="w-24 h-14 bg-gray-200 rounded overflow-hidden shrink-0 relative">
                                    {v.thumbnailUrl ? (
                                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Play className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    {activeVideo?.videoId === v.videoId && (
                                      <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{v.title}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{pl.title}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="h-12 bg-gray-50 border-t border-gray-200 flex items-center px-6 gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-gray-700">Today</span>
            <span className="text-sm font-bold text-green-600">{todayUploaded}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-gray-700">Uploaded</span>
            <span className="text-sm font-bold text-blue-600">{uploadedRows}<span className="text-gray-400 font-normal">/{totalTrackerRows}</span></span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500" style={{ width: `${uploadPercent}%` }} />
            </div>
            <span className="text-[10px] font-bold text-gray-500">{uploadPercent}%</span>
          </div>

          {remainingRows > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-gray-700">Remaining</span>
              <span className="text-sm font-bold text-red-500">{remainingRows}</span>
            </div>
          )}

          {activeJobs.length > 0 && (
            <div className="flex-1 flex items-center gap-3 justify-end">
              {activeJobs.slice(0, 2).map(j => (
                <div key={j.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1">
                  <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                  <span className="text-[10px] text-gray-600 truncate max-w-[160px]">{j.title}</span>
                  <span className="text-[10px] font-bold text-red-500">{j.progress}%</span>
                </div>
              ))}
              {activeCount > 2 && <span className="text-[10px] text-gray-400">+{activeCount - 2} more</span>}
            </div>
          )}
        </div>
      </div>

      <YouTubeUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} />
    </>
  );
}
