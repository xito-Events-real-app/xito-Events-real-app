import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronRight, HardDrive, FolderPlus, Upload, RefreshCw, Loader2, CheckCircle2, ImageIcon, HardDriveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { XitoDriveFolderCard } from "./XitoDriveFolderCard";
import { XitoDrivePhotoGallery } from "./XitoDrivePhotoGallery";
import { XitoUploadPreDialog } from "./XitoUploadPreDialog";
import { useXitoDriveUploadContext } from "@/contexts/XitoDriveUploadContext";
import {
  MonthYearGroup,
  buildMonthYearGroups,
  getUniqueYears,
  getFreelancersForEvent,
  FreelancerAssignment,
} from "@/lib/xito-drive-utils";
import { listE2Folder, createE2Folder, getE2FileUrl, E2File } from "@/lib/idrive-e2-api";
import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { checkE2SyncStatus, syncE2PendingFolders } from "@/lib/e2-sync";
import { PendingSyncStatus, SyncProgress } from "@/lib/pcloud-sync";
import { toast } from "sonner";

interface Props {
  clients: BookedClientData[];
  assignments: FreelancerAssignment[];
  isLoading: boolean;
}

type BreadcrumbSegment = { label: string; level: string };

/**
 * XITO DRIVE — Photos only (iDrive E2).
 * Level 0: Month-Year groups
 * Level 1: Clients
 * Level 2: Events + Selected (skip category level since Photos is the only one)
 * Level 3: Photographers
 * Level 4+: Leaf
 */
