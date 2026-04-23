import { useState, useEffect, useCallback, useRef, memo } from "react";
import { X, ChevronLeft, ChevronRight, Download, ImageIcon, Check, Plus, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlbumInfo {
  type: string;
  name: string;
}

interface XitoImageViewerProps {
  images: { key: string; url: string }[];
  initialIndex: number;
  onClose: () => void;
  albums?: AlbumInfo[];
  albumCounts?: Record<string, number>;
  selectedAlbums?: Record<string, string[]>; // photoKey → albumTypes[]
  onToggleAlbum?: (photoKey: string, albumType: string, albumName: string) => void;
  onDownloadHQ?: (photoKey: string) => Promise<void>;
  isFavourite?: (photoKey: string) => boolean;
  onToggleFavourite?: (photoKey: string) => void;
}

const MAX_ALBUM_PHOTOS = 140;

const XitoImageViewer = ({
  images, initialIndex, onClose,
  albums, albumCounts, selectedAlbums, onToggleAlbum, onDownloadHQ,
  isFavourite, onToggleFavourite
}: XitoImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const touchStartX = useRef(0);
  const total = images.length;
  const isLast = currentIndex === total - 1;
  const isFirst = currentIndex === 0;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, total]);

  // Build a shortcut map: first letter of album type → album
  const albumShortcuts = useRef<Record<string, AlbumInfo>>({});
  useEffect(() => {
    const map: Record<string, AlbumInfo> = {};
    if (albums) {
      albums.forEach(a => {
        // Use first letter of type, e.g. "bride_album" → "b", "groom_album" → "g"
        const letter = a.type.charAt(0).toLowerCase();
        if (!map[letter]) map[letter] = a;
      });
    }
    albumShortcuts.current = map;
  }, [albums]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (onToggleAlbum && albums && albums.length > 0) {
        const key = e.key.toLowerCase();
        const album = albumShortcuts.current[key];
        if (album) {
          const photoKey = images[currentIndex]?.key;
          if (photoKey) onToggleAlbum(photoKey, album.type, album.name);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose, onToggleAlbum, albums, images, currentIndex]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev();
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleDownload = async () => {
    if (isDownloading) return;
    const current = images[currentIndex];
    if (!current?.key) return;

    setIsDownloading(true);
    try {
      if (onDownloadHQ) {
        await onDownloadHQ(current.key);
      } else if (current.url) {
        const a = document.createElement("a");
        a.href = current.url;
        a.download = current.key.split("/").pop() || "photo.jpg";
        a.target = "_blank";
        a.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const renderIndices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
    (i) => i >= 0 && i < total
  );

  const currentPhotoKey = images[currentIndex]?.key || "";
  const currentAlbumTypes = selectedAlbums?.[currentPhotoKey] || [];
  const hasAlbums = albums && albums.length > 0 && onToggleAlbum;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center flex-1">
          <div className="font-serif text-lg tracking-[0.25em] uppercase text-white/90" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            XITO IMAGE VIEWER
          </div>
          <div className="text-xs text-white/50 mt-0.5">{currentIndex + 1} of {total}</div>
        </div>
        <button onClick={handleDownload} disabled={isDownloading} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors relative">
          {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {onDownloadHQ && !isDownloading && (
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-[hsl(350,80%,65%)] text-white rounded px-0.5 leading-tight">HQ</span>
          )}
        </button>
      </div>

      {/* Main Image Area */}
      <div className={cn("flex-1 relative flex items-center justify-center overflow-hidden", hasAlbums && "mb-0")}>
        {!isFirst && (
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all"
          >
            <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}

        {renderIndices.map((idx) => (
          <img
            key={images[idx]?.key || idx}
            src={images[idx]?.url}
            alt=""
            className={cn(
              "absolute inset-0 m-auto max-h-full max-w-full object-contain transition-opacity duration-150",
              idx === currentIndex ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
            )}
            draggable={false}
          />
        ))}

        {!isLast && (
          <button
            onClick={goNext}
            className="absolute right-2 md:right-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all"
          >
            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}
      </div>

      {/* Album Selection Bar + Download */}
      {hasAlbums && (
        <div className="px-3 py-2.5 bg-black/90 backdrop-blur-md border-t border-white/[0.08] z-10">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {albums!.map((album, idx) => {
              const isSelected = currentAlbumTypes.includes(album.type);
              const count = albumCounts?.[album.type] || 0;
              const isFull = count >= MAX_ALBUM_PHOTOS && !isSelected;
              const shortcutKey = album.type.charAt(0).toUpperCase();
              // Distinct colors per album
              const colors = [
                { bg: 'hsl(330,85%,60%)', glow: 'hsl(330,85%,60%/0.4)', text: 'hsl(330,90%,75%)', border: 'hsl(330,85%,60%/0.5)' },
                { bg: 'hsl(210,90%,55%)', glow: 'hsl(210,90%,55%/0.4)', text: 'hsl(210,95%,75%)', border: 'hsl(210,90%,55%/0.5)' },
                { bg: 'hsl(45,95%,55%)', glow: 'hsl(45,95%,55%/0.4)', text: 'hsl(45,95%,70%)', border: 'hsl(45,95%,55%/0.5)' },
                { bg: 'hsl(160,80%,45%)', glow: 'hsl(160,80%,45%/0.4)', text: 'hsl(160,85%,70%)', border: 'hsl(160,80%,45%/0.5)' },
              ];
              const c = colors[idx % colors.length];
              return (
                <button
                  key={album.type}
                  disabled={isFull}
                  onClick={() => onToggleAlbum!(currentPhotoKey, album.type, album.name)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200",
                    isFull && "cursor-not-allowed opacity-30"
                  )}
                  style={isSelected ? {
                    backgroundColor: c.bg,
                    borderColor: c.bg,
                    color: 'white',
                    boxShadow: `0 0 14px ${c.glow}`,
                  } : !isFull ? {
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: c.border,
                    color: c.text,
                  } : {
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <span className={cn(
                    "flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold",
                    isSelected ? "bg-white/25" : "bg-white/10"
                  )}>
                    {shortcutKey}
                  </span>
                  <span>{album.name}</span>
                  <span className="text-[10px] ml-0.5 opacity-70">
                    ({count}/{MAX_ALBUM_PHOTOS})
                  </span>
                </button>
              );
            })}

            {/* Download button */}
            {onDownloadHQ && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 bg-white/[0.08] text-white/70 border-white/15 hover:bg-white/15 hover:text-white active:scale-95"
              >
                {isDownloading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />
                }
                <span>Download</span>
              </button>
            )}
          </div>
          {/* Keyboard shortcut hint */}
          <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-white/35">
            {albums!.map((album) => {
              const key = album.type.charAt(0).toUpperCase();
              return (
                <span key={album.type} className="flex items-center gap-1">
                  Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[9px]">{key}</kbd> for {album.name}
                </span>
              );
            })}
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[9px]">←</kbd>
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[9px]">→</kbd> Navigate
            </span>
          </div>
        </div>
      )}

      {/* Download-only bar when no albums but onDownloadHQ is provided */}
      {!hasAlbums && onDownloadHQ && (
        <div className="px-3 py-3 bg-black/90 backdrop-blur-md border-t border-white/[0.08] z-10">
          <div className="flex items-center justify-center">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200 bg-white/[0.08] text-white/70 border-white/15 hover:bg-white/15 hover:text-white active:scale-95"
            >
              {isDownloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />
              }
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* End of folder message */}
      {isLast && !hasAlbums && !onDownloadHQ && (
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-sm">
            <ImageIcon className="h-4 w-4" />
            You've viewed all {total} photos from this folder
          </div>
        </div>
      )}

      {isLast && !hasAlbums && onDownloadHQ && (
        <div className="absolute bottom-16 left-0 right-0 text-center z-[2]">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-sm">
            <ImageIcon className="h-4 w-4" />
            You've viewed all {total} photos from this folder
          </div>
        </div>
      )}

      {isLast && hasAlbums && (
        <div className="absolute bottom-20 left-0 right-0 text-center z-[2]">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-sm">
            <ImageIcon className="h-4 w-4" />
            You've viewed all {total} photos from this folder
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(XitoImageViewer);
