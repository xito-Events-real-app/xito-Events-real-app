import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { useFloatingYouTubePlayer } from "@/contexts/FloatingYouTubePlayerContext";
import { useNavigate } from "react-router-dom";

const MIN_W = 400, MIN_H = 280, MAX_W = 960, MAX_H = 600;
const DEFAULT_W = 560, DEFAULT_H = 360;

export function FloatingYouTubePlayer() {
  const { video, close } = useFloatingYouTubePlayer();
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - DEFAULT_W / 2, y: window.innerHeight / 2 - DEFAULT_H / 2 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [isMaximized, setIsMaximized] = useState(false);
  const prevState = useRef({ pos: { x: 0, y: 0 }, size: { w: DEFAULT_W, h: DEFAULT_H } });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

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

  if (!video) return null;

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
            onClick={() => {
              close();
              navigate(`/?section=youtube&videoId=${video.videoId}`);
            }}
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
      <div className="flex-1 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      </div>

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
