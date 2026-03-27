import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BookOpen, Image as ImageIcon, Loader2, FolderOpen, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadDeliverables, DeliverableRow } from "@/lib/deliverables-api";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { FreelancerAssignment } from "@/lib/freelancer-assignment-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import XitoImageViewer from "./XitoImageViewer";

interface AlbumSectionProps {
  registeredDateTimeAD: string;
  clientName: string;
  assignments: FreelancerAssignment[];
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".heic"];
const isImage = (key: string) => IMAGE_EXTS.some((e) => key.toLowerCase().endsWith(e));
const INITIAL_URL_BATCH = 12;

interface TabDef {
  id: string;
  label: string;
  eventName: string;
  photographerName: string;
  s3Prefix: string;
}

const AlbumSection = ({ registeredDateTimeAD, clientName, assignments }: AlbumSectionProps) => {
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [deliverablesLoaded, setDeliverablesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [tabPhotoCounts, setTabPhotoCounts] = useState<Record<string, number>>({});
  const [urlsFetchedCount, setUrlsFetchedCount] = useState(0);

  // Cache listE2Folder results to avoid double-fetching
  const listCacheRef = useRef<Record<string, E2File[]>>({});

  // Load deliverables
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    loadDeliverables(registeredDateTimeAD).then((d) => {
      setDeliverables(d);
      setDeliverablesLoaded(true);
    });
  }, [registeredDateTimeAD]);

  // Album summary from deliverables
  const albumSummary = useMemo(() => {
    const albumRows = deliverables.filter((d) => d.section === "album" && d.enabled);
    const sides: string[] = [];
    const types: string[] = [];
    albumRows.forEach((r) => {
      if (r.deliverable_type === "bride_album") sides.push("Bride Side");
      if (r.deliverable_type === "groom_album") sides.push("Groom Side");
      if (r.deliverable_type === "other_album") sides.push("Other");
      if (r.album_name) types.push(r.album_name);
    });
    return { count: albumRows.length, sides, types };
  }, [deliverables]);

  // Compute majority year-month once for all assignments
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
      if ((freq.get(k) || 0) > bestCount) {
        best = k;
        bestCount = freq.get(k) || 0;
      }
    }
    return best;
  }, [assignments]);

  // Build tabs from assignments — deduplicated, using majority month for S3 prefix
  const tabs: TabDef[] = useMemo(() => {
    if (!majorityYearMonth) return [];
    const result: TabDef[] = [];
    const seen = new Set<string>();

    assignments.forEach((a) => {
      const photographers: { name: string }[] = [];
      if (a.photographerBride) photographers.push({ name: a.photographerBride });
      if (a.photographerGroom) photographers.push({ name: a.photographerGroom });
      if (a.extraPhotographer) photographers.push({ name: a.extraPhotographer });

      photographers.forEach((p) => {
        const tabId = `${a.event}-${p.name}`;
        if (seen.has(tabId)) return;
        seen.add(tabId);
        // Convert numeric year-month to label format: "MAGH EVENTS 2082"
        const [ymYear, ymMonth] = majorityYearMonth!.split("-");
        const monthNum = parseInt(ymMonth, 10);
        const monthLabel = NEPALI_MONTHS[monthNum] || `MONTH ${ymMonth}`;
        const folderLabel = `${monthLabel} EVENTS ${ymYear}`;
        const prefix = `${folderLabel}/${clientName}/Photos/${a.event}/${p.name}/`;
        result.push({
          id: tabId,
          label: `${a.event} (${p.name})`,
          eventName: a.event,
          photographerName: p.name,
          s3Prefix: prefix,
        });
      });
    });
    return result;
  }, [assignments, clientName, majorityYearMonth]);

  // Fetch photo counts for all tabs on mount & cache results
  useEffect(() => {
    if (tabs.length === 0) return;
    tabs.forEach((tab) => {
      listE2Folder(tab.s3Prefix)
        .then((result) => {
          const imageFiles = result.files.filter((f) => isImage(f.key));
          listCacheRef.current[tab.id] = imageFiles;
          setTabPhotoCounts((prev) => ({ ...prev, [tab.id]: imageFiles.length }));
        })
        .catch(() => {
          setTabPhotoCounts((prev) => ({ ...prev, [tab.id]: 0 }));
        });
    });
  }, [tabs]);

  // Total photos across all tabs
  const totalPhotos = useMemo(() => {
    return Object.values(tabPhotoCounts).reduce((sum, c) => sum + c, 0);
  }, [tabPhotoCounts]);

  // Auto-select first tab
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  // Load photos when tab changes — use cache if available
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return;
    setIsLoadingPhotos(true);
    setPhotos([]);
    setPhotoUrls({});
    setUrlsFetchedCount(0);

    const loadPhotos = async (imageFiles: E2File[]) => {
      setPhotos(imageFiles);
      // Only fetch URLs for first batch
      if (imageFiles.length > 0) {
        const firstBatch = imageFiles.slice(0, INITIAL_URL_BATCH);
        const urls = await getE2FileUrls(firstBatch.map((f) => f.key));
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
          const imageFiles = result.files.filter((f) => isImage(f.key));
          listCacheRef.current[tab.id] = imageFiles;
          return loadPhotos(imageFiles);
        })
        .catch((err) => {
          console.error("Failed to load album photos:", err);
          setIsLoadingPhotos(false);
        });
    }
  }, [activeTab, tabs]);

  // Load more URLs
  const loadMoreUrls = useCallback(async () => {
    if (urlsFetchedCount >= photos.length) return;
    const nextBatch = photos.slice(urlsFetchedCount, urlsFetchedCount + INITIAL_URL_BATCH);
    if (nextBatch.length === 0) return;
    const urls = await getE2FileUrls(nextBatch.map((f) => f.key));
    setPhotoUrls((prev) => ({ ...prev, ...urls }));
    setUrlsFetchedCount((prev) => prev + nextBatch.length);
  }, [photos, urlsFetchedCount]);

  // Viewer data
  const viewerImages = useMemo(
    () => photos.map((p) => ({ key: p.key, url: photoUrls[p.key] || "" })).filter((i) => i.url),
    [photos, photoUrls]
  );

  const hasMore = urlsFetchedCount < photos.length;

  return (
    <div className="space-y-4">
      {/* Album Summary Header */}
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Album Overview</h3>
              {deliverablesLoaded && (
                <p className="text-sm text-white/50">
                  {albumSummary.count === 0
                    ? "No albums configured in deliverables"
                    : `Total Albums: ${albumSummary.count}`}
                </p>
              )}
            </div>
            {tabs.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Camera className="h-3.5 w-3.5 text-white/50" />
                <span className="text-sm font-medium text-white/70">{totalPhotos} photos</span>
              </div>
            )}
          </div>

          {albumSummary.count > 0 && (
            <div className="flex flex-wrap gap-2">
              {albumSummary.sides.map((s) => (
                <Badge key={s} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {s} Album
                </Badge>
              ))}
              {albumSummary.types.map((t, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                  Type: {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event / Photographer Tabs */}
      {tabs.length === 0 ? (
        <Card className="bg-[hsl(220,25%,12%)] border-white/10">
          <CardContent className="p-8 text-center text-white/40">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No photographer assignments found for this client.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-[hsl(220,25%,10%)] p-1.5">
            {tabs.map((tab) => {
              const count = tabPhotoCounts[tab.id];
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white text-white/60"
                >
                  {tab.label}{count !== undefined ? ` · ${count}` : ""}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-3">
              {isLoadingPhotos ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-white/50">Loading photos...</span>
                </div>
              ) : photos.length === 0 ? (
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-8 text-center text-white/40">
                    <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No photos found in this folder yet.</p>
                    <p className="text-xs mt-1 text-white/30">{tab.s3Prefix}</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/50">{photos.length} photos</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                    {photos.map((file, idx) => {
                      const url = photoUrls[file.key];
                      return (
                        <button
                          key={file.key}
                          onClick={() => url && setViewerIndex(idx)}
                          className={cn(
                            "aspect-square rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-primary/50 transition-all relative group cursor-pointer"
                          )}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <button
                      onClick={loadMoreUrls}
                      className="mt-4 w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-all"
                    >
                      Load more photos ({photos.length - urlsFetchedCount} remaining)
                    </button>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* XITO IMAGE VIEWER */}
      {viewerIndex !== null && viewerImages.length > 0 && (
        <XitoImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default AlbumSection;
