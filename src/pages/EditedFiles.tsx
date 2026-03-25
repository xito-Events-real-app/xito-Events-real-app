import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { FolderBrowser } from "@/components/edited-files/FolderBrowser";
import { PCloudBrowser } from "@/components/edited-files/PCloudBrowser";
import { UploadWizard } from "@/components/edited-files/UploadWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEditedFiles, getEditedFilesClients, getEditedFileUrl, formatFileSize, EditedFile } from "@/lib/edited-files-api";
import { Upload, HardDrive, FolderOpen, Clock, FileImage, FileVideo, Play, Cloud } from "lucide-react";
import { FilePreviewDialog } from "@/components/edited-files/FilePreviewDialog";

export default function EditedFiles() {
  const isMobile = useIsMobile();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<EditedFile[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [view, setView] = useState<'dashboard' | 'browse' | 'pcloud'>('dashboard');
  const [previewFile, setPreviewFile] = useState<EditedFile | null>(null);

  const loadStats = async () => {
    const [files, clients] = await Promise.all([getEditedFiles(), getEditedFilesClients()]);
    setRecentFiles(files.slice(0, 10));
    setTotalSize(files.reduce((s, f) => s + Number(f.file_size_bytes || 0), 0));
    setTotalClients(clients.length);
  };

  useEffect(() => { loadStats(); }, []);

  const content = (
    <div className="p-4 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-teal-500" />
          <h1 className="text-xl font-bold">Edited Files</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant={view === 'browse' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('browse')}
          >
            <FolderOpen className="h-4 w-4 mr-1" /> Browse
          </Button>
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {view === 'dashboard' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{recentFiles.length > 0 ? formatFileSize(totalSize) : '0 B'}</p>
                <p className="text-xs text-muted-foreground">Total Size</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{recentFiles.length}</p>
                <p className="text-xs text-muted-foreground">Recent Files</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent uploads with thumbnails */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Uploads
            </h2>
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No files uploaded yet. Click Upload to get started.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {recentFiles.map(f => {
                  const url = getEditedFileUrl(f.storage_path);
                  const isPhoto = f.file_type === 'photo';
                  return (
                    <button
                      key={f.id}
                      onClick={() => setPreviewFile(f)}
                      className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow text-left"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-full aspect-square bg-muted overflow-hidden">
                        {isPhoto ? (
                          <img src={url} alt={f.file_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="relative w-full h-full">
                            <video src={url} className="w-full h-full object-cover" preload="metadata" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="h-10 w-10 text-white fill-white/80" />
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-medium truncate">{f.file_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {f.client_name} · {formatFileSize(f.file_size_bytes)}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                          f.upload_status === 'completed'
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {f.upload_status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'browse' && <FolderBrowser />}
      {view === 'pcloud' && <PCloudBrowser />}

      <UploadWizard open={wizardOpen} onOpenChange={setWizardOpen} onUploadStarted={loadStats} />

      {previewFile && (
        <FilePreviewDialog
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        />
      )}
    </div>
  );

  // Use simple AppLayout for both mobile and desktop — no client tracker sidebar
  return <AppLayout>{content}</AppLayout>;
}
