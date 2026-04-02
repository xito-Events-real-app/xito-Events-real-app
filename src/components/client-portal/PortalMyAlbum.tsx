import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, Loader2, Trash2, ImageIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlbumDef, AlbumSelection, removeFromAlbum, getAlbumSelections } from "@/lib/album-selection-api";
import { getE2FileUrls } from "@/lib/idrive-e2-api";
import { lookupUrls, cacheUrls } from "@/lib/shared-url-cache";
import { getPCloudFileLinkByPath } from "@/lib/pcloud-api";
import XitoImageViewer from "@/components/client-detail/XitoImageViewer";
import { toast } from "sonner";

interface PortalMyAlbumProps {
  registeredDateTimeAD: string;
  albums: AlbumDef[];
  selections: AlbumSelection[];
  onSelectionsChange: (selections: AlbumSelection[]) => void;
}

const MAX_PHOTOS = 140;

const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

async function downloadFromPCloud(photoKey: string) {
  const pcloudPath = `/WEDDING TALES NEPAL/${photoKey}`;
  const streamUrl = await getPCloudFileLinkByPath(pcloudPath);
  const fileName = photoKey.split("/").pop() || "photo.jpg";

  if (isMobileDevice() && navigator.share) {
    // Mobile: fetch blob and use Web Share API for "Save to Gallery" option
    try {
      const resp = await fetch(streamUrl);
      const blob = await resp.blob();
      const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file] });
      return;
    } catch (shareErr: any) {
      // If share was cancelled or unsupported, fall through to link download
      if (shareErr?.name === "AbortError") return;
    }
  }

  // Desktop / fallback: direct download
  const a = document.createElement("a");
  a.href = streamUrl;
  a.download = fileName;
  a.target = "_blank";
  a.click();
}

const PortalMyAlbum = ({ registeredDateTimeAD, albums, selections, onSelectionsChange }: PortalMyAlbumProps) => {
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const activeAlbum = albums[activeAlbumIndex];

  const albumPhotos = useMemo(() => {
    if (!activeAlbum) return [];
    return selections.filter(s => s.album_type === activeAlbum.type);
  }, [selections, activeAlbum]);

  const albumCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    albums.forEach(a => {
      counts[a.type] = selections.filter(s => s.album_type === a.type).length;
    });
    return counts;
  }, [selections, albums]);

  // Load signed URLs for current album photos
  useEffect(() => {
    if (albumPhotos.length === 0) {
      setPhotoUrls({});
      return;
    }
    setLoadingUrls(true);
    const keys = albumPhotos.map(p => p.photo_key);
    getE2FileUrls(keys)
      .then(urls => setPhotoUrls(urls))
      .catch(() => {})
      .finally(() => setLoadingUrls(false));
  }, [albumPhotos]);

  const handleRemove = useCallback(async (photoKey: string) => {
    if (!activeAlbum || removingKey) return;
    setRemovingKey(photoKey);
    const success = await removeFromAlbum(registeredDateTimeAD, activeAlbum.type, photoKey);
    if (success) {
      onSelectionsChange(selections.filter(s => !(s.album_type === activeAlbum.type && s.photo_key === photoKey)));
      toast.success("Photo removed from album");
    }
    setRemovingKey(null);
  }, [activeAlbum, registeredDateTimeAD, selections, onSelectionsChange, removingKey]);

  const [downloadingAlbum, setDownloadingAlbum] = useState<string | null>(null);

  const handleDownloadAlbum = useCallback(async (albumType: string) => {
    const photosForAlbum = selections.filter(s => s.album_type === albumType);
    if (photosForAlbum.length === 0) {
      toast.error("No photos to download");
      return;
    }
    setDownloadingAlbum(albumType);
    toast.info(`Downloading ${photosForAlbum.length} photos...`);
    let successCount = 0;
    for (const photo of photosForAlbum) {
      try {
        await downloadFromPCloud(photo.photo_key);
        successCount++;
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error("Download failed for:", photo.photo_key, err);
      }
    }
    setDownloadingAlbum(null);
    if (successCount === photosForAlbum.length) {
      toast.success(`All ${successCount} photos downloaded`);
    } else {
      toast.warning(`${successCount} of ${photosForAlbum.length} photos downloaded`);
    }
  }, [selections]);

  const viewerImages = useMemo(() =>
    albumPhotos.map(p => ({ key: p.photo_key, url: photoUrls[p.photo_key] || "" })).filter(i => i.url),
    [albumPhotos, photoUrls]
  );

  if (albums.length === 0) {
    return (
      <div className="pb-24 px-4 pt-6">
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">No albums configured for this client</p>
          <p className="text-white/20 text-xs mt-1">Albums appear when deliverables are set up</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pb-28 px-3 pt-3">
        {/* Album header */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <BookOpen className="h-4 w-4 text-[hsl(350,80%,65%)]" />
          <span className="text-sm font-semibold text-white/80">My Albums</span>
        </div>

        {/* Album tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {albums.map((album, idx) => {
            const count = albumCounts[album.type] || 0;
            const isActive = idx === activeAlbumIndex;
            const isDownloading = downloadingAlbum === album.type;
            return (
              <div key={album.type} className="shrink-0 flex items-center gap-1">
                <button
                  onClick={() => setActiveAlbumIndex(idx)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200",
                    isActive
                      ? "bg-[hsl(350,80%,65%)] text-white border-[hsl(350,80%,65%)] shadow-[0_0_16px_hsl(350,80%,65%/0.3)]"
                      : "bg-white/[0.04] text-white/50 border-white/10 hover:bg-white/[0.08]"
                  )}
                >
                  {album.name}
                  <span className={cn(
                    "ml-1.5 text-[10px]",
                    isActive ? "text-white/80" : "text-white/30"
                  )}>
                    {count}/{MAX_PHOTOS}
                  </span>
                </button>
                {count > 0 && (
                  <button
                    onClick={() => handleDownloadAlbum(album.type)}
                    disabled={!!downloadingAlbum}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all text-[10px] font-medium flex items-center gap-1",
                      isActive
                        ? "border-[hsl(350,80%,65%)]/40 text-[hsl(350,80%,65%)] hover:bg-[hsl(350,80%,65%)]/10"
                        : "border-white/10 text-white/40 hover:bg-white/[0.06]"
                    )}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Album photo grid */}
        {loadingUrls ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(350,80%,65%)]" />
            <span className="ml-3 text-white/40 text-sm">Loading album photos...</span>
          </div>
        ) : albumPhotos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 text-white/15" />
            <p className="text-white/35 text-sm">No photos selected yet</p>
            <p className="text-white/20 text-xs mt-1">Go to Photos tab and select photos for this album</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-white/40 mb-2 px-1">
              {albumPhotos.length} of {MAX_PHOTOS} photos selected
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {albumPhotos.map((photo, idx) => {
                const url = photoUrls[photo.photo_key];
                const isRemoving = removingKey === photo.photo_key;
                return (
                  <div key={photo.photo_key} className="aspect-square rounded-lg overflow-hidden bg-white/5 relative group">
                    <button
                      onClick={() => url && setViewerIndex(idx)}
                      className="w-full h-full"
                    >
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 animate-pulse bg-white/[0.03]">
                          <Loader2 className="h-4 w-4 animate-spin text-white/20" />
                          <span className="text-[9px] text-white/15">Loading...</span>
                        </div>
                      )}
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(photo.photo_key); }}
                      disabled={isRemoving}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/70 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white"
                    >
                      {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {viewerIndex !== null && viewerImages.length > 0 && (
        <XitoImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
};

export default PortalMyAlbum;
