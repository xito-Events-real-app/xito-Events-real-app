import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download, ImageIcon, Check, Plus } from "lucide-react";
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
}

const MAX_ALBUM_PHOTOS = 140;

const XitoImageViewer = ({
  images, initialIndex, onClose,
  albums, albumCounts, selectedAlbums, onToggleAlbum
}: XitoImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev();
  };

  const handleDownload = () => {
    const current = images[currentIndex];
    if (!current?.url) return;
    const a = document.createElement("a");
    a.href = current.url;
    a.download = current.key.split("/").pop() || "photo.jpg";
    a.target = "_blank";
    a.click();
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
        <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors">
          <Download className="h-5 w-5" />
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

      {/* Album Selection Bar */}
      {hasAlbums && (
        <div className="px-3 py-3 bg-black/90 backdrop-blur-md border-t border-white/[0.08] z-10">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {albums!.map((album) => {
              const isSelected = currentAlbumTypes.includes(album.type);
              const count = albumCounts?.[album.type] || 0;
              const isFull = count >= MAX_ALBUM_PHOTOS && !isSelected;
              return (
                <button
                  key={album.type}
                  disabled={isFull}
                  onClick={() => onToggleAlbum!(currentPhotoKey, album.type, album.name)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200",
                    isSelected
                      ? "bg-[hsl(350,80%,65%)] text-white border-[hsl(350,80%,65%)] shadow-[0_0_12px_hsl(350,80%,65%/0.4)]"
                      : isFull
                        ? "bg-white/[0.03] text-white/20 border-white/[0.06] cursor-not-allowed"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:bg-white/10 active:scale-95"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full transition-all",
                    isSelected ? "bg-white/25" : "bg-white/10"
                  )}>
                    {isSelected
                      ? <Check className="h-2.5 w-2.5" />
                      : <Plus className="h-2.5 w-2.5" />
                    }
                  </span>
                  <span>{album.name}</span>
                  <span className={cn(
                    "text-[10px] ml-0.5",
                    isSelected ? "text-white/70" : "text-white/30"
                  )}>
                    ({count}/{MAX_ALBUM_PHOTOS})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* End of folder message */}
      {isLast && !hasAlbums && (
        <div className="absolute bottom-6 left-0 right-0 text-center">
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

export default XitoImageViewer;
