import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileManagementSidebar } from "@/components/files/FileManagementSidebar";
import { StorageDevicesSection } from "@/components/files/StorageDevicesSection";
import { FilesManagementTable } from "@/components/files/FilesManagementTable";
import { FullScreenFilesTable } from "@/components/files/FullScreenFilesTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, HardDrive, FolderOpen, Database, AlertTriangle, BarChart3, ChevronLeft, Plus, Monitor, Disc } from "lucide-react";
import { getFileManagementStats, getAvailableFileMonths, FileMonthData } from "@/lib/files-api";

type ActiveSection = "dashboard" | "storage" | "files";

const SECTIONS: { key: ActiveSection; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "files", label: "Files", icon: FileText },
];

const DEVICE_TYPES: { key: string | null; label: string; icon: React.ElementType }[] = [
  { key: null, label: "All", icon: Database },
  { key: "HARD_DRIVE", label: "HDD", icon: HardDrive },
  { key: "SSD", label: "SSD", icon: Disc },
  { key: "PC", label: "PC", icon: Monitor },
];

export default function FileManagement() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string | null>(null);
  const [addDeviceDrawerOpen, setAddDeviceDrawerOpen] = useState(false);
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSizeGB: number;
    devicesCount: number;
    warningDevices: number;
  } | null>(null);

  // Month state for files section
  const [availableMonths, setAvailableMonths] = useState<FileMonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<{ year: string; month: string } | null>(null);

  useEffect(() => {
    getFileManagementStats().then(setStats).catch(() => {});
    getAvailableFileMonths().then((months) => {
      setAvailableMonths(months);
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth({ year: months[0].year, month: months[0].month });
      }
    }).catch(() => {});
  }, []);

  const handleAddDevice = useCallback(() => {
    setActiveSection("storage");
    setAddDeviceDrawerOpen(true);
  }, []);

  const handleMonthChange = (month: { year: string; month: string }) => {
    setSelectedMonth(month);
  };

  // ─── Mobile Layout ───
  if (isMobile) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => navigate("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-base text-foreground truncate">File Management</h1>
        </header>

        {/* Tab Pills */}
        <div className="sticky top-[57px] z-30 bg-background border-b px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeSection === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Device Type Filter Chips */}
        {activeSection === "storage" && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b bg-background">
            {DEVICE_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setDeviceTypeFilter(key)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  deviceTypeFilter === key
                    ? "bg-cyan-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <main className="p-4">
          {activeSection === "dashboard" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm bg-card/80">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
                      <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Files</p>
                      <p className="text-xl font-bold text-foreground">{stats?.totalFiles ?? "—"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-card/80">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                      <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Size</p>
                      <p className="text-xl font-bold text-foreground">{stats ? `${stats.totalSizeGB} GB` : "—"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-card/80">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                      <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Devices</p>
                      <p className="text-xl font-bold text-foreground">{stats?.devicesCount ?? "—"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className={cn("border-0 shadow-sm bg-card/80", stats && stats.warningDevices > 0 && "ring-1 ring-red-300 dark:ring-red-800")}>
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Warnings</p>
                      <p className={cn("text-xl font-bold", stats && stats.warningDevices > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                        {stats?.warningDevices ?? "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border shadow-sm" onClick={() => setActiveSection("storage")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground">Manage Storage Devices</h3>
                    <p className="text-xs text-muted-foreground">Hard drives, SSDs & PCs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm" onClick={() => setActiveSection("files")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground">File Management Table</h3>
                    <p className="text-xs text-muted-foreground">Track files, paths & backups</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "storage" && (
            <StorageDevicesSection
              deviceTypeFilter={deviceTypeFilter}
              drawerOpen={addDeviceDrawerOpen}
              onDrawerOpenChange={setAddDeviceDrawerOpen}
            />
          )}

          {activeSection === "files" && (
            <FullScreenFilesTable onClose={() => setActiveSection("dashboard")} />
          )}
        </main>

        {activeSection === "storage" && (
          <button
            onClick={handleAddDevice}
            className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>
    );
  }

  // ─── Desktop Layout ───
  return (
    <div className="min-h-screen bg-muted/30">
      <FileManagementSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        deviceTypeFilter={deviceTypeFilter}
        onDeviceTypeFilter={setDeviceTypeFilter}
        onAddDevice={handleAddDevice}
        selectedMonth={selectedMonth}
        onMonthFilter={handleMonthChange}
        availableMonths={availableMonths}
      />

      <div className="ml-64 min-h-screen transition-all duration-300">
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

        <main className="p-6">
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
                <Card className={cn("border-0 shadow-sm bg-card/80 backdrop-blur-sm", stats && stats.warningDevices > 0 && "ring-1 ring-red-300 dark:ring-red-800")}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Warnings</p>
                      <p className={cn("text-2xl font-bold", stats && stats.warningDevices > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                        {stats?.warningDevices ?? "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection("storage")}>
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
                <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection("files")}>
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

          {activeSection === "storage" && (
            <StorageDevicesSection
              deviceTypeFilter={deviceTypeFilter}
              drawerOpen={addDeviceDrawerOpen}
              onDrawerOpenChange={setAddDeviceDrawerOpen}
            />
          )}

          {activeSection === "files" && (
            <FullScreenFilesTable onClose={() => setActiveSection("dashboard")} />
          )}
        </main>
      </div>
    </div>
  );
}
