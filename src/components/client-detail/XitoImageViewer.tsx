import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface XitoImageViewerProps {
  images: { key: string; url: string }[];
  initialIndex: number;
  onClose: () => void;
}

const XitoImageViewer = ({ images, initialIndex, onClose }: XitoImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [fadeIn, setFadeIn] = useState(true);
  const touchStartX = useRef(0);
  const total = images.length;
  const isLast = currentIndex === total - 1;
  const isFirst = currentIndex === 0;

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= total) return;
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(idx);
      setFadeIn(true);
    }, 120);
  }, [total]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  // Preload adjacent images
  useEffect(() => {
    [currentIndex - 1, currentIndex, currentIndex + 1].forEach((i) => {
      if (i >= 0 && i < total && images[i]?.url) {
        const img = new Image();
        img.src = images[i].url;
        img.onload = () => setLoaded((p) => ({ ...p, [i]: true }));
      }
    });
  }, [currentIndex, total, images]);

  // Touch swipe
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

  const fileName = images[currentIndex]?.key.split("/").pop() || "";

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
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Left Arrow */}
        {!isFirst && (
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all"
          >
            <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}

        {/* Image */}
        <img
          src={images[currentIndex]?.url}
          alt={fileName}
          className={cn(
            "max-h-full max-w-full object-contain transition-opacity duration-200",
            fadeIn ? "opacity-100" : "opacity-0"
          )}
          draggable={false}
          onLoad={() => setLoaded((p) => ({ ...p, [currentIndex]: true }))}
        />

        {/* Loading spinner */}
        {!loaded[currentIndex] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Right Arrow */}
        {!isLast && (
          <button
            onClick={goNext}
            className="absolute right-2 md:right-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all"
          >
            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}
      </div>

      {/* End of folder message */}
      {isLast && (
        <div className="absolute bottom-20 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-sm">
            <ImageIcon className="h-4 w-4" />
            You've viewed all {total} photos from this folder
          </div>
        </div>
      )}

      {/* Bottom file name */}
      <div className="px-4 py-2 bg-black/80 text-center">
        <div className="text-xs text-white/40 truncate">{fileName}</div>
      </div>
    </div>
  );
};

export default XitoImageViewer;
