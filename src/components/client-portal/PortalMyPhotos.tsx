import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Loader2, Image as ImageIcon, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import XitoImageViewer from "@/components/client-detail/XitoImageViewer";
import PortalPhotoEventNav from "./PortalPhotoEventNav";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".heic"];
const isImage = (key: string) => IMAGE_EXTS.some((e) => key.toLowerCase().endsWith(e));
const INITIAL_URL_BATCH = 12;

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
}

const PortalMyPhotos = ({ clientName, assignments, onShowBottomNav }: PortalMyPhotosProps) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [urlsFetchedCount, setUrlsFetchedCount] = useState(0);
  const listCacheRef = useRef<Record<string, E2File[]>>({});

  // Compute majority year-month
  const majorityYearMonth = useMemo(() => {
    const years = assignments.map(a => a.eventYear || "").filter(Boolean);
    const months = assignments.map(a => a.eventMonth || "").filter(Boolean);
    if (years.length === 0 || months.length === 0) return null;

    const freq = new Map<string, number>();
    const order: string[] = [];
    for (let i = 0; i < Math.max(years.length, months.length, 1); i++) {
      const y = String(parseInt(years[i] || years[0] || "0"));
      const m = String(parseInt(months[i] || months[0] || "0")).padStart(2, "0");
      const key = `${y}-${m}`;
      if (!freq.has(key)) order.push(key);
      freq.set(key, (freq.get(key) || 0) + 1);
    }
    let best = order[0] || "0-00";
    let bestCount = 0;
    for (const k of order) {
      if ((freq.get(k) || 0) > bestCount) { best = k; bestCount = freq.get(k) || 0; }
    }
    return best;
  }, [assignments]);

  // Build tabs
  const tabs: TabDef[] = useMemo(() => {
    if (!majorityYearMonth) return [];
    const result: TabDef[] = [];
    const seen = new Set<string>();

    assignments.forEach((a) => {
      const photographers: string[] = [];
      if (a.photographerBride) photographers.push(a.photographerBride);
      if (a.photographerGroom) photographers.push(a.photographerGroom);
      if (a.extraPhotographer) photographers.push(a.extraPhotographer);

      photographers.forEach((pName) => {
        const tabId = `${a.event}-${pName}`;
        if (seen.has(tabId)) return;
        seen.add(tabId);
        const [ymYear, ymMonth] = majorityYearMonth!.split("-");
        const monthNum = parseInt(ymMonth, 10);
        const monthLabel = NEPALI_MONTHS[monthNum] || `MONTH ${ymMonth}`;
        const folderLabel = `${monthLabel} EVENTS ${ymYear}`;
        const firstName = pName.split(' ')[0] || pName;
        result.push({
          id: tabId,
          label: `${a.event} (${firstName})`,
          s3Prefix: `${folderLabel}/${clientName}/Photos/${a.event}/${pName}/`,
        });
      });
    });
    return result;
  }, [assignments, clientName, majorityYearMonth]);

  // Hide bottom nav when in photos, show event nav instead
  useEffect(() => {
    onShowBottomNav(false);
    return () => onShowBottomNav(true);
  }, [onShowBottomNav]);

  // Load photos when tab changes
  useEffect(() => {
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    setIsLoadingPhotos(true);
    setPhotos([]);
    setPhotoUrls({});
    setUrlsFetchedCount(0);

    const loadPhotos = async (imageFiles: E2File[]) => {
      setPhotos(imageFiles);
      if (imageFiles.length > 0) {
        const firstBatch = imageFiles.slice(0, INITIAL_URL_BATCH);
        const urls = await getE2FileUrls(firstBatch.map(f => f.key));
        setPhotoUrls(urls);
        setUrlsFetchedCount(firstBatch.length);
      }
      setIsLoadingPhotos(false);
    };

    const cached = listCacheRef.current[tab.id];
    if (cached) {
      loadPhotos(cached);
    } else {
      listE2Folder(tab.s3Prefix)
        .then((result) => {
          const imageFiles = result.files.filter(f => isImage(f.key));
          listCacheRef.current[tab.id] = imageFiles;
          return loadPhotos(imageFiles);
        })
        .catch(() => setIsLoadingPhotos(false));
    }
  }, [activeTabIndex, tabs]);

  const loadMoreUrls = useCallback(async () => {
    if (urlsFetchedCount >= photos.length) return;
    const nextBatch = photos.slice(urlsFetchedCount, urlsFetchedCount + INITIAL_URL_BATCH);
    if (nextBatch.length === 0) return;
    const urls = await getE2FileUrls(nextBatch.map(f => f.key));
    setPhotoUrls(prev => ({ ...prev, ...urls }));
    setUrlsFetchedCount(prev => prev + nextBatch.length);
  }, [photos, urlsFetchedCount]);

  const viewerImages = useMemo(
    () => photos.map(p => ({ key: p.key, url: photoUrls[p.key] || "" })).filter(i => i.url),
    [photos, photoUrls]
  );

  const hasMore = urlsFetchedCount < photos.length;

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
      <div className="pb-20 px-3 pt-3">
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
                return (
                  <button
                    key={file.key}
                    onClick={() => url && setViewerIndex(idx)}
                    className="aspect-square rounded-sm overflow-hidden bg-white/5 relative"
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {hasMore && (
              <button
                onClick={loadMoreUrls}
                className="mt-4 w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all"
              >
                Load more ({photos.length - urlsFetchedCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Event navigation bar replaces bottom nav */}
      <PortalPhotoEventNav
        tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
        activeIndex={activeTabIndex}
        onPrev={() => setActiveTabIndex(i => Math.max(0, i - 1))}
        onNext={() => setActiveTabIndex(i => Math.min(tabs.length - 1, i + 1))}
        onBack={() => onShowBottomNav(true)}
      />

      {/* XITO IMAGE VIEWER */}
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

export default PortalMyPhotos;
