import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, CheckSquare, Square, Image, Loader2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { E2File, getE2FileUrl, getE2FileUrls } from "@/lib/idrive-e2-api";
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

export function XitoDrivePhotoGallery({ files, prefix }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [urlsLoading, setUrlsLoading] = useState(false);

  const imageFiles = useMemo(() => files.filter(f => isImageFile(f.key)), [files]);
  const nonImageFiles = useMemo(() => files.filter(f => !isImageFile(f.key)), [files]);
  const allSelected = imageFiles.length > 0 && imageFiles.every(f => selected.has(f.key));

  // Batch-load all signed URLs in one call
  useEffect(() => {
    if (imageFiles.length === 0) return;
    let cancelled = false;
    setUrlsLoading(true);
    const keys = imageFiles.map(f => f.key);
    getE2FileUrls(keys)
      .then(urls => { if (!cancelled) setUrlMap(urls); })
      .catch(err => { console.warn("Batch URL fetch failed:", err); })
      .finally(() => { if (!cancelled) setUrlsLoading(false); });
    return () => { cancelled = true; };
  }, [imageFiles]);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(imageFiles.map(f => f.key)));
  };

  const downloadFiles = useCallback(async (filesToDownload: E2File[]) => {
    if (filesToDownload.length === 0) return;
    setDownloading(true);
    try {
      // Get URLs for any files not already in urlMap
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
    } catch (err) {
      toast.error("Download failed");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, [urlMap]);

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
    const url = urlMap[imageFiles[index]?.key];
    if (url) {
      setPreviewUrl(url);
    } else {
      getE2FileUrl(imageFiles[index].key)
        .then(u => setPreviewUrl(u))
        .catch(() => { toast.error("Failed to load preview"); setPreviewIndex(null); });
    }
  }, [imageFiles, urlMap]);

  const navigatePreview = useCallback((newIndex: number) => {
    setPreviewIndex(newIndex);
    const url = urlMap[imageFiles[newIndex]?.key];
    if (url) {
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
      getE2FileUrl(imageFiles[newIndex].key)
        .then(u => setPreviewUrl(u))
        .catch(() => toast.error("Failed to load preview"));
    }
  }, [imageFiles, urlMap]);

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
        {urlsLoading && " • Loading thumbnails..."}
      </p>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {imageFiles.map((file, idx) => {
          const fileName = file.key.split("/").pop() || file.key;
          const thumbUrl = urlMap[file.key];
          const isSelected = selected.has(file.key);

          return (
            <div
              key={file.key}
              className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 transition-all"
            >
              {/* Selection checkbox */}
              <div
                className="absolute top-2 left-2 z-10 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggleSelect(file.key); }}
              >
                <Checkbox checked={isSelected} className="h-5 w-5 bg-background/80 backdrop-blur-sm" />
              </div>

              {/* Preview button */}
              {thumbUrl && (
                <button
                  onClick={() => openPreview(idx)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <Eye className="h-4 w-4 text-foreground" />
                </button>
              )}

              {/* Thumbnail */}
              <div
                className="aspect-square bg-muted flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => openPreview(idx)}
              >
                {urlsLoading && !thumbUrl ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={fileName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
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
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl pointer-events-none" />
              )}
            </div>
          );
        })}
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
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => { setPreviewIndex(null); setPreviewUrl(null); }}>
          <div className="flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
            <p className="text-white text-sm font-medium truncate max-w-[60%]">
              {imageFiles[previewIndex]?.key.split("/").pop()}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={previewUrl}
                download={imageFiles[previewIndex]?.key.split("/").pop()}
                target="_blank"
                rel="noopener"
                className="p-2 rounded-lg hover:bg-white/10 text-white"
              >
                <Download className="h-5 w-5" />
              </a>
              <button onClick={() => { setPreviewIndex(null); setPreviewUrl(null); }} className="p-2 rounded-lg hover:bg-white/10 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
            {previewIndex > 0 && (
              <button onClick={() => navigatePreview(previewIndex - 1)} className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl">
                ‹
              </button>
            )}
            <img src={previewUrl} alt="" className="max-h-[80vh] max-w-[90vw] object-contain" />
            {previewIndex < imageFiles.length - 1 && (
              <button onClick={() => navigatePreview(previewIndex + 1)} className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl">
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
