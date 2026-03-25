import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { DesktopAppLayout } from "@/components/desktop/DesktopAppLayout";
import { FolderBrowser } from "@/components/edited-files/FolderBrowser";
import { UploadWizard } from "@/components/edited-files/UploadWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEditedFiles, getEditedFilesClients, formatFileSize, EditedFile } from "@/lib/edited-files-api";
import { Upload, HardDrive, FolderOpen, Clock } from "lucide-react";

export default function EditedFiles() {
  const isMobile = useIsMobile();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<EditedFile[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [view, setView] = useState<'dashboard' | 'browse'>('dashboard');

  const loadStats = async () => {
    const [files, clients] = await Promise.all([getEditedFiles(), getEditedFilesClients()]);
    setRecentFiles(files.slice(0, 5));
    setTotalSize(files.reduce((s, f) => s + Number(f.file_size_bytes || 0), 0));
    setTotalClients(clients.length);
  };

  useEffect(() => { loadStats(); }, []);

  const content = (
    <div className="p-4 space-y-5">
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
                <p className="text-2xl font-bold">{recentFiles.reduce((_, __, ___, arr) => arr.length, 0)}</p>
                <p className="text-xs text-muted-foreground">Recent Files</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent uploads */}
          <div>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Uploads
            </h2>
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No files uploaded yet. Click Upload to get started.</p>
            ) : (
              <div className="space-y-2">
                {recentFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">{f.client_name} · {formatFileSize(f.file_size_bytes)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.upload_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {f.upload_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'browse' && <FolderBrowser />}

      <UploadWizard open={wizardOpen} onOpenChange={setWizardOpen} onUploadStarted={loadStats} />
    </div>
  );

  if (isMobile) {
    return <AppLayout>{content}</AppLayout>;
  }
  return <DesktopAppLayout>{content}</DesktopAppLayout>;
}
