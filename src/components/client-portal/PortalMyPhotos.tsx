import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Loader2, Image as ImageIcon, FolderOpen, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { cacheUrls } from "@/lib/shared-url-cache";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import XitoImageViewer, { AlbumInfo } from "@/components/client-detail/XitoImageViewer";
import { AlbumSelection, addToAlbum, removeFromAlbum } from "@/lib/album-selection-api";
import { toast } from "sonner";
import { getPCloudFileLinkByPath } from "@/lib/pcloud-api";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".heic"];
const isImage = (key: string) => IMAGE_EXTS.some((e) => key.toLowerCase().endsWith(e));

// Module-level caches — survive unmount/remount within the same browser session
const folderCache: Record<string, E2File[]> = {};
const urlCache: Record<string, Record<string, string>> = {};


interface Assignment {
  event: string;
  eventYear: string;
  eventMonth: string;
  photographerBride: string;
  photographerGroom: string;
  extraPhotographer: string;
}

interface TabDef {
  id: string;
  label: string;
  s3Prefix: string;
}

interface PortalMyPhotosProps {
  clientName: string;
  assignments: Assignment[];
  onShowBottomNav: (show: boolean) => void;
  registeredDateTimeAD: string;
  albums: AlbumInfo[];
  albumSelections: AlbumSelection[];
  onAlbumSelectionsChange: (selections: AlbumSelection[]) => void;
}

