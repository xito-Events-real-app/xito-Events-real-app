import { useState, useEffect, useCallback } from "react";
import { Download, CheckSquare, Square, Image, Loader2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { E2File, getE2FileUrl } from "@/lib/idrive-e2-api";
import { toast } from "sonner";

interface Props {
  files: E2File[];
  prefix: string;
}

function isImageFile(key: string): boolean {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic"].includes(ext);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function PhotoThumbnail({ file, selected, onToggle, onPreview }: {
  file: E2File;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fileName = file.key.split("/").pop() || file.key;
  const isImage = isImageFile(file.key);

  useEffect(() => {
    if (!isImage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getE2FileUrl(file.key)
      .then(url => { if (!cancelled) setThumbUrl(url); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file.key, isImage]);

  return (
    <div className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 transition-all">
      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-10 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        <Checkbox checked={selected} className="h-5 w-5 bg-background/80 backdrop-blur-sm" />
      </div>

      {/* Preview button */}
      {isImage && thumbUrl && (
        <button
          onClick={onPreview}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
        >
          <Eye className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Thumbnail */}
      <div
        className="aspect-square bg-muted flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={onPreview}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        ) : isImage && thumbUrl && !error ? (
          <img
            src={thumbUrl}
            alt={fileName}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={() => setError(true)}
          />
        ) : (
          <Image className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-0.5">
        <p className="text-[11px] font-medium truncate" title={fileName}>{fileName}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>

      {/* Selected overlay */}
      {selected && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl pointer-events-none" />
      )}
    </div>
  );
}

function FullScreenPreview({ file, url, onClose, onPrev, onNext, hasPrev, hasNext }: {
  file: E2File;
  url: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const fileName = file.key.split("/").pop() || file.key;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
        <p className="text-white text-sm font-medium truncate max-w-[60%]">{fileName}</p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={fileName}
            target="_blank"
            rel="noopener"
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <Download className="h-5 w-5" />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {hasPrev && (
          <button onClick={onPrev} className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl">
            ‹
          </button>
        )}
        <img src={url} alt={fileName} className="max-h-[80vh] max-w-[90vw] object-contain" />
        {hasNext && (
          <button onClick={onNext} className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl">
            ›
          </button>
        )}
      </div>
    </div>
  );
}

export function XitoDrivePhotoGallery({ files, prefix }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imageFiles = files.filter(f => isImageFile(f.key));
  const nonImageFiles = files.filter(f => !isImageFile(f.key));
  const allSelected = imageFiles.length > 0 && imageFiles.every(f => selected.has(f.key));

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(imageFiles.map(f => f.key)));
    }
  };

  const downloadFiles = useCallback(async (filesToDownload: E2File[]) => {
    if (filesToDownload.length === 0) return;
    setDownloading(true);
    try {
      for (const file of filesToDownload) {
        const url = await getE2FileUrl(file.key);
        const resp = await fetch(url);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.key.split("/").pop() || "file";
        a.click();
        URL.revokeObjectURL(a.href);
        // Small delay between downloads
        if (filesToDownload.length > 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      toast.success(`Downloaded ${filesToDownload.length} file(s)`);
    } catch (err) {
      toast.error("Download failed");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, []);

  const openPreview = useCallback(async (index: number) => {
    setPreviewIndex(index);
    try {
      const url = await getE2FileUrl(imageFiles[index].key);
      setPreviewUrl(url);
    } catch {
      toast.error("Failed to load preview");
      setPreviewIndex(null);
    }
  }, [imageFiles]);

  const navigatePreview = useCallback(async (newIndex: number) => {
    setPreviewUrl(null);
    setPreviewIndex(newIndex);
    try {
      const url = await getE2FileUrl(imageFiles[newIndex].key);
      setPreviewUrl(url);
    } catch {
      toast.error("Failed to load preview");
    }
  }, [imageFiles]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {imageFiles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={toggleAll}>
            {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {allSelected ? "Deselect All" : "Select All"}
          </Button>

          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                disabled={downloading}
                onClick={() => downloadFiles(imageFiles.filter(f => selected.has(f.key)))}
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Downloading..." : `Download Selected (${selected.size})`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              disabled={downloading}
              onClick={() => downloadFiles(imageFiles)}
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Downloading..." : `Download All (${imageFiles.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Photo count */}
      <p className="text-xs text-muted-foreground">
        {imageFiles.length} photo{imageFiles.length !== 1 ? "s" : ""}
        {nonImageFiles.length > 0 ? ` • ${nonImageFiles.length} other file${nonImageFiles.length !== 1 ? "s" : ""}` : ""}
      </p>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {imageFiles.map((file, idx) => (
          <PhotoThumbnail
            key={file.key}
            file={file}
            selected={selected.has(file.key)}
            onToggle={() => toggleSelect(file.key)}
            onPreview={() => openPreview(idx)}
          />
        ))}
      </div>

      {/* Non-image files below */}
      {nonImageFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-2 border-t border-border/50">
          {nonImageFiles.map(file => {
            const fileName = file.key.split("/").pop() || file.key;
            return (
              <button
                key={file.key}
                onClick={async () => {
                  try {
                    const url = await getE2FileUrl(file.key);
                    window.open(url, "_blank");
                  } catch { toast.error("Failed to open file"); }
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all"
              >
                <Image className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-medium truncate w-full text-center" title={fileName}>{fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Full screen preview */}
      {previewIndex !== null && previewUrl && (
        <FullScreenPreview
          file={imageFiles[previewIndex]}
          url={previewUrl}
          onClose={() => { setPreviewIndex(null); setPreviewUrl(null); }}
          onPrev={() => navigatePreview(previewIndex - 1)}
          onNext={() => navigatePreview(previewIndex + 1)}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < imageFiles.length - 1}
        />
      )}
    </div>
  );
}
