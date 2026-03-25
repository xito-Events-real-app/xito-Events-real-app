import { useState, useEffect } from "react";
import { listPCloudFolder, createPCloudFolder, getPCloudFileLink, formatPCloudSize, PCloudItem } from "@/lib/pcloud-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FileImage, FileVideo, File, ArrowLeft, FolderPlus, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BreadcrumbEntry {
  name: string;
  folderId: number;
}

export function PCloudBrowser() {
  const [contents, setContents] = useState<PCloudItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ name: 'pCloud Root', folderId: 0 }]);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creating, setCreating] = useState(false);

  const currentFolderId = breadcrumb[breadcrumb.length - 1].folderId;

  const loadFolder = async (folderId: number) => {
    setLoading(true);
    try {
      const result = await listPCloudFolder(folderId);
      setContents(result.contents);
    } catch (err: any) {
      toast({ title: "Failed to load pCloud folder", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFolder(currentFolderId); }, [currentFolderId]);

  const openFolder = (item: PCloudItem) => {
    if (!item.isfolder || !item.folderid) return;
    setBreadcrumb(prev => [...prev, { name: item.name, folderId: item.folderid! }]);
  };

  const navigateTo = (index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await createPCloudFolder(currentFolderId, newFolderName.trim());
      toast({ title: `Folder "${newFolderName}" created` });
      setNewFolderName('');
      setShowNewFolder(false);
      loadFolder(currentFolderId);
    } catch (err: any) {
      toast({ title: "Failed to create folder", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (item: PCloudItem) => {
    if (!item.fileid) return;
    try {
      const url = await getPCloudFileLink(item.fileid);
      window.open(url, '_blank');
    } catch (err: any) {
      toast({ title: "Failed to get download link", description: err.message, variant: "destructive" });
    }
  };

  const folders = contents.filter(c => c.isfolder).sort((a, b) => a.name.localeCompare(b.name));
  const files = contents.filter(c => !c.isfolder).sort((a, b) => a.name.localeCompare(b.name));

  const getFileIcon = (item: PCloudItem) => {
    const ct = item.contenttype || '';
    if (ct.startsWith('image/')) return <FileImage className="h-8 w-8 text-amber-500" />;
    if (ct.startsWith('video/')) return <FileVideo className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                onClick={() => navigateTo(i)}
                className={`hover:text-primary transition-colors ${
                  i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => loadFolder(currentFolderId)}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)} className="gap-1">
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </Button>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2">
          <Input
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
          />
          <Button onClick={handleCreateFolder} disabled={creating || !newFolderName.trim()} size="sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map(item => (
            <button
              key={item.folderid}
              onClick={() => openFolder(item)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
            >
              <Folder className="h-10 w-10 text-amber-500" />
              <span className="text-sm font-medium text-center truncate w-full">{item.name}</span>
            </button>
          ))}
          {files.map(item => (
            <button
              key={item.fileid}
              onClick={() => handleDownload(item)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
            >
              {getFileIcon(item)}
              <span className="text-xs font-medium text-center truncate w-full">{item.name}</span>
              <span className="text-[10px] text-muted-foreground">{formatPCloudSize(item.size || 0)}</span>
              <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
          {folders.length === 0 && files.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">This folder is empty</p>
          )}
        </div>
      )}
    </div>
  );
}