const PortalMyPhotos = ({
  clientName, assignments, onShowBottomNav,
  registeredDateTimeAD, albums, albumSelections, onAlbumSelectionsChange
}: PortalMyPhotosProps) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  

  // Local album state for optimistic UI — only synced to parent on unmount
  const [localAlbumSelections, setLocalAlbumSelections] = useState(albumSelections);
  const onAlbumSelectionsChangeRef = useRef(onAlbumSelectionsChange);
  onAlbumSelectionsChangeRef.current = onAlbumSelectionsChange;

  // Use refs for album state to avoid recreating callbacks
  const albumSelectionsRef = useRef(localAlbumSelections);
  albumSelectionsRef.current = localAlbumSelections;
  const photoUrlsRef = useRef(photoUrls);
  photoUrlsRef.current = photoUrls;
  const localAlbumSelectionsRef = useRef(localAlbumSelections);
  localAlbumSelectionsRef.current = localAlbumSelections;

  // Sync local state back to parent on unmount so album tab gets latest
  useEffect(() => {
    return () => {
      onAlbumSelectionsChangeRef.current(localAlbumSelectionsRef.current);
    };
  }, []);

  // Build selectedAlbums map from LOCAL state
  const selectedAlbumsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    localAlbumSelections.forEach(s => {
      if (!map[s.photo_key]) map[s.photo_key] = [];
      map[s.photo_key].push(s.album_type);
    });
    return map;
  }, [localAlbumSelections]);

  // Album counts from LOCAL state
  const albumCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    albums.forEach(a => {
      counts[a.type] = localAlbumSelections.filter(s => s.album_type === a.type).length;
    });
    return counts;
  }, [localAlbumSelections, albums]);

  // Stable toggle handler using refs — no parent state updates during viewer interaction
  const handleToggleAlbum = useCallback((photoKey: string, albumType: string, albumName: string) => {
    const currentSelections = albumSelectionsRef.current;
    const isCurrentlySelected = currentSelections.some(s => s.album_type === albumType && s.photo_key === photoKey);

    if (isCurrentlySelected) {
      // Optimistic remove — local only, no parent re-render
      const updated = currentSelections.filter(s => !(s.album_type === albumType && s.photo_key === photoKey));
      setLocalAlbumSelections(updated);
      albumSelectionsRef.current = updated;
      // Fire-and-forget: DB delete + E2 delete in background
      removeFromAlbum(registeredDateTimeAD, albumType, photoKey, albumName).then(success => {
        if (!success) {
          setLocalAlbumSelections(currentSelections);
          albumSelectionsRef.current = currentSelections;
          toast.error("Failed to remove from album");
        }
      });
    } else {
      // Check count client-side
      const typeCount = currentSelections.filter(s => s.album_type === albumType).length;
      if (typeCount >= 140) {
        toast.error("Album is full (140 max)");
        return;
      }
      // Optimistic add
      const newSelection: AlbumSelection = {
        id: crypto.randomUUID(),
        registered_date_time_ad: registeredDateTimeAD,
        album_type: albumType,
        album_name: albumName,
        photo_key: photoKey,
        photo_url: photoUrlsRef.current[photoKey] || '',
        selected_at: new Date().toISOString(),
      };
      const updated = [...currentSelections, newSelection];
      setLocalAlbumSelections(updated);
      albumSelectionsRef.current = updated;
      // Fire-and-forget: DB save + E2 copy in background
      addToAlbum(registeredDateTimeAD, albumType, albumName, photoKey, photoUrlsRef.current[photoKey]).then(success => {
        if (!success) {
          setLocalAlbumSelections(currentSelections);
          albumSelectionsRef.current = currentSelections;
          toast.error("Failed to save to album");
        }
      });
    }
  }, [registeredDateTimeAD]);

  // pCloud HQ download handler — platform-aware (save to gallery on mobile)
  const handleDownloadHQ = useCallback(async (photoKey: string) => {
    const fileName = photoKey.split("/").pop() || "photo.jpg";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      const pcloudPath = `/WEDDING TALES NEPAL/${photoKey}`;
      const streamUrl = await getPCloudFileLinkByPath(pcloudPath);

      if (isMobile && navigator.share) {
        // Fetch as blob and use Web Share API for "Save to Gallery"
        const resp = await fetch(streamUrl);
        const blob = await resp.blob();
        const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
        await navigator.share({ files: [file] });
      } else {
        // Desktop — auto download
        const a = document.createElement("a");
        a.href = streamUrl;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      }
    } catch (err) {
      console.error("HQ download failed:", err);
      toast.error("HQ download failed — downloading preview instead");
      const url = photoUrlsRef.current[photoKey];
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      }
    }
  }, []);

  // Build tabs — use each assignment's own eventMonth/eventYear for S3 prefix
  const tabs: TabDef[] = useMemo(() => {
    const result: TabDef[] = [];
    const seen = new Set<string>();

    assignments.forEach((a) => {
      const photographers: string[] = [];
      if (a.photographerBride) photographers.push(a.photographerBride);
      if (a.photographerGroom) photographers.push(a.photographerGroom);
      if (a.extraPhotographer) photographers.push(a.extraPhotographer);

      const y = String(parseInt(a.eventYear || "0"));
      const m = parseInt(a.eventMonth || "0");
      if (!y || y === "0" || !m) return;
      const monthLabel = NEPALI_MONTHS[m] || `MONTH ${m}`;
      const folderLabel = `${monthLabel} EVENTS ${y}`;

      photographers.forEach((pName) => {
        const tabId = `${a.event}-${pName}`;
        if (seen.has(tabId)) return;
        seen.add(tabId);
        const firstName = pName.split(' ')[0] || pName;
        result.push({
          id: tabId,
          label: `${a.event} (${firstName})`,
          s3Prefix: `${folderLabel}/${clientName}/Photos/${a.event}/${pName}/`,
        });
      });
    });
    return result;
  }, [assignments, clientName]);

  // Load photos when tab changes — use module-level cache for instant re-loads
  useEffect(() => {
    const tab = tabs[activeTabIndex];
    if (!tab) return;

    // If both folder listing and URLs are cached, load instantly
    if (folderCache[tab.id] && urlCache[tab.id]) {
      setPhotos(folderCache[tab.id]);
      setPhotoUrls(urlCache[tab.id]);
      setIsLoadingPhotos(false);
      return;
    }

    setIsLoadingPhotos(true);
    setPhotos([]);
    setPhotoUrls({});

    const loadPhotos = async (imageFiles: E2File[]) => {
      setPhotos(imageFiles);
      if (imageFiles.length > 0) {
        const urls = await getE2FileUrls(imageFiles.map(f => f.key));
        urlCache[tab.id] = urls;
        cacheUrls(urls);
        setPhotoUrls(urls);
      }
      setIsLoadingPhotos(false);
    };

    const cached = folderCache[tab.id];
    if (cached) {
      loadPhotos(cached);
    } else {
      listE2Folder(tab.s3Prefix)
        .then((result) => {
          const imageFiles = result.files.filter(f => isImage(f.key));
          folderCache[tab.id] = imageFiles;
          return loadPhotos(imageFiles);
        })
        .catch(() => setIsLoadingPhotos(false));
    }
  }, [activeTabIndex, tabs]);

  const viewerImages = useMemo(
    () => photos.map(p => ({ key: p.key, url: photoUrls[p.key] || "" })).filter(i => i.url),
    [photos, photoUrls]
  );

  if (tabs.length === 0) {
    return (
      <div className="pb-20 px-4 pt-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center text-white/40">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No photos available yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="pb-36 px-3 pt-1">
        {/* Event selector bar above photos */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabIndex(idx)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                  idx === activeTabIndex
                    ? "bg-[hsl(350,80%,65%)] text-white border-[hsl(350,80%,65%)] shadow-[0_0_12px_hsl(350,80%,65%/0.4)]"
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {tabs.length === 1 && (
          <div className="mb-3 px-1">
            <span className="text-xs font-medium text-[hsl(350,80%,65%)]">{tabs[0].label}</span>
          </div>
        )}

        {isLoadingPhotos ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-white/50">Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center text-white/40">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No photos in this folder yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-white/50 mb-2">{photos.length} photos</div>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((file, idx) => {
                const url = photoUrls[file.key];
                const fileAlbums = selectedAlbumsMap[file.key] || [];
                return (
                  <div
                    key={file.key}
                    className="aspect-square rounded-sm overflow-hidden bg-white/5 relative group"
                  >
                    <button
                      onClick={() => url && setViewerIndex(idx)}
                      className="w-full h-full"
                    >
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                        </div>
                      )}
                    </button>
                    {fileAlbums.length > 0 && (
                      <div className="absolute top-1 left-1 flex gap-0.5">
                        {fileAlbums.map(at => (
                          <div key={at} className="w-2 h-2 rounded-full bg-[hsl(350,80%,65%)] shadow-[0_0_4px_hsl(350,80%,65%/0.6)]" />
                        ))}
                      </div>
                    )}
                    {url && (
                      <button
                        className="absolute bottom-1 right-1 p-1.5 rounded-full bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadHQ(file.key);
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* XITO IMAGE VIEWER */}
      {viewerIndex !== null && viewerImages.length > 0 && (
        <XitoImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          albums={albums.length > 0 ? albums : undefined}
          albumCounts={albums.length > 0 ? albumCounts : undefined}
          selectedAlbums={albums.length > 0 ? selectedAlbumsMap : undefined}
          onToggleAlbum={albums.length > 0 ? handleToggleAlbum : undefined}
          onDownloadHQ={handleDownloadHQ}
        />
      )}
    </>
  );
};

export default memo(PortalMyPhotos);
