import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, Image as ImageIcon, Loader2, FolderOpen, Camera, CloudCog, HardDrive, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, ArrowRight, Circle, Send, Settings, Copy, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadDeliverables, DeliverableRow } from "@/lib/deliverables-api";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { listPCloudFolderByPath, isPCloudImage, formatPCloudSize, createPCloudFolderByPath, copyPCloudFileByPath } from "@/lib/pcloud-api";
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

// Per-client dashboard cache backed by Supabase database
interface ClientDashboardCache {
  xitoCounts: Record<string, number>;
  pcloudCounts: Record<string, { count: number; totalSize: number }>;
  fetched: boolean;
}

// In-memory cache for current session (avoids repeated DB reads)
const clientDashboardCache: Record<string, ClientDashboardCache> = {};

async function loadCacheFromDB(registeredDateTimeAD: string): Promise<ClientDashboardCache | null> {
  try {
    const { data } = await supabase
      .from("album_dashboard_cache")
      .select("xito_counts, pcloud_counts")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .maybeSingle();
    if (data && data.xito_counts && data.pcloud_counts) {
      return {
        xitoCounts: data.xito_counts as Record<string, number>,
        pcloudCounts: data.pcloud_counts as Record<string, { count: number; totalSize: number }>,
        fetched: true,
      };
    }
    return null;
  } catch { return null; }
}

