import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, Maximize2, Minimize2, User, Palette, Clock, Calendar } from "lucide-react";
import { useFloatingYouTubePlayer } from "@/contexts/FloatingYouTubePlayerContext";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

const MIN_W = 400, MIN_H = 300, MAX_W = 960, MAX_H = 700;
const DEFAULT_W = 560, DEFAULT_H = 420;

function formatDuration(ms: number): string {
  if (ms < 0) return "—";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHrs = hours % 24;
    return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
  }
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function computeTotalTime(editStartedAt: string | null, status: string | null, updatedAt: string | null): string | null {
  if (!editStartedAt) return null;
  const start = new Date(editStartedAt);
  if (isNaN(start.getTime())) return null;
  const end = status === "FINALIZED" && updatedAt ? new Date(updatedAt) : new Date();
  return formatDuration(end.getTime() - start.getTime());
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

export function FloatingYouTubePlayer() {
  const { video, close } = useFloatingYouTubePlayer();
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - DEFAULT_W / 2, y: window.innerHeight / 2 - DEFAULT_H / 2 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [isMaximized, setIsMaximized] = useState(false);
  const prevState = useRef({ pos: { x: 0, y: 0 }, size: { w: DEFAULT_W, h: DEFAULT_H } });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const apiReadyRef = useRef(false);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos, isMaximized]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
  }, [size, isMaximized]);

  const toggleMaximize = () => {
    if (isMaximized) {
      setPos(prevState.current.pos);
      setSize(prevState.current.size);
    } else {
      prevState.current = { pos, size };
      setPos({ x: 40, y: 40 });
      setSize({ w: window.innerWidth - 80, h: window.innerHeight - 80 });
    }
    setIsMaximized(!isMaximized);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const dx = e.clientX - dragging.current.startX;
        const dy = e.clientY - dragging.current.startY;
        setPos({ x: dragging.current.origX + dx, y: dragging.current.origY + dy });
      }
      if (resizing.current) {
        const dx = e.clientX - resizing.current.startX;
        const dy = e.clientY - resizing.current.startY;
        setSize({
          w: Math.min(MAX_W, Math.max(MIN_W, resizing.current.origW + dx)),
          h: Math.min(MAX_H, Math.max(MIN_H, resizing.current.origH + dy)),
        });
      }
    };
    const onUp = () => {
      dragging.current = null;
      resizing.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!video) {
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      return;
    }

    if (window.YT?.Player) {
      apiReadyRef.current = true;
      return;
    }

    const existing = document.getElementById("yt-floating-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-floating-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReadyRef.current = true;
      previousReady?.();
    };
  }, [video]);

  const initPlayer = useCallback((videoId: string) => {
    if (!apiReadyRef.current || !playerContainerRef.current) return;

    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      } catch {}
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

  useEffect(() => {
    if (!video) return;

    const tryInit = () => {
      if (!apiReadyRef.current) return false;
      initPlayer(video.videoId);
      return true;
    };

    if (tryInit()) return;

    const interval = window.setInterval(() => {
      if (tryInit()) window.clearInterval(interval);
    }, 200);

    return () => window.clearInterval(interval);
  }, [video, initPlayer]);

  if (!video) return null;

  const totalTime = computeTotalTime(video.editStartedAt || null, video.videoEditStatus || null, video.updatedAt || null);
  const eventAge = computeEventAge(video.eventDateAD || null);
  const hasTrackerInfo = video.editor || video.colorist || totalTime || eventAge;

  const handleOpenInYouTube = () => {
    let currentSeconds = 0;

    try {
      currentSeconds = Math.max(0, Math.floor(playerRef.current?.getCurrentTime?.() ?? 0));
    } catch {
      currentSeconds = 0;
    }

    close();
    navigate(`/?section=youtube&videoId=${video.videoId}${currentSeconds > 0 ? `&t=${currentSeconds}` : ""}`);
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 300,
      }}
      className="rounded-xl border border-zinc-700 bg-black shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Header - draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2 bg-zinc-900 cursor-grab active:cursor-grabbing border-b border-zinc-700 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-xs font-medium text-white/80 truncate">{video.title || 'YouTube Player'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenInYouTube}
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
          >
            Open in YouTube
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={close}
            className="p-1 rounded-md hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 bg-black min-h-0">
        <div ref={playerContainerRef} className="w-full h-full" />
      </div>

      {/* Tracker Info Bar */}
      {hasTrackerInfo && (
        <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-700 shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {video.editor && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-white/40">Editor</span>
                <span className="text-[11px] font-semibold text-white/90">{video.editor}</span>
              </div>
            )}
            {video.colorist && (
              <div className="flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] text-white/40">Colorist</span>
                <span className="text-[11px] font-semibold text-white/90">{video.colorist}</span>
              </div>
            )}
            {totalTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-white/40">Edit Time</span>
                <span className="text-[11px] font-semibold text-white/90">{totalTime}</span>
              </div>
            )}
            {eventAge && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-teal-400" />
                <span className="text-[10px] text-white/40">Event</span>
                <span className="text-[11px] font-semibold text-white/90">{eventAge}</span>
              </div>
            )}
            {video.editType && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">Type</span>
                <span className="text-[11px] font-semibold text-white/90">{video.editType}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={onResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-center justify-center text-white/20 hover:text-white/50"
        >
          <GripHorizontal className="w-3 h-3 rotate-[-45deg]" />
        </div>
      )}
    </div>,
    document.body
  );
}
