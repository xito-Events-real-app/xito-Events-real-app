import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronRight, Cloud, FolderPlus, Upload, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XitoDriveFolderCard } from "@/components/xito-drive/XitoDriveFolderCard";
import {
  MonthYearGroup,
  buildMonthYearGroups,
  getUniqueYears,
  getFreelancersForEvent,
  getVideoSubfolders,
  PCLOUD_CATEGORIES,
  FreelancerAssignment,
} from "@/lib/xito-drive-utils";
import {
  listPCloudFolderByPath,
  createPCloudFolderByPath,
  uploadToPCloud,
  getPCloudFileLink,
  PCloudItem,
  formatPCloudSize,
  isPCloudImage,
} from "@/lib/pcloud-api";
import { syncPCloudDriveFolders } from "@/lib/pcloud-sync";
import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { toast } from "sonner";

interface Props {
  clients: BookedClientData[];
  assignments: FreelancerAssignment[];
  isLoading: boolean;
}

type BreadcrumbSegment = { label: string; level: string };

/**
 * pCloud Drive — Photos + Videos browser.
 * Browses pCloud under /wedding-tales-nepal.
 */
export function PCloudDriveBrowser({ clients, assignments, isLoading }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [pcloudItems, setPcloudItems] = useState<PCloudItem[]>([]);
  const [pcloudLoading, setPcloudLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

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
  const selectedGroupKey = breadcrumb[0]?.level;
  const selectedClient = breadcrumb[1]?.label;
  const selectedCategory = breadcrumb[2]?.label;
  const selectedEvent = breadcrumb[3]?.label;

  const currentGroup = groups.find(g => g.key === selectedGroupKey);
  const currentClientFolder = currentGroup?.clients.find(c => c.clientName === selectedClient);

  // Build pCloud path
  const currentPCloudPath = useMemo(() => {
    const segments = ["wedding-tales-nepal"];
    if (breadcrumb[0]) segments.push(breadcrumb[0].level);
    for (let i = 1; i < breadcrumb.length; i++) {
      segments.push(breadcrumb[i].label.replace(/[/\\]/g, "_"));
    }
    return "/" + segments.join("/");
  }, [breadcrumb]);

  // Fetch pCloud contents when navigating deeper than root
  useEffect(() => {
    if (breadcrumb.length === 0) {
      setPcloudItems([]);
      return;
    }
    let cancelled = false;
    setPcloudLoading(true);
    setPcloudItems([]);
    listPCloudFolderByPath(currentPCloudPath)
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
    if (currentFolderId === null) {
      toast.error("Navigate to a folder first");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const fileList = input.files;
      if (!fileList?.length) return;
      try {
        for (const file of Array.from(fileList)) {
          await uploadToPCloud(currentFolderId, file);
        }
        toast.success(`Uploaded ${fileList.length} file(s)`);
        const result = await listPCloudFolderByPath(currentPCloudPath);
        setPcloudItems(result.contents);
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      }
    };
    input.click();
  }, [currentFolderId, currentPCloudPath]);

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

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    const toastId = toast.loading("Syncing folders to pCloud...");
    try {
      const { created, errors } = await syncPCloudDriveFolders(clients, assignments, (p) => {
        setSyncProgress({ current: p.current, total: p.total });
      });
      toast.dismiss(toastId);
      toast.success(errors.length === 0 ? `Synced ${created} folders` : `Synced ${created}, ${errors.length} failed`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync failed");
      console.error(err);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [syncing, clients, assignments]);

  // Virtual folder names at current level
  const virtualFolderNames = useMemo(() => {
    const names = new Set<string>();
    if (currentLevel === 0) {
      filteredGroups.forEach(g => names.add(g.key));
    } else if (currentLevel === 1 && currentGroup) {
      currentGroup.clients.forEach(c => names.add(c.clientName));
    } else if (currentLevel === 2) {
      PCLOUD_CATEGORIES.forEach(cat => names.add(cat.name));
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
          {filteredGroups.map(g => (
            <XitoDriveFolderCard key={g.key} name={g.label} itemCount={g.clients.length} type="month-year" onClick={() => navigate(g.label, g.key)} />
          ))}
        </div>
      );
    }

    // Level 1: Clients
    if (currentLevel === 1 && currentGroup) {
      return (
        <div className={gridClass}>
          {currentGroup.clients.map(c => (
            <XitoDriveFolderCard key={c.registeredDateTimeAD} name={c.clientName} itemCount={PCLOUD_CATEGORIES.length} type="client" onClick={() => navigate(c.clientName, c.registeredDateTimeAD)} />
          ))}
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
          ))}
        </div>
      );
    }

    // Level 2: Categories (Photos, Videos)
    if (currentLevel === 2) {
      return (
        <div className={gridClass}>
          {PCLOUD_CATEGORIES.map(cat => (
            <XitoDriveFolderCard key={cat.name} name={cat.name} type="category" categoryName={cat.name} onClick={() => navigate(cat.name, cat.name)} />
          ))}
          {extraPCloudFolders.map(f => (
            <XitoDriveFolderCard key={f.name} name={f.name} type="leaf" onClick={() => navigate(f.name, f.name)} />
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
          <Button variant="outline" size="sm" className="text-xs" disabled={syncing} onClick={handleSync}>
            <CloudUpload className="h-3.5 w-3.5 mr-1" />
            {syncing ? `Syncing ${syncProgress?.current || 0}/${syncProgress?.total || 0}...` : "Sync Folders"}
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
          pCloud
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
