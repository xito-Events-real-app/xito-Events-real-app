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

const PortalMyVideos = ({ clientName, brideFullName, groomFullName }: PortalMyVideosProps) => {
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
        showinfo: 0,
        iv_load_policy: 3,
        disablekb: 0,
        fs: 1,
        cc_load_policy: 0,
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

  // Fetch playlist data
  useEffect(() => {
    if (!brideFullName && !groomFullName) {
      setIsLoading(false);
      setError("Contact details not available");
      return;
    }

    const findPlaylistAndLoadVideos = async () => {
      setIsLoading(true);
      setError("");

      try {
        const { data: plData, error: plErr } = await supabase.functions.invoke("youtube-upload", {
          body: { action: "listPlaylists" },
        });
        if (plErr) throw plErr;

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

        if (!matched) {
          setError("No playlist found");
          setIsLoading(false);
          return;
        }

        setPlaylist(matched);

        const { data: vidData, error: vidErr } = await supabase.functions.invoke("youtube-upload", {
          body: { action: "getPlaylistVideos", playlistId: matched.id },
        });
        if (vidErr) throw vidErr;

        const vids: PlaylistVideo[] = (vidData?.videos || []).sort(
          (a: PlaylistVideo, b: PlaylistVideo) => a.position - b.position
        );
        setVideos(vids);
        if (vids.length > 0) setActiveVideoId(vids[0].videoId);
      } catch (err: any) {
        console.error("Failed to load YouTube videos:", err);
        setError("Failed to load videos");
      } finally {
        setIsLoading(false);
      }
    };

    findPlaylistAndLoadVideos();
  }, [brideFullName, groomFullName]);

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
      {/* Playlist title with YouTube link */}
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

      {/* YouTube Player - clipped to hide title bar & bottom logo */}
      <div
        className="w-full bg-black overflow-hidden relative"
        style={{
          aspectRatio: "16 / 9",
        }}
      >
        {/* Inner wrapper: clip top title bar only, keep bottom controls visible */}
        <div
          className="absolute"
          style={{
            top: "-60px",
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div
            ref={playerContainerRef}
            className="w-full"
            style={{ height: "calc(100%)" }}
          />
        </div>
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
