import { useState, useEffect, useRef } from "react";
import { listPCloudFolder, createPCloudFolder, getPCloudFileLink, getPCloudThumbsBatch, uploadToPCloud, formatPCloudSize, isPCloudImage, isPCloudVideo, PCloudItem } from "@/lib/pcloud-api";
import { getEditedFiles, EditedFile } from "@/lib/edited-files-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, FileImage, FileVideo, File, FolderPlus, Download, Loader2, RefreshCw, Upload, Clock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PCloudPreviewDialog } from "./PCloudPreviewDialog";
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
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [recentPCloudFiles, setRecentPCloudFiles] = useState<EditedFile[]>([]);
  const [previewItem, setPreviewItem] = useState<PCloudItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1].folderId;

  const loadFolder = async (folderId: number) => {
    setLoading(true);
    setThumbs({});
    try {
      const result = await listPCloudFolder(folderId);
      setContents(result.contents);
      
      // Load thumbnails for image files in background
      const imageFiles = result.contents.filter(c => !c.isfolder && c.fileid && isPCloudImage(c));
      if (imageFiles.length > 0) {
        const fileids = imageFiles.map(f => f.fileid!);
        getPCloudThumbsBatch(fileids, '200x200').then(setThumbs).catch(() => {});
      }
    } catch (err: any) {
      toast({ title: "Failed to load pCloud folder", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPCloudFiles = async () => {
    try {
      const files = await getEditedFiles();
      const pcloudFiles = files.filter(f => f.storage_type === 'pcloud').slice(0, 6);
      setRecentPCloudFiles(pcloudFiles);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadFolder(currentFolderId); }, [currentFolderId]);
  useEffect(() => { loadRecentPCloudFiles(); }, []);

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

  const handleFileClick = async (item: PCloudItem) => {
    if (!item.fileid) return;
    setPreviewLoading(item.fileid);
    try {
      const url = await getPCloudFileLink(item.fileid);
      if (isPCloudImage(item) || isPCloudVideo(item)) {
        setPreviewItem(item);
        setPreviewUrl(url);
        setPreviewOpen(true);
      } else {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      toast({ title: "Failed to get file link", description: err.message, variant: "destructive" });
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploaded = 0;
    const total = files.length;

    try {
      for (const file of Array.from(files)) {
        setUploadProgress(`Uploading ${uploaded + 1}/${total}: ${file.name}`);
        await uploadToPCloud(currentFolderId, file);
        uploaded++;
      }
      toast({ title: `${uploaded} file(s) uploaded successfully` });
      loadFolder(currentFolderId);
      loadRecentPCloudFiles();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const folders = contents.filter(c => c.isfolder).sort((a, b) => a.name.localeCompare(b.name));
  const files = contents.filter(c => !c.isfolder).sort((a, b) => a.name.localeCompare(b.name));

  const getFileIcon = (item: PCloudItem) => {
    if (isPCloudImage(item)) return <FileImage className="h-8 w-8 text-amber-500" />;
    if (isPCloudVideo(item)) return <FileVideo className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Recent pCloud uploads from DB */}
      {breadcrumb.length === 1 && recentPCloudFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" /> Recent pCloud Uploads
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {recentPCloudFiles.map(f => (
              <Card key={f.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {f.file_type === 'photo' ? (
                      <FileImage className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <FileVideo className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    )}
                    <p className="text-xs font-medium truncate">{f.file_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.client_name}</span>
                  </div>
                  {f.event_name && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {f.event_name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb + actions */}
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
          <Button variant="outline" size="sm" onClick={() => loadFolder(currentFolderId)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)} className="gap-1">
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="image/*,video/*"
          />
        </div>
      </div>

      {/* Upload progress */}
      {uploading && uploadProgress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {uploadProgress}
        </div>
      )}

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
              className="flex flex-col items-center gap-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors group overflow-hidden"
            >
              {/* Thumbnail or icon */}
              {thumbs[item.fileid!] ? (
                <div className="w-full aspect-square bg-muted overflow-hidden">
                  <img src={thumbs[item.fileid!]} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : isPCloudVideo(item) ? (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <FileVideo className="h-10 w-10 text-red-500" />
                </div>
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  {getFileIcon(item)}
                </div>
              )}
              <div className="px-2 pb-3 w-full text-center">
                <span className="text-xs font-medium truncate block">{item.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatPCloudSize(item.size || 0)}</span>
                <Download className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mx-auto mt-1" />
              </div>
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
