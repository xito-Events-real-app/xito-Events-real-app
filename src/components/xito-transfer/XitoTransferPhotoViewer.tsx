import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { XitoTransfer } from "@/lib/xito-transfer-api";

interface Props {
  photos: XitoTransfer[];
  initialIndex: number;
  onClose: () => void;
}

export function XitoTransferPhotoViewer({ photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  const current = photos[index];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white/70 text-sm">{index + 1} / {photos.length}</span>
        <span className="text-white text-sm font-medium truncate mx-4">{current.title}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        {index > 0 && (
          <button onClick={goPrev} className="absolute left-3 z-10 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        <img
          src={current.file_url}
          alt={current.title}
          className="max-w-full max-h-full object-contain"
        />
        {index < photos.length - 1 && (
          <button onClick={goNext} className="absolute right-3 z-10 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
