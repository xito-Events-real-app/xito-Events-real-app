import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Youtube, Search, Upload, ChevronDown, ChevronRight, Send, Loader2, Play, Clock, User, Palette, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
}

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
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

export function YouTubeDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { jobs, activeCount } = useYouTubeUploadContext();
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string; playlistTitle: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<string>("recent");

  // Stats
  const [todayUploaded, setTodayUploaded] = useState(0);
  const [totalTrackerRows, setTotalTrackerRows] = useState(0);
  const [uploadedRows, setUploadedRows] = useState(0);

  // Comments
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState("BENZO");
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Video tracker details
  const [trackerInfo, setTrackerInfo] = useState<TrackerRow | null>(null);

  // Player
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const apiReadyRef = useRef(false);

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

  const initPlayer = useCallback((videoId: string) => {
    if (!apiReadyRef.current || !playerContainerRef.current) return;
    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      } catch {}
      return;
    }
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
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
      if (apiReadyRef.current) { initPlayer(activeVideo.videoId); return true; }
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
    }
  }, [open]);

  // Load playlists
  useEffect(() => {
    if (!open) return;
    loadPlaylists();
    loadStats();
  }, [open]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "listPlaylists" },
      });
      if (error) throw error;
      const pls: PlaylistInfo[] = data?.playlists || [];
      const withVideos: PlaylistWithVideos[] = pls.map(p => ({ ...p, videos: [], loading: true }));
      setPlaylists(withVideos);
      if (pls.length > 0) setExpandedPlaylists(new Set([pls[0].id]));

      const batchSize = 5;
      for (let i = 0; i < pls.length; i += batchSize) {
        const batch = pls.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (pl) => {
            try {
              const { data: vData } = await supabase.functions.invoke("youtube-upload", {
                body: { action: "getPlaylistVideos", playlistId: pl.id },
              });
              return { id: pl.id, videos: (vData?.videos || []) as PlaylistVideo[] };
            } catch {
              return { id: pl.id, videos: [] };
            }
          })
        );
        setPlaylists(prev => prev.map(p => {
          const result = results.find(r => r.id === p.id);
          return result ? { ...p, videos: result.videos, loading: false } : p;
        }));
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('youtube_upload_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`);
    setTodayUploaded(todayCount || 0);

    const { data: trackerData } = await supabase
      .from('video_edit_tracker')
      .select('id, youtube_link, deleted')
      .eq('deleted', false);
    if (trackerData) {
      setTotalTrackerRows(trackerData.length);
      setUploadedRows(trackerData.filter(r => r.youtube_link && r.youtube_link.trim() !== '').length);
    }
  };

  // Load comments for active video
  useEffect(() => {
    if (!activeVideo) { setComments([]); return; }
    loadComments(activeVideo.videoId);
  }, [activeVideo?.videoId]);

  // Load tracker info for active video
  useEffect(() => {
    if (!activeVideo) { setTrackerInfo(null); return; }
    loadTrackerInfo(activeVideo.videoId);
  }, [activeVideo?.videoId]);

  const loadTrackerInfo = async (videoId: string) => {
    const { data } = await supabase
      .from('video_edit_tracker')
      .select('id, client_name, event_name, edit_type, editor, colorist, video_edit_status, edit_started_at, event_date_ad, stage_history, updated_at')
      .like('youtube_link', `%${videoId}%`)
      .eq('deleted', false)
      .limit(1);
    setTrackerInfo(data?.[0] as TrackerRow | null ?? null);
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectVideo = (videoId: string, title: string, playlistTitle: string) => {
    setActiveVideo({ videoId, title, playlistTitle });
  };

  // All videos flattened for Recent tab
  const allVideosFlat = useMemo(() => {
    const all: (PlaylistVideo & { playlistTitle: string })[] = [];
    playlists.forEach(pl => {
      pl.videos.forEach(v => all.push({ ...v, playlistTitle: pl.title }));
    });
    // Sort by position descending (most recently added first)
    return all.sort((a, b) => b.position - a.position);
  }, [playlists]);

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
    if (!searchQuery.trim()) return allVideosFlat;
    const q = searchQuery.toLowerCase();
    return allVideosFlat.filter(v => v.title.toLowerCase().includes(q) || v.playlistTitle.toLowerCase().includes(q));
  }, [allVideosFlat, searchQuery]);

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

          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-6"
          >
            <Upload className="w-4 h-4" />
            UPLOAD
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Video Player + Details + Comments */}
          <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
            {/* Player - smaller */}
            <div className="w-full max-w-[720px] aspect-video bg-black rounded-xl overflow-hidden mb-3">
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
              <div className="max-w-[720px] mb-4">
                <h2 className="text-base font-bold text-gray-900 leading-tight">{activeVideo.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">{activeVideo.playlistTitle}</span>
                  {trackerInfo?.video_edit_status && (
                    <Badge className={cn("text-[10px] font-semibold px-2 py-0.5 border-0", STAGE_COLORS[trackerInfo.video_edit_status] || "bg-gray-200 text-gray-600")}>
                      {trackerInfo.video_edit_status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>

                {trackerInfo && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {trackerInfo.editor && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-gray-500">Editor:</span>
                        <span className="font-semibold text-gray-800">{trackerInfo.editor}</span>
                        {trackerInfo.edit_started_at && (
                          <span className="text-gray-400">
                            ({computeTotalTime(trackerInfo.edit_started_at, trackerInfo.video_edit_status, trackerInfo.updated_at)})
                          </span>
                        )}
                      </div>
                    )}
                    {trackerInfo.colorist && (
                      <div className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-gray-500">Colorist:</span>
                        <span className="font-semibold text-gray-800">{trackerInfo.colorist}</span>
                      </div>
                    )}
                    {trackerInfo.edit_started_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-gray-500">Total Time:</span>
                        <span className="font-semibold text-gray-800">
                          {computeTotalTime(trackerInfo.edit_started_at, trackerInfo.video_edit_status, trackerInfo.updated_at)}
                        </span>
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
                )}
              </div>
            )}

            {/* Comments Section */}
            {activeVideo && (
              <div className="max-w-[720px] flex-1 min-h-0 flex flex-col bg-gray-50 border border-gray-200 rounded-xl p-4">
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
          <div className="w-[380px] bg-gray-50 border-l border-gray-200 flex flex-col shrink-0">
            <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col flex-1 min-h-0">
              <div className="p-3 border-b border-gray-200">
                <TabsList className="w-full bg-gray-200">
                  <TabsTrigger value="recent" className="flex-1 text-xs font-bold">Recent</TabsTrigger>
                  <TabsTrigger value="playlist" className="flex-1 text-xs font-bold">Playlist</TabsTrigger>
                </TabsList>
              </div>

              {/* Recent Tab */}
              <TabsContent value="recent" className="flex-1 overflow-y-auto m-0">
                {loadingPlaylists ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredRecentVideos.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No videos found</p>
                ) : (
                  filteredRecentVideos.map(v => (
                    <button
                      key={`${v.videoId}-${v.playlistTitle}`}
                      onClick={() => selectVideo(v.videoId, v.title, v.playlistTitle)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 text-left border-b border-gray-100",
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
                        <p className="text-[10px] text-gray-400 mt-0.5">{v.playlistTitle}</p>
                      </div>
                    </button>
                  ))
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
