import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Youtube, Search, Upload, ChevronDown, ChevronRight, Send, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const AUTHORS = ["BENZO", "BARUN", "SAUGAT", "NIKIT"];

const AUTHOR_COLORS: Record<string, string> = {
  BENZO: "bg-violet-600",
  BARUN: "bg-blue-600",
  SAUGAT: "bg-emerald-600",
  NIKIT: "bg-amber-600",
};

export function YouTubeDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { jobs, activeCount } = useYouTubeUploadContext();
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string; playlistTitle: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Stats
  const [todayUploaded, setTodayUploaded] = useState(0);
  const [totalTrackerRows, setTotalTrackerRows] = useState(0);
  const [uploadedRows, setUploadedRows] = useState(0);

  // Comments
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState("BENZO");
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

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
      // Expand first playlist
      if (pls.length > 0) setExpandedPlaylists(new Set([pls[0].id]));

      // Load videos for each playlist (batch of 5)
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
    // Today's uploads
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('youtube_upload_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`);
    setTodayUploaded(todayCount || 0);

    // Tracker stats
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
      // Find matching tracker row by youtube_link containing the video ID
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

  // Toggle playlist expansion
  const togglePlaylist = (id: string) => {
    setExpandedPlaylists(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select a video
  const selectVideo = (videoId: string, title: string, playlistTitle: string) => {
    setActiveVideo({ videoId, title, playlistTitle });
  };

  // Filter playlists/videos by search
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.map(p => ({
      ...p,
      videos: p.videos.filter(v => v.title.toLowerCase().includes(q)),
    })).filter(p => p.videos.length > 0 || p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  const remainingRows = totalTrackerRows - uploadedRows;

  // Active upload jobs
  const activeJobs = jobs.filter(j => j.status === 'uploading');

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[500] bg-[#0f0f0f] flex flex-col text-white">
        {/* Header */}
        <div className="h-14 bg-[#202020] border-b border-[#383838] flex items-center px-4 gap-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-[#383838]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Youtube className="w-7 h-7 text-red-600" />
            <span className="text-lg font-bold tracking-tight">Wedding Tales Nepal</span>
          </div>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#121212] border-[#383838] text-white placeholder:text-gray-500 h-9"
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
          {/* Left: Video Player + Comments */}
          <div className="flex-1 flex flex-col min-w-0 p-6">
            {/* Player */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4">
              {activeVideo ? (
                <div ref={playerContainerRef} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Youtube className="w-16 h-16 mx-auto mb-3 text-gray-600" />
                    <p className="text-lg">Select a video to play</p>
                  </div>
                </div>
              )}
            </div>

            {/* Now Playing Info */}
            {activeVideo && (
              <div className="mb-4">
                <h2 className="text-lg font-bold">{activeVideo.title}</h2>
                <p className="text-sm text-gray-400">Playlist: {activeVideo.playlistTitle}</p>
              </div>
            )}

            {/* Comments Section */}
            {activeVideo && (
              <div className="flex-1 min-h-0 flex flex-col bg-[#181818] rounded-xl p-4">
                <h3 className="text-sm font-bold mb-3 text-gray-300">
                  Company Review ({comments.length})
                </h3>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[80px] max-h-[200px]">
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500">No comments yet</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", AUTHOR_COLORS[c.author] || "bg-gray-600")}>
                        {c.author.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{c.author}</span>
                          <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-300">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 shrink-0">
                    {AUTHORS.map(a => (
                      <button
                        key={a}
                        onClick={() => setCommentAuthor(a)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-bold transition-all",
                          commentAuthor === a
                            ? cn(AUTHOR_COLORS[a], "text-white")
                            : "bg-[#2a2a2a] text-gray-400 hover:text-white"
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
                    className="bg-[#2a2a2a] border-[#383838] text-white placeholder:text-gray-500 h-9 flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={sendingComment || !commentText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Playlist Sidebar */}
          <div className="w-[380px] bg-[#181818] border-l border-[#383838] flex flex-col shrink-0">
            <div className="p-4 border-b border-[#383838]">
              <h3 className="font-bold text-sm text-gray-300">
                All Playlists ({filteredPlaylists.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingPlaylists ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <p className="text-center text-gray-500 py-12 text-sm">No playlists found</p>
              ) : (
                filteredPlaylists.map(pl => {
                  const isExpanded = expandedPlaylists.has(pl.id);
                  return (
                    <div key={pl.id}>
                      <button
                        onClick={() => togglePlaylist(pl.id)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#252525] text-left"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{pl.title}</p>
                          <p className="text-xs text-gray-500">{pl.videos.length} videos</p>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="bg-[#141414]">
                          {pl.loading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            </div>
                          ) : pl.videos.length === 0 ? (
                            <p className="text-xs text-gray-500 px-8 py-3">No videos</p>
                          ) : (
                            pl.videos.map(v => (
                              <button
                                key={v.videoId}
                                onClick={() => selectVideo(v.videoId, v.title, pl.title)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2 hover:bg-[#252525] text-left",
                                  activeVideo?.videoId === v.videoId && "bg-[#303030]"
                                )}
                              >
                                <div className="w-24 h-14 bg-[#252525] rounded overflow-hidden shrink-0 relative">
                                  {v.thumbnailUrl ? (
                                    <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Play className="w-4 h-4 text-gray-500" />
                                    </div>
                                  )}
                                  {activeVideo?.videoId === v.videoId && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <Play className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium line-clamp-2">{v.title}</p>
                                  <p className="text-[10px] text-gray-500 mt-1">{pl.title}</p>
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
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="h-12 bg-[#202020] border-t border-[#383838] flex items-center px-6 gap-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Today:</span>
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">{todayUploaded} uploaded</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Total:</span>
            <span className="text-sm font-bold text-white">{uploadedRows}/{totalTrackerRows}</span>
            <span className="text-xs text-gray-500">uploaded</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Remaining:</span>
            <Badge className={cn("text-xs", remainingRows > 0 ? "bg-red-600/20 text-red-400 border-red-600/30" : "bg-green-600/20 text-green-400 border-green-600/30")}>
              {remainingRows}
            </Badge>
          </div>

          {/* Active uploads */}
          {activeJobs.length > 0 && (
            <div className="flex-1 flex items-center gap-3 justify-end">
              {activeJobs.slice(0, 2).map(j => (
                <div key={j.id} className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                  <span className="text-xs text-gray-300 truncate max-w-[200px]">{j.title}</span>
                  <span className="text-xs font-bold text-red-400">{j.progress}%</span>
                </div>
              ))}
              {activeCount > 2 && <span className="text-xs text-gray-500">+{activeCount - 2} more</span>}
            </div>
          )}
        </div>
      </div>

      <YouTubeUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} />
    </>
  );
}
