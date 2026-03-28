import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronRight, Cloud, FolderPlus, Upload, CloudUpload, AlertTriangle, RefreshCw, CheckCircle2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XitoDriveFolderCard } from "@/components/xito-drive/XitoDriveFolderCard";
import { supabase } from "@/integrations/supabase/client";
import {
  MonthYearGroup,
  buildMonthYearGroups,
  getUniqueYears,
  getFreelancersForEvent,
  getVideoSubfolders,
  PCLOUD_CATEGORIES,
  RESEARCH_CATEGORIES,
  FreelancerAssignment,
} from "@/lib/xito-drive-utils";
import {
  listPCloudFolderByPath,
  createPCloudFolderByPath,
  uploadToPCloud,
  getPCloudFileLink,
  PCloudItem,
} from "@/lib/pcloud-api";
import { checkPCloudSyncStatus, syncPendingFolders, PendingSyncStatus } from "@/lib/pcloud-sync";
import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { usePCloudUploadContext } from "@/contexts/PCloudUploadContext";
import { toast } from "sonner";

interface Props {
  clients: BookedClientData[];
  assignments: FreelancerAssignment[];
  isLoading: boolean;
}

type BreadcrumbSegment = { label: string; level: string };

const PCLOUD_ROOT = "WEDDING TALES NEPAL";

/**
 * pCloud Drive — Photos + Videos browser.
 * Browses pCloud under /WEDDING TALES NEPAL.
 */
