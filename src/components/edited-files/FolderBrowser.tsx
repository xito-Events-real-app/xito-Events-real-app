import { useState, useEffect } from "react";
import {
  getEditedFilesClients,
  getEditedFilesForClient,
  deleteEditedFile,
  getEditedFileUrl,
  formatFileSize,
  EditedFile,
} from "@/lib/edited-files-api";
import { ClientLinksSection } from "./ClientLinksSection";
import { Button } from "@/components/ui/button";
import { Folder, FileImage, FileVideo, ArrowLeft, Download, Trash2, Link2, LayoutGrid, List } from "lucide-react";
import { FilePreviewCard } from "./FilePreviewCard";
import { toast } from "@/hooks/use-toast";

interface ClientFolder {
  registered_date_time_ad: string;
  client_name: string;
  file_count: number;
  total_size: number;
}

type BreadcrumbLevel = 'root' | 'client' | 'type' | 'event' | 'side';

export function FolderBrowser() {
  const [clientFolders, setClientFolders] = useState<ClientFolder[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientFolder | null>(null);
  const [clientFiles, setClientFiles] = useState<EditedFile[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<{ level: BreadcrumbLevel; label: string }[]>([
    { level: 'root', label: 'All Clients' },
  ]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [filterSide, setFilterSide] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const loadClients = async () => {
    const data = await getEditedFilesClients();
    setClientFolders(data);
  };

  useEffect(() => { loadClients(); }, []);

  const openClient = async (client: ClientFolder) => {
    setSelectedClient(client);
    const files = await getEditedFilesForClient(client.registered_date_time_ad);
    setClientFiles(files);
    setFilterType(null);
    setFilterEvent(null);
    setFilterSide(null);
    setShowLinks(false);
    setBreadcrumb([
      { level: 'root', label: 'All Clients' },
      { level: 'client', label: client.client_name },
    ]);
  };

  const navigateTo = (level: BreadcrumbLevel) => {
    if (level === 'root') {
      setSelectedClient(null);
      setClientFiles([]);
      setFilterType(null);
      setFilterEvent(null);
      setFilterSide(null);
      setShowLinks(false);
      setBreadcrumb([{ level: 'root', label: 'All Clients' }]);
    } else if (level === 'client') {
      setFilterType(null);
      setFilterEvent(null);
      setFilterSide(null);
      setShowLinks(false);
      setBreadcrumb(prev => prev.slice(0, 2));
    } else if (level === 'type') {
      setFilterEvent(null);
      setFilterSide(null);
      setBreadcrumb(prev => prev.slice(0, 3));
    } else if (level === 'event') {
      setFilterSide(null);
      setBreadcrumb(prev => prev.slice(0, 4));
    }
  };

  const selectType = (type: string) => {
    if (type === 'links') {
      setShowLinks(true);
      setBreadcrumb(prev => [...prev, { level: 'type', label: 'Links' }]);
      return;
    }
    setShowLinks(false);
    setFilterType(type);
    setBreadcrumb(prev => [...prev, { level: 'type', label: type === 'photo' ? 'Photos' : 'Videos' }]);
  };

  const selectEvent = (eventName: string) => {
    setFilterEvent(eventName);
    setBreadcrumb(prev => [...prev, { level: 'event', label: eventName }]);
  };

  const selectSide = (side: string) => {
    setFilterSide(side);
    setBreadcrumb(prev => [...prev, { level: 'side', label: side }]);
  };

  const handleDelete = async (file: EditedFile) => {
    const ok = await deleteEditedFile(file.id, file.storage_path);
    if (ok) {
      toast({ title: "File deleted" });
      setClientFiles(prev => prev.filter(f => f.id !== file.id));
      loadClients();
    }
  };

  // Filtered files based on current drill-down
  let displayFiles = clientFiles;
  if (filterType) displayFiles = displayFiles.filter(f => f.file_type === filterType);
  if (filterEvent) displayFiles = displayFiles.filter(f => f.folder_event_name === filterEvent);
  if (filterSide) displayFiles = displayFiles.filter(f => f.side_folder === filterSide);

  // Unique sub-folders at current level
  const uniqueEvents = [...new Set(displayFiles.map(f => f.folder_event_name).filter(Boolean))];
  const uniqueSides = [...new Set(displayFiles.map(f => f.side_folder).filter(Boolean))];

  const currentLevel = breadcrumb[breadcrumb.length - 1].level;

  // Check if client has links
  const hasLinksSection = selectedClient && showLinks;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">\</span>}
            <button
              onClick={() => navigateTo(b.level)}
              className={`hover:text-primary transition-colors ${
                i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              {b.label}
            </button>
          </span>
        ))}
      </div>

      {/* Root level: Client folders */}
      {currentLevel === 'root' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {clientFolders.map(cf => (
            <button
              key={cf.registered_date_time_ad}
              onClick={() => openClient(cf)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
            >
              <Folder className="h-10 w-10 text-amber-500" />
              <span className="text-sm font-medium text-center truncate w-full">{cf.client_name}</span>
              <span className="text-xs text-muted-foreground">{cf.file_count} files · {formatFileSize(cf.total_size)}</span>
            </button>
          ))}
          {clientFolders.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">No files uploaded yet</p>
          )}
        </div>
      )}

      {/* Client level: Photos / Videos / Links */}
      {currentLevel === 'client' && selectedClient && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => selectType('photo')}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
          >
            <FileImage className="h-10 w-10 text-amber-500" />
            <span className="text-sm font-medium">Photos</span>
            <span className="text-xs text-muted-foreground">
              {clientFiles.filter(f => f.file_type === 'photo').length} files
            </span>
          </button>
          <button
            onClick={() => selectType('video')}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
          >
            <FileVideo className="h-10 w-10 text-red-500" />
            <span className="text-sm font-medium">Videos</span>
            <span className="text-xs text-muted-foreground">
              {clientFiles.filter(f => f.file_type === 'video').length} files
            </span>
          </button>
          <button
            onClick={() => selectType('links')}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
          >
            <Link2 className="h-10 w-10 text-blue-500" />
            <span className="text-sm font-medium">Links</span>
          </button>
        </div>
      )}

      {/* Links view */}
      {hasLinksSection && selectedClient && (
        <ClientLinksSection
          registeredDateTimeAD={selectedClient.registered_date_time_ad}
          clientName={selectedClient.client_name}
        />
      )}

      {/* Type level for photos: show event folders */}
      {currentLevel === 'type' && filterType === 'photo' && !showLinks && uniqueEvents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uniqueEvents.map(ev => (
            <button
              key={ev}
              onClick={() => selectEvent(ev)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
            >
              <Folder className="h-8 w-8 text-teal-500" />
              <span className="text-sm font-medium">{ev}</span>
            </button>
          ))}
        </div>
      )}

      {/* Event level for photos: show side folders or files */}
      {currentLevel === 'event' && filterType === 'photo' && uniqueSides.length > 0 && !filterSide && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uniqueSides.map(side => (
            <button
              key={side}
              onClick={() => selectSide(side)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
            >
              <Folder className="h-8 w-8 text-indigo-500" />
              <span className="text-sm font-medium">{side}</span>
            </button>
          ))}
        </div>
      )}

      {/* File list: show when at leaf level or for videos */}
      {selectedClient && !showLinks && filterType && (
        (filterType === 'video' || (filterType === 'photo' && (filterSide || (uniqueEvents.length === 0 && uniqueSides.length === 0)))) && (
          <div className="space-y-2">
            {displayFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No files here</p>
            )}
            {displayFiles.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                {file.file_type === 'photo' ? (
                  <FileImage className="h-8 w-8 text-amber-500 shrink-0" />
                ) : (
                  <FileVideo className="h-8 w-8 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size_bytes)} · {file.upload_status}
                  </p>
                </div>
                <a
                  href={getEditedFileUrl(file.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 text-primary" />
                </a>
                <button onClick={() => handleDelete(file)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Photo type with events but no event selected yet — show files if no subfolders */}
      {selectedClient && filterType === 'photo' && !filterEvent && !showLinks && uniqueEvents.length === 0 && (
        <div className="space-y-2">
          {displayFiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No photo files</p>
          )}
          {displayFiles.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <FileImage className="h-8 w-8 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size_bytes)}</p>
              </div>
              <a href={getEditedFileUrl(file.storage_path)} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 text-primary" />
              </a>
              <button onClick={() => handleDelete(file)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
