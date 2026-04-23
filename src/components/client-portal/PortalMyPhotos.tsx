import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Loader2, Image as ImageIcon, FolderOpen, Download, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { cacheUrls } from "@/lib/shared-url-cache";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import XitoImageViewer, { AlbumInfo } from "@/components/client-detail/XitoImageViewer";
import { AlbumSelection, addToAlbum, removeFromAlbum } from "@/lib/album-selection-api";
import { getFavourites, addFavourite, removeFavourite, Favourite } from "@/lib/favourites-api";
import { toast } from "sonner";
import { getPCloudFileLinkByPath } from "@/lib/pcloud-api";
import { supabase } from "@/integrations/supabase/client";

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
  const FAVOURITES_TAB_ID = "__favourites__";
  const [activeTabIndex, setActiveTabIndex] = useState(1); // start at 1, skip favourites
  const [initialTabResolved, setInitialTabResolved] = useState(false);
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [albumsLocked, setAlbumsLocked] = useState(false);

  // Favourites — DB-backed personal shortlist
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const favouritesSet = useMemo(() => new Set(favourites.map(f => f.photo_key)), [favourites]);
  const favouritesSetRef = useRef(favouritesSet);
  favouritesSetRef.current = favouritesSet;
  const [favouritesUrls, setFavouritesUrls] = useState<Record<string, string>>({});
  const [isLoadingFavourites, setIsLoadingFavourites] = useState(false);

  // Load favourites on mount
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    getFavourites(registeredDateTimeAD).then(data => {
      setFavourites(data);
      const urls: Record<string, string> = {};
      data.forEach(f => {
        if (f.photo_url) urls[f.photo_key] = f.photo_url;
      });
      setFavouritesUrls(urls);
    });
  }, [registeredDateTimeAD]);

  // Optimistic favourite toggle
  const handleToggleFavourite = useCallback((photoKey: string) => {
    const isFav = favouritesSetRef.current.has(photoKey);
    const url = photoUrlsRef.current[photoKey] || favouritesUrls[photoKey] || '';

    if (isFav) {
      setFavourites(prev => prev.filter(f => f.photo_key !== photoKey));
      removeFavourite(registeredDateTimeAD, photoKey).then(success => {
        if (!success) {
          toast.error("Failed to remove favourite");
          getFavourites(registeredDateTimeAD).then(setFavourites);
        }
      });
    } else {
      const newFav: Favourite = {
        id: crypto.randomUUID(),
        registered_date_time_ad: registeredDateTimeAD,
        photo_key: photoKey,
        photo_url: url,
        created_at: new Date().toISOString(),
      };
      setFavourites(prev => [...prev, newFav]);
      if (url) setFavouritesUrls(prev => ({ ...prev, [photoKey]: url }));
      addFavourite(registeredDateTimeAD, photoKey, url).then(success => {
        if (!success) {
          toast.error("Failed to favourite");
          setFavourites(prev => prev.filter(f => f.photo_key !== photoKey));
        }
      });
    }
  }, [registeredDateTimeAD, favouritesUrls]);

  const checkIsFavourite = useCallback((photoKey: string) => favouritesSetRef.current.has(photoKey), []);

  // Check if albums are locked (copy history exists)
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    supabase
      .from("album_copy_history")
      .select("id")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAlbumsLocked(true);
      });
  }, [registeredDateTimeAD]);
  

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
    const seenMonthYears = new Set<string>();

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

      // Track unique month/year combos for Selected folders
      const monthYearKey = `${m}-${y}`;
      seenMonthYears.add(`${monthYearKey}|${folderLabel}`);

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

    // Prepend "Selected" folder tabs for each unique month/year
    const monthYearEntries = Array.from(seenMonthYears);
    const selectedTabs: TabDef[] = [];
    monthYearEntries.forEach((entry) => {
      const [, folderLabel] = entry.split('|');
      const tabId = `selected-${folderLabel}`;
      if (seen.has(tabId)) return;
      seen.add(tabId);
      selectedTabs.push({
        id: tabId,
        label: monthYearEntries.length > 1 ? `Selected (${folderLabel.split(' ')[0]})` : 'Selected',
        s3Prefix: `${folderLabel}/${clientName}/Photos/Selected/`,
      });
    });

    const favTab: TabDef = {
      id: FAVOURITES_TAB_ID,
      label: `★ Favourites`,
      s3Prefix: '',
    };
    return [favTab, ...selectedTabs, ...result];
  }, [assignments, clientName]);

  // On mount, probe tabs in parallel to find first non-empty folder
  useEffect(() => {
    if (tabs.length === 0) { setInitialTabResolved(true); return; }
    let stale = false;

    const probe = async () => {
      const results: E2File[][] = [];
      // Sequential probe to avoid mobile Chrome memory exhaustion
      for (const tab of tabs) {
        if (stale) return;
        if (tab.id === FAVOURITES_TAB_ID) {
          results.push([]); // skip — never auto-select favourites
          continue;
        }
        try {
          if (folderCache[tab.id]) {
            results.push(folderCache[tab.id]);
          } else {
            const result = await listE2Folder(tab.s3Prefix);
            const imgs = result.files.filter(f => isImage(f.key));
            folderCache[tab.id] = imgs;
            results.push(imgs);
          }
        } catch {
          results.push([]);
        }
      }
      if (stale) return;
      const idx = results.findIndex(r => r.length > 0);
      setActiveTabIndex(idx >= 0 ? idx : 0);
      setInitialTabResolved(true);
    };
    probe().catch(() => { if (!stale) setInitialTabResolved(true); });

    return () => { stale = true; };
  }, [tabs]);

  // Load photos when tab changes — use module-level cache, abort stale requests
  useEffect(() => {
    if (!initialTabResolved) return;
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    if (tab.id === FAVOURITES_TAB_ID) {
      // Favourites tab — don't load from S3; render handled separately
      setIsLoadingPhotos(false);
      return;
    }
    let stale = false;

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
      if (stale) return;
      setPhotos(imageFiles);
      if (imageFiles.length > 0) {
        const urls = await getE2FileUrls(imageFiles.map(f => f.key));
        if (stale) return;
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
          if (stale) return;
          const imageFiles = result.files.filter(f => isImage(f.key));
          folderCache[tab.id] = imageFiles;
          return loadPhotos(imageFiles);
        })
        .catch(() => { if (!stale) setIsLoadingPhotos(false); });
    }

    return () => { stale = true; };
  }, [activeTabIndex, tabs, initialTabResolved]);

  const viewerImages = useMemo(
    () => photos.map(p => ({ key: p.key, url: photoUrls[p.key] || "" })).filter(i => i.url),
    [photos, photoUrls]
  );

  if (tabs.length === 0 || !initialTabResolved) {
    return (
      <div className="pb-20 px-4 pt-4">
        {tabs.length === 0 ? (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-8 text-center text-gray-400">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No photos available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(350,80%,65%)]" />
            <span className="ml-3 text-gray-400">Finding your photos...</span>
          </div>
        )}
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
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
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
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(350,80%,65%)]" />
            <span className="ml-3 text-gray-400">Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-8 text-center">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-[hsl(350,80%,65%)] opacity-60" />
              <p className="text-gray-700 font-medium mb-1">Photos will appear here soon!</p>
              <p className="text-gray-400 text-sm mb-4">For now, view them in pCloud</p>
              <button
                onClick={() => {
                  const activeTab = tabs[activeTabIndex];
                  const folderPath = `/WEDDING TALES NEPAL/${activeTab?.s3Prefix || ''}`;
                  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                  const isAndroid = /Android/i.test(navigator.userAgent);
                  const isMobile = isIOS || isAndroid;
                  if (isMobile) {
                    const webUrl = `https://my.pcloud.com/#page=filemanager&folder=${encodeURIComponent(folderPath)}`;
                    if (isAndroid) {
                      // Android: open pCloud app via hidden anchor with intent, fallback to web
                      const appUrl = `pcloud://folder?path=${encodeURIComponent(folderPath)}`;
                      const a = document.createElement("a");
                      a.href = appUrl;
                      a.style.display = "none";
                      document.body.appendChild(a);
                      a.click();
                      const start = Date.now();
                      const fallbackTimer = setTimeout(() => {
                        if (Date.now() - start < 2500) {
                          window.open(webUrl, '_blank');
                        }
                      }, 1500);
                      window.addEventListener('blur', () => clearTimeout(fallbackTimer), { once: true });
                      setTimeout(() => document.body.removeChild(a), 100);
                    } else {
                      // iOS: pcloud:// scheme with timeout fallback
                      const appUrl = `pcloud://folder?path=${encodeURIComponent(folderPath)}`;
                      const start = Date.now();
                      const fallbackTimer = setTimeout(() => {
                        if (Date.now() - start < 2500) {
                          window.open(webUrl, '_blank');
                        }
                      }, 1500);
                      window.addEventListener('blur', () => clearTimeout(fallbackTimer), { once: true });
                      window.location.href = appUrl;
                    }
                  } else {
                    window.open(`https://my.pcloud.com/#page=filemanager&folder=${encodeURIComponent(folderPath)}`, '_blank');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#20BEC6' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96Z" fill="white"/>
                </svg>
                Open in pCloud
              </button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-2">{photos.length} photos</div>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((file, idx) => {
                const url = photoUrls[file.key];
                const fileAlbums = selectedAlbumsMap[file.key] || [];
                return (
                  <div
                    key={file.key}
                    className="aspect-square rounded-sm overflow-hidden bg-gray-100 relative group"
                  >
                    <button
                      onClick={() => url && setViewerIndex(idx)}
                      className="w-full h-full"
                    >
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
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
          albums={albums.length > 0 && !albumsLocked ? albums : undefined}
          albumCounts={albums.length > 0 && !albumsLocked ? albumCounts : undefined}
          selectedAlbums={albums.length > 0 && !albumsLocked ? selectedAlbumsMap : undefined}
          onToggleAlbum={albums.length > 0 && !albumsLocked ? handleToggleAlbum : undefined}
          onDownloadHQ={handleDownloadHQ}
        />
      )}
    </>
  );
};

export default memo(PortalMyPhotos);
