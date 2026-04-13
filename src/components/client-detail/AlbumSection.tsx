import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, Image as ImageIcon, Loader2, FolderOpen, Camera, CloudCog, HardDrive, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, ArrowRight, Circle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadDeliverables, DeliverableRow } from "@/lib/deliverables-api";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { listPCloudFolderByPath, isPCloudImage, formatPCloudSize } from "@/lib/pcloud-api";
import { getAlbumSelections, getAlbumDefsFromDeliverables, AlbumSelection, AlbumDef } from "@/lib/album-selection-api";
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

const albumFolderCache: Record<string, E2File[]> = {};
const albumUrlCache: Record<string, Record<string, string>> = {};
const pcloudCountCache: Record<string, { count: number; totalSize: number }> = {};

const MAX_ALBUM_PHOTOS = 140;

interface TabDef {
  id: string;
  label: string;
  eventName: string;
  photographerName: string;
  s3Prefix: string;
  pcloudPath: string;
}

const AlbumSection = ({ registeredDateTimeAD, clientName, assignments }: AlbumSectionProps) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'photos'>('dashboard');
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [deliverablesLoaded, setDeliverablesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [tabPhotoCounts, setTabPhotoCounts] = useState<Record<string, number>>({});

  const [pcloudCounts, setPcloudCounts] = useState<Record<string, { count: number; totalSize: number }>>(pcloudCountCache);
  const [pcloudLoading, setPcloudLoading] = useState<Record<string, boolean>>({});
  const [albumDefs, setAlbumDefs] = useState<AlbumDef[]>([]);
  const [albumSelections, setAlbumSelections] = useState<AlbumSelection[]>([]);
  const [loadingAllPcloud, setLoadingAllPcloud] = useState(false);
  const [refreshingXito, setRefreshingXito] = useState(false);
  const [albumSubmission, setAlbumSubmission] = useState<{ sent_to: string; handled: boolean } | null>(null);

  useEffect(() => {
    if (!registeredDateTimeAD) return;
    loadDeliverables(registeredDateTimeAD).then((d) => {
      setDeliverables(d);
      setDeliverablesLoaded(true);
    });
  }, [registeredDateTimeAD]);

  useEffect(() => {
    if (!registeredDateTimeAD) return;
    getAlbumDefsFromDeliverables(registeredDateTimeAD).then(setAlbumDefs);
    getAlbumSelections(registeredDateTimeAD).then(setAlbumSelections);
  }, [registeredDateTimeAD]);

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

  const tabs: TabDef[] = useMemo(() => {
    const result: TabDef[] = [];
    const seen = new Set<string>();
    assignments.forEach((a) => {
      const photographers: { name: string }[] = [];
      if (a.photographerBride) photographers.push({ name: a.photographerBride });
      if (a.photographerGroom) photographers.push({ name: a.photographerGroom });
      if (a.extraPhotographer) photographers.push({ name: a.extraPhotographer });
      const y = String(parseInt(a.eventYear || "0"));
      const m = parseInt(a.eventMonth || "0");
      if (!y || y === "0" || !m) return;
      const monthLabel = NEPALI_MONTHS[m] || `MONTH ${m}`;
      const folderLabel = `${monthLabel} EVENTS ${y}`;
      photographers.forEach((p) => {
        const tabId = `${a.event}-${p.name}`;
        if (seen.has(tabId)) return;
        seen.add(tabId);
        const prefix = `${folderLabel}/${clientName}/Photos/${a.event}/${p.name}/`;
        result.push({
          id: tabId,
          label: `${a.event} (${p.name})`,
          eventName: a.event,
          photographerName: p.name,
          s3Prefix: prefix,
          pcloudPath: `WEDDING TALES NEPAL/${folderLabel}/${clientName}/Photos/${a.event}/${p.name}`,
        });
      });
    });
    return result;
  }, [assignments, clientName]);

  const loadPcloudCount = useCallback(async (tab: TabDef) => {
    if (pcloudCountCache[tab.id]) {
      setPcloudCounts(prev => ({ ...prev, [tab.id]: pcloudCountCache[tab.id] }));
      return;
    }
    setPcloudLoading(prev => ({ ...prev, [tab.id]: true }));
    try {
      const folder = await listPCloudFolderByPath(tab.pcloudPath);
      const images = folder.contents.filter(isPCloudImage);
      const totalSize = images.reduce((s, f) => s + (f.size || 0), 0);
      const result = { count: images.length, totalSize };
      pcloudCountCache[tab.id] = result;
      setPcloudCounts(prev => ({ ...prev, [tab.id]: result }));
    } catch {
      setPcloudCounts(prev => ({ ...prev, [tab.id]: { count: 0, totalSize: 0 } }));
    } finally {
      setPcloudLoading(prev => ({ ...prev, [tab.id]: false }));
    }
  }, []);

  // Load xito counts for dashboard (lazy per tab on dashboard, or when switching to dashboard)
  const loadXitoCountForTab = useCallback(async (tab: TabDef) => {
    if (albumFolderCache[tab.id]) {
      setTabPhotoCounts(prev => ({ ...prev, [tab.id]: albumFolderCache[tab.id].length }));
      return;
    }
    try {
      const result = await listE2Folder(tab.s3Prefix);
      const imageFiles = result.files.filter((f) => isImage(f.key));
      albumFolderCache[tab.id] = imageFiles;
      setTabPhotoCounts(prev => ({ ...prev, [tab.id]: imageFiles.length }));
    } catch {
      setTabPhotoCounts(prev => ({ ...prev, [tab.id]: 0 }));
    }
  }, []);

  // On dashboard mount, load xito counts for all tabs
  useEffect(() => {
    if (viewMode !== 'dashboard' || tabs.length === 0) return;
    tabs.forEach(t => {
      if (tabPhotoCounts[t.id] === undefined) loadXitoCountForTab(t);
    });
  }, [viewMode, tabs, tabPhotoCounts, loadXitoCountForTab]);

  // Load pcloud for active tab lazily on dashboard
  useEffect(() => {
    if (viewMode !== 'dashboard' || tabs.length === 0) return;
    tabs.forEach(t => {
      if (pcloudCounts[t.id] === undefined) loadPcloudCount(t);
    });
  }, [viewMode, tabs, pcloudCounts, loadPcloudCount]);

  const loadAllPcloudCounts = useCallback(async () => {
    setLoadingAllPcloud(true);
    await Promise.all(tabs.map(t => loadPcloudCount(t)));
    setLoadingAllPcloud(false);
  }, [tabs, loadPcloudCount]);

  const refreshXitoCounts = useCallback(async () => {
    setRefreshingXito(true);
    // Clear caches for all tabs
    tabs.forEach(t => {
      delete albumFolderCache[t.id];
      delete albumUrlCache[t.id];
    });
    setTabPhotoCounts({});
    await Promise.all(tabs.map(t => loadXitoCountForTab(t)));
    setRefreshingXito(false);
  }, [tabs, loadXitoCountForTab]);

  const refreshPcloudCounts = useCallback(async () => {
    setLoadingAllPcloud(true);
    tabs.forEach(t => { delete pcloudCountCache[t.id]; });
    setPcloudCounts({});
    await Promise.all(tabs.map(t => loadPcloudCount(t)));
    setLoadingAllPcloud(false);
  }, [tabs, loadPcloudCount]);

  const totalXitoPhotos = useMemo(() => Object.values(tabPhotoCounts).reduce((sum, c) => sum + c, 0), [tabPhotoCounts]);
  const totalPcloudPhotos = useMemo(() => Object.values(pcloudCounts).reduce((sum, c) => sum + c.count, 0), [pcloudCounts]);
  const totalPcloudSize = useMemo(() => Object.values(pcloudCounts).reduce((sum, c) => sum + c.totalSize, 0), [pcloudCounts]);

  const albumProgress = useMemo(() => {
    return albumDefs.map(def => {
      const count = albumSelections.filter(s => s.album_type === def.type).length;
      return { ...def, count };
    });
  }, [albumDefs, albumSelections]);

  const allCountsLoaded = tabs.length > 0 && tabs.every(t => tabPhotoCounts[t.id] !== undefined && pcloudCounts[t.id] !== undefined);

  // ===== PHOTOS VIEW LOGIC =====
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  useEffect(() => {
    if (viewMode !== 'photos') return;
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return;
    let stale = false;

    if (albumFolderCache[tab.id] && albumUrlCache[tab.id]) {
      setPhotos(albumFolderCache[tab.id]);
      setPhotoUrls(albumUrlCache[tab.id]);
      setIsLoadingPhotos(false);
      return;
    }

    setIsLoadingPhotos(true);
    setPhotos([]);
    setPhotoUrls({});

    const loadPhotos = async (imageFiles: E2File[]) => {
      if (stale) return;
      setPhotos(imageFiles);
      setTabPhotoCounts(prev => ({ ...prev, [tab.id]: imageFiles.length }));
      if (imageFiles.length > 0) {
        const urls = await getE2FileUrls(imageFiles.map((f) => f.key));
        if (stale) return;
        albumUrlCache[tab.id] = urls;
        setPhotoUrls(urls);
      }
      setIsLoadingPhotos(false);
    };

    const cached = albumFolderCache[tab.id];
    if (cached) {
      loadPhotos(cached);
    } else {
      listE2Folder(tab.s3Prefix)
        .then((result) => {
          if (stale) return;
          const imageFiles = result.files.filter((f) => isImage(f.key));
          albumFolderCache[tab.id] = imageFiles;
          return loadPhotos(imageFiles);
        })
        .catch(() => {
          if (stale) return;
          setTabPhotoCounts(prev => ({ ...prev, [tab.id]: 0 }));
          setIsLoadingPhotos(false);
        });
    }

    return () => { stale = true; };
  }, [viewMode, activeTab, tabs]);

  const viewerImages = useMemo(
    () => photos.map((p) => ({ key: p.key, url: photoUrls[p.key] || "" })).filter((i) => i.url),
    [photos, photoUrls]
  );

  return (
    <div className="space-y-4">
      {/* Album Summary Header */}
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-primary/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Album Overview</h3>
              {deliverablesLoaded && (
                <p className="text-sm text-white/50">
                  {albumSummary.count === 0 ? "No albums configured in deliverables" : `Total Albums: ${albumSummary.count}`}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setViewMode(viewMode === 'dashboard' ? 'photos' : 'dashboard')}
            >
              {viewMode === 'dashboard' ? (
                <>View Photos <ArrowRight className="h-4 w-4 ml-1" /></>
              ) : (
                <><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</>
              )}
            </Button>
          </div>
          {albumSummary.count > 0 && (
            <div className="flex flex-wrap gap-2">
              {albumSummary.sides.map((s) => (
                <Badge key={s} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">{s} Album</Badge>
              ))}
              {albumSummary.types.map((t, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/70">Type: {t}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DASHBOARD VIEW ===== */}
      {viewMode === 'dashboard' && (
        <>
          {tabs.length === 0 ? (
            <Card className="bg-[hsl(220,25%,12%)] border-white/10">
              <CardContent className="p-10 text-center text-white/40">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No photographer assignments found for this client.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Photos for Album (Xito Drive) */}
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <HardDrive className="h-5 w-5 text-sky-400" />
                      <span className="text-base font-bold text-white">Photos for Album</span>
                      <span className="text-[10px] text-white/40 ml-auto">Xito Drive</span>
                    </div>
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-4xl font-black text-sky-400">{totalXitoPhotos}</span>
                      <span className="text-sm text-white/40">photos</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-white/40 hover:text-white"
                        onClick={refreshXitoCounts}
                        disabled={refreshingXito}
                      >
                        <RefreshCw className={cn("h-4 w-4", refreshingXito && "animate-spin")} />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {tabs.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <span className="text-white/60 truncate mr-2">{t.label}</span>
                          <span className="text-white/90 font-semibold shrink-0">
                            {tabPhotoCounts[t.id] !== undefined ? tabPhotoCounts[t.id] : <Loader2 className="h-3 w-3 animate-spin inline" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Original Edited Photos (pCloud) */}
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CloudCog className="h-5 w-5 text-amber-400" />
                      <span className="text-base font-bold text-white">Original Edited</span>
                      <span className="text-[10px] text-white/40 ml-auto">pCloud</span>
                    </div>
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-4xl font-black text-amber-400">{totalPcloudPhotos}</span>
                      {totalPcloudSize > 0 && (
                        <span className="text-sm text-white/40">{formatPCloudSize(totalPcloudSize)}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-white/40 hover:text-white"
                        onClick={refreshPcloudCounts}
                        disabled={loadingAllPcloud}
                      >
                        <RefreshCw className={cn("h-4 w-4", loadingAllPcloud && "animate-spin")} />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {tabs.map(t => {
                        const pc = pcloudCounts[t.id];
                        const loading = pcloudLoading[t.id];
                        return (
                          <div key={t.id} className="flex items-center justify-between text-sm">
                            <span className="text-white/60 truncate mr-2">{t.label}</span>
                            <span className="text-white/90 font-semibold shrink-0">
                              {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : pc ? `${pc.count} · ${formatPCloudSize(pc.totalSize)}` : <Loader2 className="h-3 w-3 animate-spin inline" />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Album Selection Progress */}
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-5 w-5 text-rose-400" />
                      <span className="text-base font-bold text-white">Selection Progress</span>
                    </div>
                    {albumProgress.length === 0 ? (
                      <p className="text-sm text-white/40 mt-4">No albums configured</p>
                    ) : (
                      <div className="space-y-4 mt-2">
                        {albumProgress.map(ap => {
                          const pct = Math.min(100, Math.round((ap.count / MAX_ALBUM_PHOTOS) * 100));
                          return (
                            <div key={ap.type}>
                              <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="text-white/80 font-medium">{ap.name}</span>
                                <span className={cn("font-bold text-base", ap.count >= MAX_ALBUM_PHOTOS ? "text-emerald-400" : "text-rose-400")}>
                                  {ap.count}/{MAX_ALBUM_PHOTOS}
                                </span>
                              </div>
                              <Progress value={pct} className="h-3 bg-white/10 [&>div]:bg-rose-500" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Match Indicator */}
              {allCountsLoaded && (
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-white/80">Xito ↔ pCloud Match</span>
                      {totalXitoPhotos === totalPcloudPhotos ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All Match
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Mismatch
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {tabs.map(t => {
                        const xCount = tabPhotoCounts[t.id] ?? 0;
                        const pCount = pcloudCounts[t.id]?.count ?? 0;
                        const match = xCount === pCount;
                        return (
                          <div key={t.id} className="flex items-center justify-between text-sm">
                            <span className="text-white/60 truncate mr-2">{t.label}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sky-400 font-semibold">{xCount}</span>
                              <span className="text-white/30">vs</span>
                              <span className="text-amber-400 font-semibold">{pCount}</span>
                              {match ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ===== PHOTOS VIEW ===== */}
      {viewMode === 'photos' && (
        <>
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
                                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}

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
