import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronRight, HardDrive, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XitoDriveFolderCard } from "./XitoDriveFolderCard";
import { XitoDrivePhotoGallery } from "./XitoDrivePhotoGallery";
import {
  MonthYearGroup,
  buildMonthYearGroups,
  getUniqueYears,
  getClientCategories,
  getVideoSubfolders,
  getFreelancersForEvent,
  FreelancerAssignment,
} from "@/lib/xito-drive-utils";
import { listE2Folder, createE2Folder, uploadToE2, getE2FileUrl, E2File } from "@/lib/idrive-e2-api";
import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";
import { toast } from "sonner";

interface Props {
  clients: BookedClientData[];
  assignments: FreelancerAssignment[];
  isLoading: boolean;
}

type BreadcrumbSegment = { label: string; level: string };

export function XitoDriveBrowser({ clients, assignments, isLoading }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [e2Files, setE2Files] = useState<E2File[]>([]);
  const [e2Folders, setE2Folders] = useState<string[]>([]);
  const [e2Loading, setE2Loading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number }[]>([]);

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

  // Build S3 prefix from breadcrumb
  const currentS3Prefix = useMemo(() => {
    if (breadcrumb.length === 0) return "";
    const segments: string[] = [];
    // Level 0: month-year group key (e.g. "2082-10")
    if (breadcrumb[0]) segments.push(breadcrumb[0].level);
    // Level 1+: use labels
    for (let i = 1; i < breadcrumb.length; i++) {
      segments.push(breadcrumb[i].label.replace(/[/\\]/g, "_"));
    }
    return segments.join("/") + "/";
  }, [breadcrumb]);

  // Fetch E2 contents when navigating
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
      // Refresh listing
      const result = await listE2Folder(currentS3Prefix);
      setE2Files(result.files);
      setE2Folders(result.folders);
    } catch (err) {
      toast.error("Failed to create folder");
      console.error(err);
    }
  }, [currentS3Prefix]);

  const handleUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const fileList = input.files;
      if (!fileList?.length) return;
      const filesToUpload = Array.from(fileList);
      setUploading(true);
      setUploadProgress(filesToUpload.map(f => ({ name: f.name, percent: 0 })));
      try {
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          await uploadToE2(currentS3Prefix, file, (percent) => {
            setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, percent } : p));
          });
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, percent: 100 } : p));
        }
        toast.success(`Uploaded ${filesToUpload.length} file(s)`);
        const result = await listE2Folder(currentS3Prefix);
        setE2Files(result.files);
        setE2Folders(result.folders);
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress([]), 2000);
      }
    };
    input.click();
  }, [currentS3Prefix]);

  const handleFileClick = useCallback(async (file: E2File) => {
    try {
      const url = await getE2FileUrl(file.key);
      window.open(url, "_blank");
    } catch (err) {
      toast.error("Failed to get file URL");
      console.error(err);
    }
  }, []);

  // Compute virtual folder names at current level to filter duplicates from E2
  const virtualFolderNames = useMemo(() => {
    const names = new Set<string>();
    if (currentLevel === 0) {
      filteredGroups.forEach(g => names.add(g.key));
    } else if (currentLevel === 1 && currentGroup) {
      currentGroup.clients.forEach(c => names.add(c.clientName));
    } else if (currentLevel === 2) {
      getClientCategories().forEach(cat => names.add(cat.name));
    } else if (currentLevel === 3 && currentClientFolder) {
      if (selectedCategory === "Photos") {
        [...currentClientFolder.events, "Selected"].forEach(e => names.add(e));
      } else if (selectedCategory === "Videos") {
        getVideoSubfolders().forEach(s => names.add(s));
      } else if (selectedCategory === "Project Managers" || selectedCategory === "Lightroom Catalog") {
        currentClientFolder.events.forEach(e => names.add(e));
      }
    } else if (currentLevel === 4 && currentClientFolder && (selectedCategory === "Photos" || selectedCategory === "Lightroom Catalog") && selectedEvent !== "Selected") {
      const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
      photographers.forEach(p => names.add(p));
    }
    return names;
  }, [currentLevel, filteredGroups, currentGroup, currentClientFolder, selectedCategory, selectedEvent, assignments]);

  // Extra folders from E2 that aren't virtual
  const extraE2Folders = useMemo(() => {
    return e2Folders
      .map(f => {
        const stripped = f.replace(currentS3Prefix, "").replace(/\/$/, "");
        return stripped;
      })
      .filter(name => name && !virtualFolderNames.has(name));
  }, [e2Folders, currentS3Prefix, virtualFolderNames]);

  // Check if current files contain images (for gallery view)
  const hasImageFiles = useMemo(() => {
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic"];
    return e2Files.some(f => {
      const ext = f.key.split(".").pop()?.toLowerCase() || "";
      return imageExts.includes(ext);
    });
  }, [e2Files]);

  const renderE2Files = () => {
    if (e2Files.length === 0 && extraE2Folders.length === 0) return null;

    // If we have image files, use the photo gallery
    if (hasImageFiles) {
      return (
        <>
          {extraE2Folders.map(folderName => (
            <XitoDriveFolderCard
              key={`e2-folder-${folderName}`}
              name={folderName}
              type="leaf"
              onClick={() => navigate(folderName, folderName)}
            />
          ))}
        </>
      );
    }

    return (
      <>
        {extraE2Folders.map(folderName => (
          <XitoDriveFolderCard
            key={`e2-folder-${folderName}`}
            name={folderName}
            type="leaf"
            onClick={() => navigate(folderName, folderName)}
          />
        ))}
        {e2Files.map(file => {
          const fileName = file.key.split("/").pop() || file.key;
          return (
            <XitoDriveFolderCard
              key={`e2-file-${file.key}`}
              name={fileName}
              type="file"
              fileSize={file.size}
              onClick={() => handleFileClick(file)}
            />
          );
        })}
      </>
    );
  };

  // Render photo gallery separately for image-containing folders
  const renderPhotoGallery = () => {
    if (!hasImageFiles || e2Files.length === 0) return null;
    return <XitoDrivePhotoGallery files={e2Files} prefix={currentS3Prefix} />;
  };

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
            <XitoDriveFolderCard key={c.registeredDateTimeAD} name={c.clientName} itemCount={6} type="client" onClick={() => navigate(c.clientName, c.registeredDateTimeAD)} />
          ))}
          {renderE2Files()}
        </div>
      );
    }

    // Level 2: Category folders
    if (currentLevel === 2) {
      const categories = getClientCategories();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {categories.map(cat => {
            let count: number | undefined;
            if (cat.name === "Photos" || cat.name === "Project Managers" || cat.name === "Lightroom Catalog") {
              count = (currentClientFolder?.events.length || 0) + (cat.name === "Photos" ? 1 : 0);
            } else if (cat.name === "Videos") {
              count = 3;
            }
            return (
              <XitoDriveFolderCard key={cat.name} name={cat.name} itemCount={count} type="category" categoryName={cat.name} onClick={() => navigate(cat.name, cat.name)} />
            );
          })}
          {renderE2Files()}
        </div>
      );
    }

    // Level 3: Inside a category
    if (currentLevel === 3 && currentClientFolder) {
      if (selectedCategory === "Photos") {
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

      if (selectedCategory === "Videos") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {getVideoSubfolders().map(sub => (
              <XitoDriveFolderCard key={sub} name={sub} type="leaf" categoryName="Videos" onClick={() => navigate(sub, sub)} />
            ))}
            {renderE2Files()}
          </div>
        );
      }

      if (selectedCategory === "Project Managers") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentClientFolder.events.map(ev => (
              <XitoDriveFolderCard key={ev} name={ev} type="leaf" categoryName="Project Managers" onClick={() => navigate(ev, ev)} />
            ))}
            {renderE2Files()}
          </div>
        );
      }

      if (selectedCategory === "Lightroom Catalog") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentClientFolder.events.map(ev => {
              const freelancers = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, ev);
              return (
                <XitoDriveFolderCard key={ev} name={ev} itemCount={freelancers.photographers.length || undefined} type="event" categoryName="Lightroom Catalog" onClick={() => navigate(ev, ev)} />
              );
            })}
            {renderE2Files()}
          </div>
        );
      }

      // Quotation / Payments: show E2 files only
      return (
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
    }

    // Level 4: Inside event under Photos/Lightroom -> freelancer folders
    if (currentLevel === 4 && currentClientFolder) {
      if ((selectedCategory === "Photos" || selectedCategory === "Lightroom Catalog") && selectedEvent !== "Selected") {
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

      return (
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
    }

    // Level 5+: Leaf - show only E2 content
    return (
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
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={currentLevel === 0}
            onClick={handleCreateFolder}
          >
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> New Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={currentLevel === 0 || uploading}
            onClick={handleUpload}
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

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

      {/* Content */}
      {renderContent()}
    </div>
  );
}