export function XitoDriveBrowser({ clients, assignments, isLoading }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [e2Files, setE2Files] = useState<E2File[]>([]);
  const [e2Folders, setE2Folders] = useState<string[]>([]);
  const [e2Loading, setE2Loading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<PendingSyncStatus | null>(null);
  const [syncChecking, setSyncChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { startUpload, activeCount: uploadActiveCount } = useXitoDriveUploadContext();
  const groups = useMemo(() => buildMonthYearGroups(clients), [clients]);
  const uniqueYears = useMemo(() => getUniqueYears(groups), [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (yearFilter !== "all" && g.year !== yearFilter) return false;
      if (monthFilter !== "all" && g.month !== monthFilter) return false;
      return true;
    });
  }, [groups, yearFilter, monthFilter]);

  // Check sync status when data loads
  useEffect(() => {
    if (clients.length === 0 || assignments.length === 0 || isLoading) return;
    setSyncChecking(true);
    checkE2SyncStatus(clients, assignments)
      .then(status => setSyncStatus(status))
      .catch(err => console.warn("E2 sync check failed:", err))
      .finally(() => setSyncChecking(false));
  }, [clients, assignments, isLoading]);

  const handleSync = useCallback(async () => {
    if (!syncStatus || syncStatus.pending === 0) return;
    setSyncing(true);
    setSyncProgress({ current: 0, total: syncStatus.pending, currentPath: "" });
    try {
      const result = await syncE2PendingFolders(syncStatus.paths, (p) => setSyncProgress(p));
      toast.success(`Synced ${result.created} folders${result.errors.length ? `, ${result.errors.length} errors` : ""}`);
      setSyncStatus({ pending: 0, paths: [], summaries: [] });
    } catch (err) {
      toast.error("Sync failed");
      console.error(err);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [syncStatus]);

  const currentLevel = breadcrumb.length;
  const selectedGroupKey = breadcrumb[0]?.level;
  const selectedClient = breadcrumb[1]?.label;
  const selectedEvent = breadcrumb[2]?.label; // Level 2 is now events (Photos is implicit)

  const currentGroup = groups.find(g => g.key === selectedGroupKey);
  const currentClientFolder = currentGroup?.clients.find(c => c.clientName === selectedClient);

  // Build S3 prefix — use label (e.g. "MAGH EVENTS 2082") instead of numeric key
  const currentS3Prefix = useMemo(() => {
    if (breadcrumb.length === 0) return "";
    const segments: string[] = [];
    // Level 0 uses the label directly (e.g. "MAGH EVENTS 2082")
    if (breadcrumb[0]) segments.push(breadcrumb[0].label.replace(/[/\\]/g, "_"));
    if (breadcrumb[1]) segments.push(breadcrumb[1].label.replace(/[/\\]/g, "_"));
    // Insert Photos folder implicitly
    if (breadcrumb.length >= 2) segments.push("Photos");
    for (let i = 2; i < breadcrumb.length; i++) {
      segments.push(breadcrumb[i].label.replace(/[/\\]/g, "_"));
    }
    return segments.join("/") + "/";
  }, [breadcrumb]);

  useEffect(() => {
    if (breadcrumb.length === 0) {
      setE2Files([]);
      setE2Folders([]);
      return;
    }
    let cancelled = false;
    setE2Loading(true);
    setE2Files([]);
    setE2Folders([]);
    listE2Folder(currentS3Prefix)
      .then(result => {
        if (!cancelled) {
          setE2Files(result.files);
          setE2Folders(result.folders);
        }
      })
      .catch(err => {
        console.warn("E2 list failed:", err);
        if (!cancelled) {
          setE2Files([]);
          setE2Folders([]);
        }
      })
      .finally(() => { if (!cancelled) setE2Loading(false); });
    return () => { cancelled = true; };
  }, [currentS3Prefix, breadcrumb.length]);

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
      await createE2Folder(currentS3Prefix + name.trim());
      toast.success(`Folder "${name.trim()}" created`);
      const result = await listE2Folder(currentS3Prefix);
      setE2Files(result.files);
      setE2Folders(result.folders);
    } catch (err) {
      toast.error("Failed to create folder");
      console.error(err);
    }
  }, [currentS3Prefix]);

  const handleUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      const fileList = input.files;
      if (!fileList?.length) return;
      setPendingFiles(Array.from(fileList));
      setUploadDialogOpen(true);
    };
    input.click();
  }, []);

  // Derive metadata from breadcrumb
  const uploadShotBy = breadcrumb[3]?.label || breadcrumb[2]?.label || "";
  const uploadEventName = breadcrumb[2]?.label || "";
  const uploadClientName = breadcrumb[1]?.label || "";
  const uploadEventDate = useMemo(() => {
    if (!currentClientFolder) return "";
    // Get event date from clients data
    const client = clients.find(c => c.registered_date_time_ad === currentClientFolder.registeredDateTimeAD);
    return client?.event_date_ad || "";
  }, [currentClientFolder, clients]);
  const uploadDaysAgo = useMemo(() => {
    if (!uploadEventDate) return null;
    const d = new Date(uploadEventDate);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }, [uploadEventDate]);

  const handleUploadConfirm = useCallback(async () => {
    setUploadDialogOpen(false);
    await startUpload(pendingFiles, {
      shotBy: uploadShotBy,
      eventName: uploadEventName,
      eventDate: uploadEventDate,
      expectedCount: pendingFiles.length,
      folderPrefix: currentS3Prefix,
    });
    setPendingFiles([]);
    setTimeout(async () => {
      try {
        const result = await listE2Folder(currentS3Prefix);
        setE2Files(result.files);
        setE2Folders(result.folders);
      } catch {}
    }, 2000);
  }, [pendingFiles, currentS3Prefix, startUpload, uploadShotBy, uploadEventName, uploadEventDate]);

  const handleFileClick = useCallback(async (file: E2File) => {
    try {
      const url = await getE2FileUrl(file.key);
      window.open(url, "_blank");
    } catch (err) {
      toast.error("Failed to get file URL");
      console.error(err);
    }
  }, []);

  // Virtual folder names at current level
  const virtualFolderNames = useMemo(() => {
    const names = new Set<string>();
    if (currentLevel === 0) {
      filteredGroups.forEach(g => names.add(g.key));
    } else if (currentLevel === 1 && currentGroup) {
      currentGroup.clients.forEach(c => names.add(c.clientName));
    } else if (currentLevel === 2 && currentClientFolder) {
      // Events + Selected (Photos is implicit)
      [...currentClientFolder.events, "Selected"].forEach(e => names.add(e));
    } else if (currentLevel === 3 && currentClientFolder && selectedEvent !== "Selected") {
      const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
      photographers.forEach(p => names.add(p));
    }
    return names;
  }, [currentLevel, filteredGroups, currentGroup, currentClientFolder, selectedEvent, assignments]);

  const extraE2Folders = useMemo(() => {
    return e2Folders
      .map(f => f.replace(currentS3Prefix, "").replace(/\/$/, ""))
      .filter(name => name && !virtualFolderNames.has(name));
  }, [e2Folders, currentS3Prefix, virtualFolderNames]);

  const hasImageFiles = useMemo(() => {
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic"];
    return e2Files.some(f => {
      const ext = f.key.split(".").pop()?.toLowerCase() || "";
      return imageExts.includes(ext);
    });
  }, [e2Files]);

  const renderE2Files = () => {
    if (e2Files.length === 0 && extraE2Folders.length === 0) return null;
    if (hasImageFiles) {
      return (
        <>
          {extraE2Folders.map(folderName => (
            <XitoDriveFolderCard key={`e2-folder-${folderName}`} name={folderName} type="leaf" onClick={() => navigate(folderName, folderName)} />
          ))}
        </>
      );
    }
    return (
      <>
        {extraE2Folders.map(folderName => (
          <XitoDriveFolderCard key={`e2-folder-${folderName}`} name={folderName} type="leaf" onClick={() => navigate(folderName, folderName)} />
        ))}
        {e2Files.map(file => {
          const fileName = file.key.split("/").pop() || file.key;
          return (
            <XitoDriveFolderCard key={`e2-file-${file.key}`} name={fileName} type="file" fileSize={file.size} onClick={() => handleFileClick(file)} />
          );
        })}
      </>
    );
  };

  const renderPhotoGallery = () => {
    if (!hasImageFiles || e2Files.length === 0) return null;
    return <XitoDrivePhotoGallery files={e2Files} prefix={currentS3Prefix} />;
  };

  const renderLeafContent = () => (
    <div className="space-y-3">
      {extraE2Folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {renderE2Files()}
        </div>
      )}
      {renderPhotoGallery()}
      {!hasImageFiles && e2Files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {renderE2Files()}
        </div>
      )}
      {e2Files.length === 0 && extraE2Folders.length === 0 && !e2Loading && (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">This folder is empty. Use Upload or New Folder above.</p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    // Level 0: Month-Year folders
    if (currentLevel === 0) {
      if (filteredGroups.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-12">No booked events found.</p>;
      }
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredGroups.map(g => (
            <XitoDriveFolderCard key={g.key} name={g.label} itemCount={g.clients.length} type="month-year" onClick={() => navigate(g.label, g.key)} />
          ))}
        </div>
      );
    }

    // Level 1: Client folders
    if (currentLevel === 1 && currentGroup) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {currentGroup.clients.map(c => (
            <XitoDriveFolderCard key={c.registeredDateTimeAD} name={c.clientName} itemCount={c.events.length + 1} type="client" onClick={() => navigate(c.clientName, c.registeredDateTimeAD)} />
          ))}
          {renderE2Files()}
        </div>
      );
    }

    // Level 2: Events + Selected (Photos is implicit — no category level)
    if (currentLevel === 2 && currentClientFolder) {
      const items = [...currentClientFolder.events, "Selected"];
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map(ev => {
            const freelancers = ev !== "Selected"
              ? getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, ev)
              : { photographers: [], videographers: [] };
            return (
              <XitoDriveFolderCard key={ev} name={ev} itemCount={ev === "Selected" ? undefined : freelancers.photographers.length || undefined} type="event" categoryName="Photos" onClick={() => navigate(ev, ev)} />
            );
          })}
          {renderE2Files()}
        </div>
      );
    }

    // Level 3: Photographer folders
    if (currentLevel === 3 && currentClientFolder && selectedEvent !== "Selected") {
      const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {photographers.map(name => (
              <XitoDriveFolderCard key={name} name={name} type="freelancer" onClick={() => navigate(name, name)} />
            ))}
            {renderE2Files()}
          </div>
          {renderPhotoGallery()}
          {photographers.length === 0 && e2Files.length === 0 && extraE2Folders.length === 0 && !e2Loading && (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-sm">No freelancers assigned. Use Upload or New Folder above.</p>
            </div>
          )}
        </div>
      );
    }

    // Level 3+ (Selected) or Level 4+ (leaf)
    return renderLeafContent();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {currentLevel === 0 && (
          <>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Object.entries(NEPALI_MONTHS).map(([num, name]) => (
                  <SelectItem key={num} value={num}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" disabled={currentLevel === 0} onClick={handleCreateFolder}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> New Folder
          </Button>
          <Button variant="outline" size="sm" className="text-xs" disabled={currentLevel === 0 || uploadActiveCount > 0} onClick={handleUpload}>
            <Upload className="h-3.5 w-3.5 mr-1" /> {uploadActiveCount > 0 ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {/* Folder info bar */}
      {currentLevel > 0 && !e2Loading && (e2Files.length > 0 || e2Folders.length > 0) && (
        <div className="flex items-center gap-3 flex-wrap bg-muted/30 rounded-xl px-4 py-2.5 border border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardDriveIcon className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {(e2Files.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{e2Files.length} photos</span>
          </div>
          {uploadActiveCount > 0 && (
            <>
              <span className="text-border">•</span>
              <span className="text-xs text-primary font-medium animate-pulse">
                {uploadActiveCount} remaining to upload
              </span>
            </>
          )}
        </div>
      )}

      {/* Upload Pre-Dialog */}
      <XitoUploadPreDialog
        open={uploadDialogOpen}
        onClose={() => { setUploadDialogOpen(false); setPendingFiles([]); }}
        onConfirm={handleUploadConfirm}
        fileCount={pendingFiles.length}
        folderPath={currentS3Prefix}
        shotBy={uploadShotBy}
        eventName={uploadEventName}
        clientName={uploadClientName}
        eventDate={uploadEventDate}
        daysAgo={uploadDaysAgo}
      />

      {/* Sync Banner */}
      {syncStatus && syncStatus.pending > 0 && !syncing && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <RefreshCw className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">{syncStatus.pending} pending changes</p>
            <p className="text-xs text-amber-300/60 truncate">
              {syncStatus.summaries.slice(0, 2).join(" · ")}
              {syncStatus.summaries.length > 2 && ` +${syncStatus.summaries.length - 2} more`}
            </p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs shrink-0" onClick={handleSync}>
            Sync Now
          </Button>
        </div>
      )}
      {syncing && syncProgress && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-primary">Syncing {syncProgress.current}/{syncProgress.total}...</span>
          </div>
          <Progress value={(syncProgress.current / syncProgress.total) * 100} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground truncate">{syncProgress.currentPath}</p>
        </div>
      )}
      {syncStatus && syncStatus.pending === 0 && !syncChecking && !syncing && syncStatus.paths !== undefined && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">All folders synced</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
        <button onClick={() => navigateTo(-1)} className="flex items-center gap-1 text-primary hover:underline font-medium">
          <HardDrive className="h-4 w-4" />
          XITO DRIVE
        </button>
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => navigateTo(i)}
              className={`hover:underline ${i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-primary"}`}
            >
              {seg.label}
            </button>
          </span>
        ))}
        {e2Loading && <span className="ml-2 text-[10px] text-muted-foreground animate-pulse">loading files...</span>}
      </div>

      {renderContent()}
    </div>
  );
}