export function PCloudDriveBrowser({ clients, assignments, isLoading }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [pcloudItems, setPcloudItems] = useState<PCloudItem[]>([]);
  const [pcloudLoading, setPcloudLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { addJobs: addPCloudUploadJobs } = usePCloudUploadContext();
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Pending sync status
  const [pendingStatus, setPendingStatus] = useState<PendingSyncStatus | null>(null);
  const [checkingSync, setCheckingSync] = useState(false);

  // Folder sizes cache
  const [folderSizes, setFolderSizes] = useState<Record<string, { sizeGB: string; bytes: number }>>({});
  const [calculatingSizes, setCalculatingSizes] = useState(false);

  // Load cached folder sizes from DB — auto-calculate if none exist
  const [sizesLoaded, setSizesLoaded] = useState(false);
  const [autoCalcTriggered, setAutoCalcTriggered] = useState(false);

  useEffect(() => {
    supabase
      .from('pcloud_folder_sizes')
      .select('folder_path, folder_name, size_bytes')
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setSizesLoaded(true);
          return;
        }
        const map: Record<string, { sizeGB: string; bytes: number }> = {};
        for (const row of data) {
          const gb = row.size_bytes / (1024 * 1024 * 1024);
          map[row.folder_path] = {
            sizeGB: gb >= 1 ? `${gb.toFixed(1)} GB` : `${(row.size_bytes / (1024 * 1024)).toFixed(0)} MB`,
            bytes: Number(row.size_bytes),
          };
        }
        setFolderSizes(map);
        setSizesLoaded(true);
      });
  }, []);



  const groups = useMemo(() => buildMonthYearGroups(clients), [clients]);
  const uniqueYears = useMemo(() => getUniqueYears(groups), [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (yearFilter !== "all" && g.year !== yearFilter) return false;
      if (monthFilter !== "all" && g.month !== monthFilter) return false;
      return true;
    });
  }, [groups, yearFilter, monthFilter]);

  const currentLevel = breadcrumb.length;
  const selectedGroupLabel = breadcrumb[0]?.label;
  const selectedClient = breadcrumb[1]?.label;
  const selectedCategory = breadcrumb[2]?.label;
  const selectedEvent = breadcrumb[3]?.label;

  const currentGroup = groups.find(g => g.label === selectedGroupLabel);
  const currentClientFolder = currentGroup?.clients.find(c => c.clientName === selectedClient);

  // Build pCloud path
  const currentPCloudPath = useMemo(() => {
    const segments = [PCLOUD_ROOT];
    if (breadcrumb[0]) segments.push(breadcrumb[0].label.replace(/[/\\]/g, "_"));
    for (let i = 1; i < breadcrumb.length; i++) {
      segments.push(breadcrumb[i].label.replace(/[/\\]/g, "_"));
    }
    return "/" + segments.join("/");
  }, [breadcrumb]);

  const handleRecalculateSizes = useCallback(async () => {
    setCalculatingSizes(true);
    const toastId = toast.loading("Calculating ALL folder sizes from pCloud...");
    try {
      // Use calculateallsizes to get sizes for EVERY folder in the tree
      const { data, error } = await supabase.functions.invoke('pcloud-api', {
        body: { action: 'calculateallsizes', params: { path: `/${PCLOUD_ROOT}` } },
      });
      if (error) throw error;
      
      const folders = data?.folders || [];
      const newSizes: Record<string, { sizeGB: string; bytes: number }> = {};
      
      // Batch upsert all folder sizes
      const upsertRows = folders.map((f: any) => ({
        folder_path: f.path,
        folder_name: f.name,
        size_bytes: f.totalBytes,
        file_count: f.fileCount,
        calculated_at: new Date().toISOString(),
      }));
      
      for (const f of folders) {
        const gb = f.totalBytes / (1024 * 1024 * 1024);
        const sizeLabel = gb >= 1 ? `${gb.toFixed(1)} GB` : `${(f.totalBytes / (1024 * 1024)).toFixed(0)} MB`;
        newSizes[f.path] = { sizeGB: sizeLabel, bytes: f.totalBytes };
      }

      // Upsert in batches of 50
      for (let i = 0; i < upsertRows.length; i += 50) {
        await supabase.from('pcloud_folder_sizes').upsert(
          upsertRows.slice(i, i + 50),
          { onConflict: 'folder_path' }
        );
      }
      
      setFolderSizes(prev => ({ ...prev, ...newSizes }));
      toast.dismiss(toastId);
      toast.success(`Calculated sizes for ${folders.length} folders`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to calculate sizes");
      console.error(err);
    } finally {
      setCalculatingSizes(false);
    }
  }, []);

  // Auto-calculate sizes on first load if no cached sizes exist
  useEffect(() => {
    if (sizesLoaded && !autoCalcTriggered && Object.keys(folderSizes).length === 0) {
      setAutoCalcTriggered(true);
      handleRecalculateSizes();
    }
  }, [sizesLoaded, autoCalcTriggered, folderSizes, handleRecalculateSizes]);

  const getFolderSize = useCallback((folderName: string): string | undefined => {
    const path = breadcrumb.length === 0 
      ? `/${PCLOUD_ROOT}/${folderName}` 
      : `${currentPCloudPath}/${folderName}`;
    return folderSizes[path]?.sizeGB;
  }, [folderSizes, currentPCloudPath, breadcrumb.length]);


  useEffect(() => {
    if (clients.length === 0 || isLoading) return;
    let cancelled = false;
    setCheckingSync(true);
    checkPCloudSyncStatus(clients, assignments)
      .then(status => {
        if (!cancelled) setPendingStatus(status);
      })
      .catch(err => {
        console.warn("Sync status check failed:", err);
      })
      .finally(() => {
        if (!cancelled) setCheckingSync(false);
      });
    return () => { cancelled = true; };
  }, [clients, assignments, isLoading]);

  // Fetch pCloud contents — always fetch (including root level for folder IDs)
  useEffect(() => {
    let cancelled = false;
    setPcloudLoading(true);
    setPcloudItems([]);
    const path = breadcrumb.length === 0 ? `/${PCLOUD_ROOT}` : currentPCloudPath;
    listPCloudFolderByPath(path)
      .then(result => {
        if (!cancelled) {
          setPcloudItems(result.contents);
          setCurrentFolderId(result.metadata.folderid ?? null);
        }
      })
      .catch(err => {
        console.warn("pCloud list failed:", err);
        if (!cancelled) setPcloudItems([]);
      })
      .finally(() => { if (!cancelled) setPcloudLoading(false); });
    return () => { cancelled = true; };
  }, [currentPCloudPath, breadcrumb.length]);

  const navigate = (label: string, level: string) => {
    setBreadcrumb(prev => [...prev, { label, level }]);
  };

  const navigateTo = (index: number) => {
    if (index < 0) setBreadcrumb([]);
    else setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Enter folder name:");
    if (!name?.trim()) return;
    try {
      await createPCloudFolderByPath(`${currentPCloudPath}/${name.trim()}`);
      toast.success(`Folder "${name.trim()}" created`);
      const result = await listPCloudFolderByPath(currentPCloudPath);
      setPcloudItems(result.contents);
    } catch (err) {
      toast.error("Failed to create folder");
      console.error(err);
    }
  }, [currentPCloudPath]);

  const handleUpload = useCallback(async () => {
    if (breadcrumb.length === 0) {
      toast.error("Navigate to a folder first");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,video/*";
    input.onchange = () => {
      const fileList = input.files;
      if (!fileList?.length) return;
      const targetPath = currentPCloudPath;
      addPCloudUploadJobs(Array.from(fileList), targetPath);
      toast.success(`${fileList.length} file(s) queued for upload to pCloud`);
    };
    input.click();
  }, [currentPCloudPath, breadcrumb.length, addPCloudUploadJobs]);

  const handleFileClick = useCallback(async (item: PCloudItem) => {
    if (!item.fileid) return;
    try {
      const url = await getPCloudFileLink(item.fileid);
      window.open(url, "_blank");
    } catch (err) {
      toast.error("Failed to get file link");
      console.error(err);
    }
  }, []);

  const handleSyncPending = useCallback(async () => {
    if (syncing || !pendingStatus || pendingStatus.pending === 0) return;
    setSyncing(true);
    setSyncProgress({ current: 0, total: pendingStatus.pending });
    const toastId = toast.loading("Syncing new folders to pCloud...");
    try {
      const { created, errors } = await syncPendingFolders(pendingStatus.paths, (p) => {
        setSyncProgress({ current: p.current, total: p.total });
      });
      toast.dismiss(toastId);
      toast.success(errors.length === 0 ? `Synced ${created} new folders` : `Synced ${created}, ${errors.length} failed`);
      // Re-check status
      const newStatus = await checkPCloudSyncStatus(clients, assignments);
      setPendingStatus(newStatus);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync failed");
      console.error(err);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [syncing, pendingStatus, clients, assignments]);

  const handleRefreshStatus = useCallback(async () => {
    setCheckingSync(true);
    try {
      const status = await checkPCloudSyncStatus(clients, assignments);
      setPendingStatus(status);
      if (status.pending === 0) {
        toast.success("Everything is in sync!");
      }
    } catch (err) {
      toast.error("Failed to check sync status");
      console.error(err);
    } finally {
      setCheckingSync(false);
    }
  }, [clients, assignments]);

  // Virtual folder names at current level
  const virtualFolderNames = useMemo(() => {
    const names = new Set<string>();
    if (currentLevel === 0) {
      filteredGroups.forEach(g => names.add(g.label));
    } else if (currentLevel === 1 && currentGroup) {
      currentGroup.clients.forEach(c => names.add(c.clientName));
    } else if (currentLevel === 2) {
      PCLOUD_CATEGORIES.forEach(cat => names.add(cat.name));
      RESEARCH_CATEGORIES.forEach(cat => names.add(cat.name));
    } else if (currentLevel === 3 && currentClientFolder) {
      if (selectedCategory === "Photos") {
        [...currentClientFolder.events, "Selected"].forEach(e => names.add(e));
      } else if (selectedCategory === "Videos") {
        getVideoSubfolders().forEach(s => names.add(s));
      }
    } else if (currentLevel === 4 && currentClientFolder && selectedCategory === "Photos" && selectedEvent !== "Selected") {
      const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
      photographers.forEach(p => names.add(p));
    }
    return names;
  }, [currentLevel, filteredGroups, currentGroup, currentClientFolder, selectedCategory, selectedEvent, assignments]);

  // Extra pCloud folders not in virtual tree
  const extraPCloudFolders = useMemo(() => {
    return pcloudItems
      .filter(item => item.isfolder && !virtualFolderNames.has(item.name))
      .map(item => item);
  }, [pcloudItems, virtualFolderNames]);

  const pcloudFiles = useMemo(() => {
    return pcloudItems.filter(item => !item.isfolder);
  }, [pcloudItems]);

  // Pending sync banner
  const renderPendingBanner = () => {
    if (checkingSync) {
      return (
        <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-4 py-3 text-sm animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking for pending changes...</span>
        </div>
      );
    }

    if (!pendingStatus) return null;

    if (pendingStatus.pending === 0) {
      return (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-300 font-medium">All folders in sync</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={handleRefreshStatus}>
            <RefreshCw className="h-3 w-3 mr-1" /> Recheck
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {pendingStatus.pending} new {pendingStatus.pending === 1 ? "folder" : "folders"} pending sync
            </p>
            {pendingStatus.summaries.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {pendingStatus.summaries.slice(0, 4).map((s, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-300">• {s}</li>
                ))}
                {pendingStatus.summaries.length > 4 && (
                  <li className="text-xs text-amber-600 dark:text-amber-400 italic">
                    ...and {pendingStatus.summaries.length - 4} more
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRefreshStatus} disabled={checkingSync}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSyncPending}
              disabled={syncing}
            >
              <CloudUpload className="h-3 w-3 mr-1" />
              {syncing ? `Syncing ${syncProgress?.current || 0}/${syncProgress?.total || 0}...` : "Sync Now"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    const gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3";

    // Level 0: Month-Year
    if (currentLevel === 0) {
      if (filteredGroups.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-12">No booked events found.</p>;
      }
      return (
        <div className={gridClass}>
          {filteredGroups.map(g => {
            const match = pcloudItems.find(p => p.isfolder && p.name === g.label);
            return (
              <XitoDriveFolderCard key={g.key} name={g.label} itemCount={g.clients.length} type="month-year" pcloudFolderId={match?.folderid} folderSizeGB={getFolderSize(g.label)} onClick={() => navigate(g.label, g.label)} />
            );
          })}
        </div>
      );
    }

    // Level 1: Clients
    if (currentLevel === 1 && currentGroup) {
      return (
        <div className={gridClass}>
          {currentGroup.clients.map(c => {
            const match = pcloudItems.find(p => p.isfolder && p.name === c.clientName);
            return (
              <XitoDriveFolderCard key={c.registeredDateTimeAD} name={c.clientName} itemCount={PCLOUD_CATEGORIES.length} type="client" pcloudFolderId={match?.folderid} folderSizeGB={getFolderSize(c.clientName)} onClick={() => navigate(c.clientName, c.registeredDateTimeAD)} />
            );
          })}
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" pcloudFolderId={f.folderid} onClick={() => navigate(f.name, f.name)} />
          ))}
        </div>
      );
    }

    // Level 2: Categories (Photos, Videos)
    if (currentLevel === 2) {
      return (
        <div className={gridClass}>
          {PCLOUD_CATEGORIES.map(cat => {
            const match = pcloudItems.find(p => p.isfolder && p.name === cat.name);
            return (
              <XitoDriveFolderCard key={cat.name} name={cat.name} type="category" categoryName={cat.name} pcloudFolderId={match?.folderid} onClick={() => navigate(cat.name, cat.name)} />
            );
          })}
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" pcloudFolderId={f.folderid} onClick={() => navigate(f.name, f.name)} />
          ))}
        </div>
      );
    }

    // Level 3: Inside category
    if (currentLevel === 3 && currentClientFolder) {
      if (selectedCategory === "Photos") {
        const items = [...currentClientFolder.events, "Selected"];
        return (
          <div className={gridClass}>
            {items.map(ev => {
              const freelancers = ev !== "Selected" ? getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, ev) : { photographers: [] };
              return (
                <XitoDriveFolderCard key={ev} name={ev} itemCount={ev === "Selected" ? undefined : freelancers.photographers.length || undefined} type="event" categoryName="Photos" onClick={() => navigate(ev, ev)} />
              );
            })}
            {extraPCloudFolders.map(f => (
              <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
            ))}
          </div>
        );
      }
      if (selectedCategory === "Videos") {
        return (
          <div className={gridClass}>
            {getVideoSubfolders().map(sub => (
              <XitoDriveFolderCard key={sub} name={sub} type="leaf" categoryName="Videos" onClick={() => navigate(sub, sub)} />
            ))}
            {extraPCloudFolders.map(f => (
              <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
            ))}
          </div>
        );
      }
    }

    // Level 4: Photographers under Photos > Event
    if (currentLevel === 4 && currentClientFolder && selectedCategory === "Photos" && selectedEvent !== "Selected") {
      const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
      return (
        <div className={gridClass}>
          {photographers.map(name => (
            <XitoDriveFolderCard key={name} name={name} type="freelancer" onClick={() => navigate(name, name)} />
          ))}
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
          ))}
          {pcloudFiles.map(file => (
            <XitoDriveFolderCard key={file.fileid} name={file.name} type="file" fileSize={file.size} onClick={() => handleFileClick(file)} />
          ))}
        </div>
      );
    }

    // Leaf: show pCloud contents
    return (
      <div className="space-y-3">
        <div className={gridClass}>
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
          ))}
          {pcloudFiles.map(file => (
            <XitoDriveFolderCard key={file.fileid} name={file.name} type="file" fileSize={file.size} onClick={() => handleFileClick(file)} />
          ))}
        </div>
        {pcloudFiles.length === 0 && extraPCloudFolders.length === 0 && !pcloudLoading && (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground text-sm">This folder is empty.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Pending sync banner */}
      {renderPendingBanner()}

      <div className="flex flex-wrap items-center gap-2">
        {currentLevel === 0 && (
          <>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Object.entries(NEPALI_MONTHS).map(([num, name]) => <SelectItem key={num} value={num}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleRecalculateSizes} disabled={calculatingSizes}>
            <Calculator className={`h-3.5 w-3.5 mr-1 ${calculatingSizes ? 'animate-spin' : ''}`} />
            {calculatingSizes ? 'Calculating...' : 'Recalculate Sizes'}
          </Button>
          <Button variant="outline" size="sm" className="text-xs" disabled={currentLevel === 0} onClick={handleCreateFolder}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> New Folder
          </Button>
          <Button variant="outline" size="sm" className="text-xs" disabled={currentLevel === 0 || currentFolderId === null} onClick={handleUpload}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Upload
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm flex-wrap bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
        <button onClick={() => navigateTo(-1)} className="flex items-center gap-1 text-primary hover:underline font-medium">
          <Cloud className="h-4 w-4" />
          {PCLOUD_ROOT}
        </button>
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button onClick={() => navigateTo(i)} className={`hover:underline ${i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-primary"}`}>
              {seg.label}
            </button>
          </span>
        ))}
        {pcloudLoading && <span className="ml-2 text-[10px] text-muted-foreground animate-pulse">loading...</span>}
      </div>

      {renderContent()}
    </div>
  );
}
