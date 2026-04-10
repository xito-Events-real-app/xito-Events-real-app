import { useState, useEffect, useRef, useCallback } from "react";
import { Film, Loader2, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PortalMyVideosProps {
  clientName: string;
  eventYear: string;
  eventMonth: string;
  brideFullName?: string;
  groomFullName?: string;
  registeredDateTimeAD: string;
}

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
}

interface PlaylistInfo {
  id: string;
  title: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/** Extract YouTube video ID from various URL formats */
const extractVideoId = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=ID
  const longMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  // youtube.com/embed/ID
  const embedMatch = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  // bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
};

const PortalMyVideos = ({ clientName, brideFullName, groomFullName, registeredDateTimeAD }: PortalMyVideosProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string>("");
  const [error, setError] = useState("");
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const apiReadyRef = useRef(false);

  // Load YouTube IFrame API
  useEffect(() => {
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
  }, []);

  // Create or update player
  const initPlayer = useCallback((videoId: string) => {
    if (!apiReadyRef.current || !playerContainerRef.current) return;

    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      } catch {
        // player may have been destroyed
      }
      return;
    }

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (e: any) => {
          e.target.unMute();
          e.target.setVolume(100);
          e.target.playVideo();
        },
      },
    });
  }, []);

  // Wait for API + first video, then create player
  useEffect(() => {
    if (!activeVideoId) return;

    const tryInit = () => {
      if (apiReadyRef.current) {
        initPlayer(activeVideoId);
        return true;
      }
      return false;
    };

    if (tryInit()) return;

    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [activeVideoId, initPlayer]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, []);

  // Fetch videos from tracker + optionally playlist
  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true);
      setError("");

      try {
        // --- Source 1: video_edit_tracker (direct DB, fast) ---
        const { data: trackerRows } = await supabase
          .from("video_edit_tracker")
          .select("event_name, edit_type, youtube_link, sub_event_name")
          .eq("registered_date_time_ad", registeredDateTimeAD)
          .eq("deleted", false)
          .neq("youtube_link", "");

        const trackerVideos: PlaylistVideo[] = [];
        let pos = 0;
        for (const row of trackerRows || []) {
          const links = (row.youtube_link || "").split(",");
          for (const link of links) {
            const vid = extractVideoId(link);
            if (!vid) continue;
            const titleParts = [row.event_name, row.sub_event_name, row.edit_type].filter(Boolean);
            trackerVideos.push({
              videoId: vid,
              title: titleParts.join(" - ") || "Video",
              thumbnailUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
              position: pos++,
            });
          }
        }

        // --- Source 2: YouTube playlist (only if bride/groom names exist) ---
        let playlistVideos: PlaylistVideo[] = [];
        let matchedPlaylist: PlaylistInfo | null = null;

        if (brideFullName || groomFullName) {
          try {
            const { data: plData } = await supabase.functions.invoke("youtube-upload", {
              body: { action: "listPlaylists" },
            });

            const playlists: PlaylistInfo[] = plData?.playlists || [];
            const brideFirst = (brideFullName || "").split(" ")[0]?.toLowerCase();
            const groomFirst = (groomFullName || "").split(" ")[0]?.toLowerCase();

            const fuzzyMatch = (haystack: string, needle: string) => {
              if (!needle || needle.length < 3) return false;
              if (haystack.includes(needle)) return true;
              const prefix = needle.slice(0, Math.min(4, needle.length));
              return haystack.includes(prefix);
            };

            const matched = playlists.find((p) => {
              const t = p.title.toLowerCase();
              return fuzzyMatch(t, brideFirst) && fuzzyMatch(t, groomFirst);
            });

            if (matched) {
              matchedPlaylist = matched;
              const { data: vidData } = await supabase.functions.invoke("youtube-upload", {
                body: { action: "getPlaylistVideos", playlistId: matched.id },
              });
              playlistVideos = ((vidData?.videos || []) as PlaylistVideo[]).sort(
                (a, b) => a.position - b.position
              );
            }
          } catch (err) {
            console.warn("Playlist fetch failed, using tracker data only:", err);
          }
        }

        // --- Merge: prefer playlist, supplement with tracker-only videos ---
        let finalVideos: PlaylistVideo[];
        if (playlistVideos.length > 0) {
          const playlistIds = new Set(playlistVideos.map((v) => v.videoId));
          const trackerOnly = trackerVideos.filter((v) => !playlistIds.has(v.videoId));
          finalVideos = [...playlistVideos, ...trackerOnly.map((v, i) => ({ ...v, position: playlistVideos.length + i }))];
          setPlaylist(matchedPlaylist);
        } else {
          finalVideos = trackerVideos;
          setPlaylist(null);
        }

        // --- Filter out hidden videos ---
        const { data: hiddenRows } = await supabase
          .from("portal_hidden_videos")
          .select("video_id")
          .eq("registered_date_time_ad", registeredDateTimeAD);
        if (hiddenRows && hiddenRows.length > 0) {
          const hiddenSet = new Set(hiddenRows.map((r) => r.video_id));
          finalVideos = finalVideos.filter((v) => !hiddenSet.has(v.videoId));
        }

        setVideos(finalVideos);
        if (finalVideos.length > 0) setActiveVideoId(finalVideos[0].videoId);
        if (finalVideos.length === 0) setError("No videos available yet");
      } catch (err: any) {
        console.error("Failed to load videos:", err);
        setError("Failed to load videos");
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [registeredDateTimeAD, brideFullName, groomFullName]);

  const handleVideoClick = (videoId: string) => {
    setActiveVideoId(videoId);
    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      } catch {}
    }
  };

  const openPlaylistInYouTube = () => {
    if (playlist) {
      window.location.href = `https://www.youtube.com/playlist?list=${playlist.id}`;
    }
  };

  const activeVideo = videos.find((v) => v.videoId === activeVideoId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <span className="ml-3 text-gray-500">Loading videos...</span>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="pb-20 px-4 py-20 text-center">
        <Film className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">{error || "No videos available yet"}</p>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white">
      {/* Playlist title with YouTube link (only if playlist matched) */}
      {playlist && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-snug">{playlist.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{videos.length} videos</p>
          </div>
          <button
            onClick={openPlaylistInYouTube}
            className="flex items-center gap-1 text-[11px] text-red-500 font-medium px-2 py-1 rounded-full bg-red-50 active:bg-red-100 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Playlist
          </button>
        </div>
      )}

      {/* Title bar for tracker-only mode */}
      {!playlist && (
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-bold text-gray-900 leading-snug">{clientName} Videos</h2>
          <p className="text-xs text-gray-400 mt-0.5">{videos.length} videos</p>
        </div>
      )}

      {/* YouTube Player */}
      <div className="w-full aspect-video bg-black">
        <div ref={playerContainerRef} className="w-full h-full" />
      </div>

      {/* Video info bar */}
      {activeVideo && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{activeVideo.title}</h3>
        </div>
      )}

      {/* Playlist items */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {videos.map((video) => {
            const isActive = video.videoId === activeVideoId;
            return (
              <button
                key={video.videoId}
                onClick={() => handleVideoClick(video.videoId)}
                className={cn(
                  "w-full flex gap-3 p-2 rounded-lg transition-all text-left",
                  isActive ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <div className="w-28 h-[72px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className={cn(
                    "text-[13px] font-medium leading-snug line-clamp-2",
                    isActive ? "text-gray-900" : "text-gray-700"
                  )}>
                    {video.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">Wedding Tales Nepal</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PortalMyVideos;
