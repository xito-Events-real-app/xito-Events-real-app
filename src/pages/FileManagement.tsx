import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileManagementSidebar } from "@/components/files/FileManagementSidebar";
import { StorageDevicesSection } from "@/components/files/StorageDevicesSection";
import { FilesManagementTable } from "@/components/files/FilesManagementTable";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, HardDrive, FolderOpen, Database, AlertTriangle, BarChart3 } from "lucide-react";
import { getFileManagementStats } from "@/lib/files-api";
import { useEffect } from "react";

type ActiveSection = "dashboard" | "storage" | "files";

export default function FileManagement() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string | null>(null);
  const [addDeviceDrawerOpen, setAddDeviceDrawerOpen] = useState(false);
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSizeGB: number;
    devicesCount: number;
    warningDevices: number;
  } | null>(null);

  useEffect(() => {
    getFileManagementStats().then(setStats).catch(() => {});
  }, []);

  const handleAddDevice = useCallback(() => {
    setActiveSection("storage");
    setAddDeviceDrawerOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <FileManagementSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        deviceTypeFilter={deviceTypeFilter}
        onDeviceTypeFilter={setDeviceTypeFilter}
        onAddDevice={handleAddDevice}
      />

      {/* Main Content */}
      <div className="ml-64 min-h-screen transition-all duration-300">
        {/* Section Header */}
        <header className="h-14 flex items-center px-6 border-b bg-background">
          <div className="flex items-center gap-2">
            {activeSection === "dashboard" && <BarChart3 className="w-5 h-5 text-muted-foreground" />}
            {activeSection === "storage" && <HardDrive className="w-5 h-5 text-muted-foreground" />}
            {activeSection === "files" && <FileText className="w-5 h-5 text-muted-foreground" />}
            <h2 className="text-lg font-bold text-foreground">
              {activeSection === "dashboard" && "Dashboard"}
              {activeSection === "storage" && "Storage Devices"}
              {activeSection === "files" && "Files Management"}
            </h2>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
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
                  onClick={() => setActiveSection("storage")}>
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
                  onClick={() => setActiveSection("files")}>
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
            </div>
          )}

          {/* Storage Devices */}
          {activeSection === "storage" && (
            <StorageDevicesSection
              deviceTypeFilter={deviceTypeFilter}
              drawerOpen={addDeviceDrawerOpen}
              onDrawerOpenChange={setAddDeviceDrawerOpen}
            />
          )}

          {/* Files */}
          {activeSection === "files" && (
            <FilesManagementTable />
          )}
        </main>
      </div>
    </div>
  );
}
