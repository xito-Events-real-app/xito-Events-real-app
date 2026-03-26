import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Download, CheckSquare, Square, Image, Loader2, Eye, X, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { E2File, getE2FileUrl, getE2FileUrls } from "@/lib/idrive-e2-api";
import { toast } from "sonner";

interface Props {
  files: E2File[];
  prefix: string;
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic"];
const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];

function getExt(key: string): string {
  return key.split(".").pop()?.toLowerCase() || "";
}
function isImageFile(key: string): boolean { return IMAGE_EXTS.includes(getExt(key)); }
function isVideoFile(key: string): boolean { return VIDEO_EXTS.includes(getExt(key)); }
function isMediaFile(key: string): boolean { return isImageFile(key) || isVideoFile(key); }

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function XitoDrivePhotoGallery({ files, prefix }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [urlsLoading, setUrlsLoading] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const mediaFiles = useMemo(() => files.filter(f => isMediaFile(f.key)), [files]);
  const nonMediaFiles = useMemo(() => files.filter(f => !isMediaFile(f.key)), [files]);
  const allSelected = mediaFiles.length > 0 && mediaFiles.every(f => selected.has(f.key));

  // Batch-load all signed URLs
  useEffect(() => {
    if (mediaFiles.length === 0) return;
    let cancelled = false;
    setUrlsLoading(true);
    getE2FileUrls(mediaFiles.map(f => f.key))
      .then(urls => { if (!cancelled) setUrlMap(urls); })
      .catch(err => console.warn("Batch URL fetch failed:", err))
      .finally(() => { if (!cancelled) setUrlsLoading(false); });
    return () => { cancelled = true; };
  }, [mediaFiles]);

  // Keyboard navigation
  useEffect(() => {
    if (previewIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPreviewIndex(null); setPreviewUrl(null); }
      else if (e.key === "ArrowRight" && previewIndex < mediaFiles.length - 1) navigatePreview(previewIndex + 1);
      else if (e.key === "ArrowLeft" && previewIndex > 0) navigatePreview(previewIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewIndex, mediaFiles.length]);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(mediaFiles.map(f => f.key)));
  };

  const downloadFiles = useCallback(async (filesToDownload: E2File[]) => {
    if (filesToDownload.length === 0) return;
    setDownloading(true);
    try {
      const missingKeys = filesToDownload.filter(f => !urlMap[f.key]).map(f => f.key);
      let allUrls = { ...urlMap };
      if (missingKeys.length > 0) {
        const extra = await getE2FileUrls(missingKeys);
        allUrls = { ...allUrls, ...extra };
      }
      for (const file of filesToDownload) {
        const url = allUrls[file.key];
        if (!url) continue;
        const resp = await fetch(url);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.key.split("/").pop() || "file";
        a.click();
        URL.revokeObjectURL(a.href);
        if (filesToDownload.length > 1) await new Promise(r => setTimeout(r, 300));
      }
      toast.success(`Downloaded ${filesToDownload.length} file(s)`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [urlMap]);

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
    const url = urlMap[mediaFiles[index]?.key];
    if (url) setPreviewUrl(url);
    else {
      setPreviewUrl(null);
      getE2FileUrl(mediaFiles[index].key)
        .then(u => setPreviewUrl(u))
        .catch(() => { toast.error("Failed to load preview"); setPreviewIndex(null); });
    }
  }, [mediaFiles, urlMap]);

  const navigatePreview = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= mediaFiles.length) return;
    setPreviewIndex(newIndex);
    const url = urlMap[mediaFiles[newIndex]?.key];
    if (url) setPreviewUrl(url);
    else {
      setPreviewUrl(null);
      getE2FileUrl(mediaFiles[newIndex].key)
        .then(u => setPreviewUrl(u))
        .catch(() => toast.error("Failed to load preview"));
    }
  }, [mediaFiles, urlMap]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || previewIndex === null) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    touchStartRef.current = null;
    if (dy > Math.abs(dx)) return; // vertical scroll, ignore
    if (dx < -50 && previewIndex < mediaFiles.length - 1) navigatePreview(previewIndex + 1);
    else if (dx > 50 && previewIndex > 0) navigatePreview(previewIndex - 1);
  };

  const currentFile = previewIndex !== null ? mediaFiles[previewIndex] : null;
  const isCurrentVideo = currentFile ? isVideoFile(currentFile.key) : false;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {mediaFiles.length > 0 && (
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
              <Button variant="outline" size="sm" className="text-xs gap-1.5" disabled={downloading}
                onClick={() => downloadFiles(mediaFiles.filter(f => selected.has(f.key)))}>
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Downloading..." : `Download Selected (${selected.size})`}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs gap-1.5" disabled={downloading}
              onClick={() => downloadFiles(mediaFiles)}>
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Downloading..." : `Download All (${mediaFiles.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {mediaFiles.length} media file{mediaFiles.length !== 1 ? "s" : ""}
        {nonMediaFiles.length > 0 ? ` • ${nonMediaFiles.length} other file${nonMediaFiles.length !== 1 ? "s" : ""}` : ""}
        {urlsLoading && " • Loading thumbnails..."}
      </p>

      {/* Media Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {mediaFiles.map((file, idx) => {
          const fileName = file.key.split("/").pop() || file.key;
          const thumbUrl = urlMap[file.key];
          const isSelected = selected.has(file.key);
          const isVideo = isVideoFile(file.key);

          return (
            <div key={file.key}
              className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 transition-all">
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggleSelect(file.key); }}>
                <Checkbox checked={isSelected} className="h-5 w-5 bg-background/80 backdrop-blur-sm" />
              </div>

              {/* Preview eye */}
              {thumbUrl && (
                <button onClick={() => openPreview(idx)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                  <Eye className="h-4 w-4 text-foreground" />
                </button>
              )}

              {/* Thumbnail */}
              <div className="aspect-square bg-muted flex items-center justify-center cursor-pointer overflow-hidden relative"
                onClick={() => openPreview(idx)}>
                {urlsLoading && !thumbUrl ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : thumbUrl && !isVideo ? (
                  <img src={thumbUrl} alt={fileName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                ) : thumbUrl && isVideo ? (
                  <>
                    <video src={thumbUrl} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    {isVideo ? <Play className="h-8 w-8 text-muted-foreground" /> : <Image className="h-8 w-8 text-muted-foreground" />}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-0.5">
                <p className="text-[11px] font-medium truncate" title={fileName}>{fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>

              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Non-media files */}
      {nonMediaFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-2 border-t border-border/50">
          {nonMediaFiles.map(file => {
            const fileName = file.key.split("/").pop() || file.key;
            return (
              <button key={file.key}
                onClick={async () => {
                  try { const url = await getE2FileUrl(file.key); window.open(url, "_blank"); }
                  catch { toast.error("Failed to open file"); }
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all">
                <Image className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-medium truncate w-full text-center" title={fileName}>{fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Full-screen gallery preview */}
      {previewIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm shrink-0"
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-col min-w-0">
              <p className="text-white text-sm font-medium truncate max-w-[60vw]">
                {currentFile?.key.split("/").pop()}
              </p>
              <p className="text-white/60 text-xs">
                {previewIndex + 1} of {mediaFiles.length}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {previewUrl && (
                <a href={previewUrl} download={currentFile?.key.split("/").pop()} target="_blank" rel="noopener"
                  className="p-2.5 rounded-lg hover:bg-white/10 text-white">
                  <Download className="h-5 w-5" />
                </a>
              )}
              <button onClick={() => { setPreviewIndex(null); setPreviewUrl(null); }}
                className="p-2.5 rounded-lg hover:bg-white/10 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Media area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0"
            onClick={() => { setPreviewIndex(null); setPreviewUrl(null); }}>

            {/* Loading */}
            {!previewUrl && (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            )}

            {/* Image or Video */}
            {previewUrl && !isCurrentVideo && (
              <img src={previewUrl} alt="" onClick={e => e.stopPropagation()}
                className="max-h-full max-w-full object-contain select-none" draggable={false} />
            )}
            {previewUrl && isCurrentVideo && (
              <video src={previewUrl} controls autoPlay onClick={e => e.stopPropagation()}
                className="max-h-full max-w-full object-contain" />
            )}

            {/* Prev/Next buttons (hidden on mobile, use swipe) */}
            {previewIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); navigatePreview(previewIndex - 1); }}
                className="absolute left-2 sm:left-4 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex">
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {previewIndex < mediaFiles.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); navigatePreview(previewIndex + 1); }}
                className="absolute right-2 sm:right-4 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex">
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom dots indicator on mobile */}
          <div className="sm:hidden flex items-center justify-center gap-1 py-3 bg-black/80 shrink-0">
            {mediaFiles.length <= 20 ? (
              mediaFiles.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewIndex ? "bg-white scale-125" : "bg-white/30"}`} />
              ))
            ) : (
              <p className="text-white/60 text-xs">{previewIndex! + 1} / {mediaFiles.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
