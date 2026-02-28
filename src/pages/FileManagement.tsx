import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, HardDrive, FileText, BarChart3, AlertTriangle, Database, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StorageDevicesSection } from "@/components/files/StorageDevicesSection";
import { FilesManagementTable } from "@/components/files/FilesManagementTable";
import { getFileManagementStats, syncStorageDevicesFromSheets, pushFilesToSheets } from "@/lib/files-api";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function FileManagement() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSizeGB: number;
    devicesCount: number;
    warningDevices: number;
  } | null>(null);
  const [syncingStorage, setSyncingStorage] = useState(false);
  const [pushingFiles, setPushingFiles] = useState(false);

  useEffect(() => {
    getFileManagementStats().then(setStats).catch(() => {});
  }, []);

  const handleSyncStorage = async () => {
    setSyncingStorage(true);
    try {
      const result = await syncStorageDevicesFromSheets();
      toast({ title: `Synced ${result.upserted} storage devices from Sheets` });
      getFileManagementStats().then(setStats).catch(() => {});
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncingStorage(false);
    }
  };

  const handlePushFiles = async () => {
    setPushingFiles(true);
    try {
      const result = await pushFilesToSheets();
      toast({ title: result.pushed > 0 ? `Pushed ${result.pushed} files to Sheets` : "All files already synced" });
    } catch (err: any) {
      toast({ title: "Push failed", description: err.message, variant: "destructive" });
    } finally {
      setPushingFiles(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 text-white px-4 sm:px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/20 hover:text-white shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <FolderOpen className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">File Management</h1>
              <p className="text-cyan-100 text-xs">Storage devices, file tracking & path management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-1.5 text-xs sm:text-sm">
              <HardDrive className="w-4 h-4" /> Storage Devices
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" /> Files
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
                    <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Files</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalFiles ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Size</p>
                    <p className="text-2xl font-bold text-foreground">{stats ? `${stats.totalSizeGB} GB` : "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                    <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Devices</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.devicesCount ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-0 shadow-sm bg-card/80 backdrop-blur-sm",
                stats && stats.warningDevices > 0 && "ring-1 ring-red-300 dark:ring-red-800"
              )}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Warnings</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      stats && stats.warningDevices > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                    )}>
                      {stats?.warningDevices ?? "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  const el = document.querySelector('[data-value="storage"]') as HTMLElement;
                  el?.click();
                }}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Manage Storage Devices</h3>
                    <p className="text-sm text-muted-foreground">Add, edit, monitor hard drives, SSDs & PCs</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  const el = document.querySelector('[data-value="files"]') as HTMLElement;
                  el?.click();
                }}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">File Management Table</h3>
                    <p className="text-sm text-muted-foreground">Track file entries, paths & backup status</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Storage Devices Tab */}
          <TabsContent value="storage" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncStorage}
                disabled={syncingStorage}
                className="gap-1.5"
              >
                <RefreshCw className={cn("w-4 h-4", syncingStorage && "animate-spin")} />
                {syncingStorage ? "Syncing..." : "Sync from Sheets"}
              </Button>
            </div>
            <StorageDevicesSection />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePushFiles}
                disabled={pushingFiles}
                className="gap-1.5"
              >
                <Upload className={cn("w-4 h-4", pushingFiles && "animate-spin")} />
                {pushingFiles ? "Pushing..." : "Push to Sheets"}
              </Button>
            </div>
            <FilesManagementTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