async function saveCacheToDB(
  registeredDateTimeAD: string,
  xitoCounts: Record<string, number>,
  pcloudCounts: Record<string, { count: number; totalSize: number }>
) {
  try {
    await supabase
      .from("album_dashboard_cache")
      .upsert({
        registered_date_time_ad: registeredDateTimeAD,
        xito_counts: xitoCounts,
        pcloud_counts: pcloudCounts,
        updated_at: new Date().toISOString(),
      }, { onConflict: "registered_date_time_ad" });
  } catch {}
}

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

  const [pcloudCounts, setPcloudCounts] = useState<Record<string, { count: number; totalSize: number }>>({});
  const [pcloudLoading, setPcloudLoading] = useState<Record<string, boolean>>({});
  const [albumDefs, setAlbumDefs] = useState<AlbumDef[]>([]);
  const [albumSelections, setAlbumSelections] = useState<AlbumSelection[]>([]);
  const [loadingAllPcloud, setLoadingAllPcloud] = useState(false);
  const [refreshingXito, setRefreshingXito] = useState(false);
  const [albumSubmission, setAlbumSubmission] = useState<{ sent_to: string; handled: boolean } | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Copy HQ Album Photos state
  const [copyStatus, setCopyStatus] = useState<'idle' | 'confirming' | 'copying' | 'done' | 'error'>('idle');
  const [copyResult, setCopyResult] = useState<{ copied: number; expected: number; errors: string[]; albumDetails?: { albumType: string; folderName: string; count: number }[]; monthFolder?: string; copiedAt?: string } | null>(null);

  // Bride/groom names from submission
  const [brideGroom, setBrideGroom] = useState<{ bride: string; groom: string }>({ bride: '', groom: '' });

  // Load copy history from DB on mount + auto-detect from pCloud
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    (async () => {
      // Check DB first
      const { data } = await supabase
        .from("album_copy_history")
        .select("*")
        .eq("registered_date_time_ad", registeredDateTimeAD)
        .maybeSingle();
      if (data) {
        const albums = (data.albums_copied as any[]) || [];
        setCopyResult({
          copied: data.total_copied,
          expected: data.total_expected,
          errors: data.errors || [],
          albumDetails: albums,
          monthFolder: data.month_folder,
          copiedAt: data.copied_at,
        });
        setCopyStatus('done');
      }
    })();
  }, [registeredDateTimeAD]);

  // Fetch bride/groom names from submission
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    supabase
      .from("album_selection_submissions")
      .select("bride_name, groom_name")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBrideGroom({ bride: data[0].bride_name || '', groom: data[0].groom_name || '' });
        }
      });
  }, [registeredDateTimeAD]);

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

  // Fetch album submission status
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    supabase
      .from("album_selection_submissions")
      .select("sent_to, handled")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAlbumSubmission({ sent_to: data[0].sent_to, handled: data[0].handled });
        }
      });
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

  // On first mount per client: restore from DB cache or auto-fetch
  useEffect(() => {
    if (tabs.length === 0 || initialLoadDone) return;
    const memCached = clientDashboardCache[registeredDateTimeAD];
    if (memCached?.fetched) {
      setTabPhotoCounts(memCached.xitoCounts);
      setPcloudCounts(memCached.pcloudCounts);
      setInitialLoadDone(true);
      return;
    }
    // Try loading from database first
    setInitialLoadDone(true);
    const init = async () => {
      const dbCached = await loadCacheFromDB(registeredDateTimeAD);
      if (dbCached) {
        clientDashboardCache[registeredDateTimeAD] = dbCached;
        setTabPhotoCounts(dbCached.xitoCounts);
        setPcloudCounts(dbCached.pcloudCounts);
        return;
      }
      // First time — auto-fetch all counts
      setRefreshingXito(true);
      setLoadingAllPcloud(true);
      const xitoResults: Record<string, number> = {};
      const pcloudResults: Record<string, { count: number; totalSize: number }> = {};

      await Promise.all(tabs.map(async (t) => {
        try {
          if (albumFolderCache[t.id]) {
            xitoResults[t.id] = albumFolderCache[t.id].length;
          } else {
            const result = await listE2Folder(t.s3Prefix);
            const imageFiles = result.files.filter((f) => isImage(f.key));
            albumFolderCache[t.id] = imageFiles;
            xitoResults[t.id] = imageFiles.length;
          }
        } catch { xitoResults[t.id] = 0; }
        try {
          if (pcloudCountCache[t.id]) {
            pcloudResults[t.id] = pcloudCountCache[t.id];
          } else {
            const folder = await listPCloudFolderByPath(t.pcloudPath);
            const images = folder.contents.filter(isPCloudImage);
            const totalSize = images.reduce((s, f) => s + (f.size || 0), 0);
            const r = { count: images.length, totalSize };
            pcloudCountCache[t.id] = r;
            pcloudResults[t.id] = r;
          }
        } catch { pcloudResults[t.id] = { count: 0, totalSize: 0 }; }
      }));

      setTabPhotoCounts(xitoResults);
      setPcloudCounts(pcloudResults);
      clientDashboardCache[registeredDateTimeAD] = { xitoCounts: xitoResults, pcloudCounts: pcloudResults, fetched: true };
      saveCacheToDB(registeredDateTimeAD, xitoResults, pcloudResults);
      setRefreshingXito(false);
      setLoadingAllPcloud(false);
    };
    init();
  }, [tabs, initialLoadDone, registeredDateTimeAD]);

  const refreshXitoCounts = useCallback(async () => {
    setRefreshingXito(true);
    tabs.forEach(t => { delete albumFolderCache[t.id]; delete albumUrlCache[t.id]; });
    const xitoResults: Record<string, number> = {};
    await Promise.all(tabs.map(async (t) => {
      try {
        const result = await listE2Folder(t.s3Prefix);
        const imageFiles = result.files.filter((f) => isImage(f.key));
        albumFolderCache[t.id] = imageFiles;
        xitoResults[t.id] = imageFiles.length;
      } catch { xitoResults[t.id] = 0; }
    }));
    setTabPhotoCounts(xitoResults);
    if (clientDashboardCache[registeredDateTimeAD]) {
      clientDashboardCache[registeredDateTimeAD].xitoCounts = xitoResults;
    }
    saveCacheToDB(registeredDateTimeAD, xitoResults, clientDashboardCache[registeredDateTimeAD]?.pcloudCounts || {});
    setRefreshingXito(false);
  }, [tabs, registeredDateTimeAD]);

  const refreshPcloudCounts = useCallback(async () => {
    setLoadingAllPcloud(true);
    tabs.forEach(t => { delete pcloudCountCache[t.id]; });
    const pcloudResults: Record<string, { count: number; totalSize: number }> = {};
    await Promise.all(tabs.map(async (t) => {
      try {
        const folder = await listPCloudFolderByPath(t.pcloudPath);
        const images = folder.contents.filter(isPCloudImage);
        const totalSize = images.reduce((s, f) => s + (f.size || 0), 0);
        const r = { count: images.length, totalSize };
        pcloudCountCache[t.id] = r;
        pcloudResults[t.id] = r;
      } catch { pcloudResults[t.id] = { count: 0, totalSize: 0 }; }
    }));
    setPcloudCounts(pcloudResults);
    if (clientDashboardCache[registeredDateTimeAD]) {
      clientDashboardCache[registeredDateTimeAD].pcloudCounts = pcloudResults;
    }
    saveCacheToDB(registeredDateTimeAD, clientDashboardCache[registeredDateTimeAD]?.xitoCounts || {}, pcloudResults);
    setLoadingAllPcloud(false);
  }, [tabs, registeredDateTimeAD]);

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

  // Compute album workflow status
  const workflowStatus = useMemo(() => {
    const steps = [
      { label: "Uploaded in pCloud", condition: totalPcloudPhotos > 0 },
      { label: "Uploaded for Album Selection", condition: totalXitoPhotos > 0 },
      { label: "Album Selection in Progress", condition: albumSelections.length > 0 },
      { label: albumSubmission ? `Sent for Design → ${albumSubmission.sent_to}` : "Sent for Design", condition: !!albumSubmission },
    ];
    let currentStep = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].condition) currentStep = i + 1;
    }
    return { steps, currentStep };
  }, [totalPcloudPhotos, totalXitoPhotos, albumSelections.length, albumSubmission]);

  // Determine the majority month/year from assignments for copy destination
  const getMajorityYearMonth = useCallback(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => {
      const y = String(parseInt(a.eventYear || "0"));
      const m = parseInt(a.eventMonth || "0");
      if (y === "0" || !m) return;
      const monthLabel = NEPALI_MONTHS[m] || `MONTH ${m}`;
      const key = `${monthLabel} EVENTS ${y}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    let best = "";
    let bestCount = 0;
    Object.entries(counts).forEach(([k, v]) => {
      if (v > bestCount) { best = k; bestCount = v; }
    });
    return best;
  }, [assignments]);

  // Has frame deliverable?
  const hasFrameDeliverable = useMemo(() => {
    return deliverables.some(d => d.section === "album" && d.enabled && d.deliverable_type.toLowerCase().includes("frame"));
  }, [deliverables]);

  const isCopyEnabled = workflowStatus.currentStep >= 4; // Sent for Design

  // Auto-detect already-copied albums from pCloud (reconciliation)
  useEffect(() => {
    if (!isCopyEnabled || copyStatus !== 'idle' || !registeredDateTimeAD) return;
    const monthFolder = getMajorityYearMonth();
    if (!monthFolder) return;

    const basePath = `ALBUM AND FRAME - WEDDING TALES NEPAL/${monthFolder}/${clientName}`;
    (async () => {
      try {
        const folder = await listPCloudFolderByPath(basePath);
        const subfolders = folder.contents.filter(i => i.isfolder);
        if (subfolders.length === 0) return;

        // Count files in each subfolder
        const albumDetails: { albumType: string; folderName: string; count: number }[] = [];
        let totalCopied = 0;
        for (const sub of subfolders) {
          const subFolder = await listPCloudFolderByPath(`${basePath}/${sub.name}`);
          const imageCount = subFolder.contents.filter(isPCloudImage).length;
          if (imageCount > 0) {
            const albumType = sub.name.toLowerCase().replace(/ /g, '_');
            albumDetails.push({ albumType, folderName: sub.name, count: imageCount });
            totalCopied += imageCount;
          }
        }

        if (totalCopied > 0) {
          const result = {
            copied: totalCopied,
            expected: totalCopied,
            errors: [] as string[],
            albumDetails,
            monthFolder,
            copiedAt: new Date().toISOString(),
          };
          setCopyResult(result);
          setCopyStatus('done');

          // Save to DB
          await supabase.from("album_copy_history").upsert({
            registered_date_time_ad: registeredDateTimeAD,
            client_name: clientName,
            month_folder: monthFolder,
            albums_copied: albumDetails,
            total_copied: totalCopied,
            total_expected: totalCopied,
            errors: [],
            copied_at: new Date().toISOString(),
          }, { onConflict: "registered_date_time_ad" });
        }
      } catch {
        // Folder doesn't exist — not copied yet, that's fine
      }
    })();
  }, [isCopyEnabled, copyStatus, registeredDateTimeAD, clientName, getMajorityYearMonth]);

  // Copy HQ album photos orchestration
  const executeCopy = useCallback(async () => {
    setCopyStatus('copying');
    setCopyResult(null);
    const errors: string[] = [];
    let copied = 0;
    let expected = 0;

    try {
      const monthFolder = getMajorityYearMonth();
      if (!monthFolder) throw new Error("Could not determine month folder");

      const basePath = `/ALBUM AND FRAME - WEDDING TALES NEPAL/${monthFolder}/${clientName}`;

      // Group selections by album_type
      const grouped: Record<string, AlbumSelection[]> = {};
      albumSelections.forEach(s => {
        if (!grouped[s.album_type]) grouped[s.album_type] = [];
        grouped[s.album_type].push(s);
      });

      // Map album_type to folder name
      const albumTypeToFolder: Record<string, string> = {};
      albumDefs.forEach(def => {
        const folderName = def.name.toUpperCase();
        albumTypeToFolder[def.type] = folderName;
      });

      // Create all album folders + FRAME if needed
      const folderNames = Object.values(albumTypeToFolder);
      if (hasFrameDeliverable) folderNames.push("FRAME");

      await Promise.all(folderNames.map(f => createPCloudFolderByPath(`${basePath}/${f}`)));

      const albumDetails: { albumType: string; folderName: string; count: number }[] = [];

      // Copy files for each album type
      for (const [albumType, selections] of Object.entries(grouped)) {
        const folderName = albumTypeToFolder[albumType] || albumType.replace(/_/g, ' ').toUpperCase();
        expected += selections.length;
        let albumCopied = 0;

        // Process in batches of 10 to avoid overwhelming pCloud
        for (let i = 0; i < selections.length; i += 10) {
          const batch = selections.slice(i, i + 10);
          const results = await Promise.allSettled(batch.map(async (sel) => {
            const fileName = sel.photo_key.split('/').pop() || '';
            const sourcePath = `/WEDDING TALES NEPAL/${sel.photo_key}`;
            const destPath = `${basePath}/${folderName}/${fileName}`;
            await copyPCloudFileByPath(sourcePath, destPath);
          }));
          results.forEach((r, idx) => {
            if (r.status === 'fulfilled') {
              copied++;
              albumCopied++;
            } else {
              errors.push(`${batch[idx].photo_key}: ${r.reason?.message || 'Copy failed'}`);
            }
          });
        }

        albumDetails.push({ albumType, folderName, count: albumCopied });
      }

      const result = { copied, expected, errors, albumDetails, monthFolder, copiedAt: new Date().toISOString() };
      setCopyResult(result);
      setCopyStatus('done');

      // Save to database
      await supabase.from("album_copy_history").upsert({
        registered_date_time_ad: registeredDateTimeAD,
        client_name: clientName,
        month_folder: monthFolder,
        albums_copied: albumDetails,
        total_copied: copied,
        total_expected: expected,
        errors: errors,
        copied_at: new Date().toISOString(),
      }, { onConflict: "registered_date_time_ad" });

    } catch (err: any) {
      errors.push(err.message || 'Unknown error');
      setCopyResult({ copied, expected, errors });
      setCopyStatus('error');
    }
  }, [albumSelections, albumDefs, clientName, getMajorityYearMonth, hasFrameDeliverable, registeredDateTimeAD]);

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Card 4: Album Workflow Status */}
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Send className="h-5 w-5 text-violet-400" />
                      <span className="text-base font-bold text-white">Workflow Status</span>
                    </div>
                    <div className="space-y-0">
                      {workflowStatus.steps.map((step, i) => {
                        const stepNum = i + 1;
                        const isCompleted = stepNum <= workflowStatus.currentStep;
                        const isCurrent = stepNum === workflowStatus.currentStep;
                        const isPending = stepNum > workflowStatus.currentStep;
                        return (
                          <div key={i} className="flex items-start gap-3">
                            {/* Vertical line + icon */}
                            <div className="flex flex-col items-center">
                              {isCompleted ? (
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0", isCurrent ? "bg-emerald-500" : "bg-emerald-500/60")}>
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0">
                                  <Circle className="h-3 w-3 text-white/20" />
                                </div>
                              )}
                              {i < workflowStatus.steps.length - 1 && (
                                <div className={cn("w-0.5 h-5", isCompleted ? "bg-emerald-500/40" : "bg-white/10")} />
                              )}
                            </div>
                            <span className={cn(
                              "text-sm pt-0.5 leading-tight",
                              isCompleted ? "text-white font-medium" : "text-white/30",
                              isCurrent && "text-emerald-300 font-semibold"
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {workflowStatus.currentStep === 0 && (
                      <p className="text-xs text-white/30 mt-3">No activity yet</p>
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

              {/* Gear Button: Copy HQ Album Photos — Horizontal Layout */}
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex items-center gap-6">
                  {/* Left Side: Album details */}
                  <div className="w-40 text-right space-y-1.5">
                    {copyStatus === 'done' && copyResult?.albumDetails ? (
                      copyResult.albumDetails.map((a, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-white/80">{a.folderName}:</span>{" "}
                          <span className="text-emerald-400 font-bold">{a.count}</span>
                        </div>
                      ))
                    ) : isCopyEnabled ? (
                      albumDefs.map((d, i) => {
                        const count = albumSelections.filter(s => s.album_type === d.type).length;
                        return (
                          <div key={i} className="text-sm">
                            <span className="text-white/60">{d.name.toUpperCase()}:</span>{" "}
                            <span className="text-white/80 font-medium">{count}</span>
                          </div>
                        );
                      })
                    ) : null}
                  </div>

                  {/* Center: Gear */}
                  <div className="relative">
                    {isCopyEnabled && copyStatus !== 'done' && copyStatus !== 'copying' && (
                      <>
                        <div className="absolute inset-[-12px] rounded-full border-2 border-white/5 animate-[pulse_3s_ease-in-out_infinite]" />
                        <div className="absolute inset-[-6px] rounded-full border border-white/8 animate-[pulse_2.5s_ease-in-out_infinite_0.5s]" />
                      </>
                    )}
                    {copyStatus === 'copying' && (
                      <div className="absolute inset-[-8px] rounded-full border-2 border-t-emerald-400 border-r-emerald-400/40 border-b-emerald-400/10 border-l-emerald-400/40 animate-spin" />
                    )}
                    <button
                      onClick={() => isCopyEnabled && copyStatus !== 'copying' && copyStatus !== 'done' && setCopyStatus('confirming')}
                      disabled={!isCopyEnabled || copyStatus === 'copying' || copyStatus === 'done'}
                      className={cn(
                        "relative h-32 w-32 rounded-full flex items-center justify-center transition-all duration-500",
                        "bg-[hsl(220,25%,8%)] border-2",
                        isCopyEnabled
                          ? copyStatus === 'done'
                            ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            : "border-white/15 hover:border-white/30 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                          : "border-white/5 cursor-not-allowed opacity-30",
                        copyStatus === 'copying' && "shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                      )}
                    >
                      {copyStatus === 'done' && copyResult ? (
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 mb-1" />
                          <span className={cn(
                            "text-3xl font-black",
                            copyResult.errors.length > 0 ? "text-amber-400" : "text-emerald-400"
                          )}>
                            {copyResult.copied}
                          </span>
                          <span className="text-[10px] text-white/40 font-medium tracking-wider uppercase">copied</span>
                        </div>
                      ) : (
                        <Settings className={cn(
                          "h-14 w-14 transition-all duration-300",
                          isCopyEnabled ? "text-white/30" : "text-white/10",
                          copyStatus === 'copying' && "animate-spin text-emerald-400/60"
                        )} />
                      )}
                    </button>
                  </div>

                  {/* Right Side: Status & date */}
                  <div className="w-40 space-y-1.5">
                    {copyStatus === 'done' && copyResult ? (
                      <>
                        <div className="text-sm">
                          {copyResult.errors.length > 0 ? (
                            <span className="text-amber-300 font-medium">{copyResult.errors.length} failed</span>
                          ) : (
                            <span className="text-emerald-300 font-medium">✓ All copied</span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          {copyResult.monthFolder || ''}
                        </div>
                        {copyResult.copiedAt && (
                          <div className="text-[10px] text-white/50">
                            {new Date(copyResult.copiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                        <div className="text-xs text-sky-400/80 mt-1">
                          In pCloud ☁️
                        </div>
                      </>
                    ) : isCopyEnabled ? (
                      <span className="text-xs text-white/50">Ready to copy</span>
                    ) : (
                      <span className="text-xs text-white/40">Waiting for design</span>
                    )}
                  </div>
                </div>

                <span className={cn(
                  "text-sm font-semibold tracking-wide transition-colors",
                  isCopyEnabled ? "text-white/50" : "text-white/15"
                )}>
                  Copy HQ Album Photos
                </span>

                {/* Copy Information Button */}
                {copyStatus === 'done' && copyResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/60 hover:text-white hover:bg-white/10 gap-2 mt-1"
                    onClick={() => {
                      const monthFolder = copyResult.monthFolder || getMajorityYearMonth();
                      const albumLines = (copyResult.albumDetails || []).map(a => `${a.folderName} (${a.count})`).join(', ');
                      const total = copyResult.copied;
                      const pcloudPath = `ALBUM AND FRAME - WEDDING TALES NEPAL/${monthFolder}/${clientName}`;
                      const lines = [
                        `Client: ${clientName}`,
                      ];
                      if (brideGroom.bride) lines.push(`Bride: ${brideGroom.bride}`);
                      if (brideGroom.groom) lines.push(`Groom: ${brideGroom.groom}`);
                      lines.push(
                        `Month: ${monthFolder}`,
                        `Albums: ${albumLines}`,
                        `Total: ${total} photos`,
                        `pCloud: https://my.pcloud.com/`,
                        `Path: ${pcloudPath}`,
                      );
                      navigator.clipboard.writeText(lines.join('\n')).then(() => {
                        toast.success("Information copied!");
                      });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Information
                  </Button>
                )}
              </div>

              {/* Confirmation Dialog */}
              <Dialog open={copyStatus === 'confirming'} onOpenChange={(open) => { if (!open) setCopyStatus('idle'); }}>
                <DialogContent className="bg-[hsl(220,25%,12%)] border-white/10 max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Copy HQ Album Photos
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Are names matching?</span>
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" onClick={() => {}}>Yes</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Is date okay?</span>
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" onClick={() => {}}>Yes</Button>
                    </div>
                    <div className="text-xs text-white/40 pt-2 border-t border-white/5">
                      This will copy <span className="text-white/70 font-medium">{albumSelections.length}</span> selected photos into the "ALBUM AND FRAME" folder in pCloud.
                      {hasFrameDeliverable && " A FRAME folder will also be created."}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" className="text-white/50" onClick={() => setCopyStatus('idle')}>Cancel</Button>
                    <Button className="bg-primary text-primary-foreground" onClick={() => executeCopy()}>
                      Start Copying
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
