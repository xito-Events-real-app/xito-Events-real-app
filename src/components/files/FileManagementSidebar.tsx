import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  BarChart3,
  HardDrive,
  FileText,
  Monitor,
  Database,
  AlertTriangle,
  Plus,
  Disc,
  Calendar,
} from "lucide-react";
import { getFileManagementStats, FileMonthData } from "@/lib/files-api";

type ActiveSection = "dashboard" | "storage" | "files";

interface FileManagementSidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  deviceTypeFilter: string | null;
  onDeviceTypeFilter: (type: string | null) => void;
  onAddDevice: () => void;
  selectedMonth: { year: string; month: string } | null;
  onMonthFilter: (month: { year: string; month: string }) => void;
  availableMonths: FileMonthData[];
}

const SECTIONS = [
  { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { key: "storage" as const, label: "Storage Devices", icon: HardDrive },
  { key: "files" as const, label: "Files", icon: FileText },
];

const DEVICE_TYPES = [
  { key: null as string | null, label: "All Devices", icon: Database },
  { key: "HARD_DRIVE", label: "Hard Drive", icon: HardDrive },
  { key: "SSD", label: "SSD", icon: Disc },
  { key: "PC", label: "PC", icon: Monitor },
];

export function FileManagementSidebar({
  activeSection,
  onSectionChange,
  deviceTypeFilter,
  onDeviceTypeFilter,
  onAddDevice,
  selectedMonth,
  onMonthFilter,
  availableMonths,
}: FileManagementSidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSizeGB: number;
    devicesCount: number;
    warningDevices: number;
  } | null>(null);

  useEffect(() => {
    getFileManagementStats().then(setStats).catch(() => {});
  }, []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r z-40 flex flex-col transition-all duration-300",
        "bg-[hsl(220,25%,10%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Back to Suite */}
      <div className={cn(
        "h-14 flex items-center border-b border-[hsl(220,20%,18%)] px-3 gap-2",
        isCollapsed ? "justify-center" : "justify-start"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className={cn(
            "text-white/70 hover:text-white hover:bg-white/10",
            isCollapsed ? "w-10 h-10 p-0" : "gap-2"
          )}
        >
          <LayoutGrid className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm">Back to Suite</span>}
        </Button>
      </div>

      {/* Module Title */}
      <div className={cn(
        "px-4 py-3 border-b border-[hsl(220,20%,18%)]",
        isCollapsed && "px-2"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">File Management</h1>
              <p className="text-[10px] text-white/60">Storage & file tracking</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 py-3">
        {/* Stats Section */}
        {!isCollapsed && stats && (
          <div className="px-3 mb-3">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
              Overview
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white/5 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-white/50">Files</p>
                <p className="text-sm font-bold text-white">{stats.totalFiles}</p>
              </div>
              <div className="bg-white/5 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-white/50">Size</p>
                <p className="text-sm font-bold text-white">{stats.totalSizeGB} GB</p>
              </div>
              <div className="bg-white/5 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-white/50">Devices</p>
                <p className="text-sm font-bold text-white">{stats.devicesCount}</p>
              </div>
              <div className={cn(
                "rounded-lg px-2.5 py-2",
                stats.warningDevices > 0 ? "bg-red-500/20" : "bg-white/5"
              )}>
                <p className="text-[10px] text-white/50">Warnings</p>
                <p className={cn(
                  "text-sm font-bold",
                  stats.warningDevices > 0 ? "text-red-400" : "text-white"
                )}>
                  {stats.warningDevices}
                </p>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && stats && stats.warningDevices > 0 && (
          <div className="px-2 mb-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
          </div>
        )}

        <Separator className="my-2 bg-white/10 mx-3" />

        {/* Navigation Sections */}
        <div className="px-3">
          {!isCollapsed && (
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
              Sections
            </h3>
          )}
          <div className="space-y-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const isActive = activeSection === key;
              return (
                <button
                  key={key}
                  onClick={() => onSectionChange(key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    isActive ? "bg-white/20" : "bg-white/10"
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {!isCollapsed && (
                    <span className="text-sm font-medium flex-1 text-left">{label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Filter - Only when Files section is active */}
        {activeSection === "files" && availableMonths.length > 0 && (
          <>
            <Separator className="my-3 bg-white/10 mx-3" />
            <div className="px-3">
              {!isCollapsed && (
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Filter by Month
                </h3>
              )}
              <div className="space-y-1">
                {availableMonths.map((m) => {
                  const isActive = selectedMonth?.year === m.year && selectedMonth?.month === m.month;
                  return (
                    <button
                      key={m.value}
                      onClick={() => onMonthFilter({ year: m.year, month: m.month })}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                        isActive
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                      )}
                    >
                      {!isCollapsed ? m.label : m.month}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Device Type Filters - Only show when Storage section is active */}
        {activeSection === "storage" && (
          <>
            <Separator className="my-3 bg-white/10 mx-3" />
            <div className="px-3">
              {!isCollapsed && (
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                  Device Type
                </h3>
              )}
              <div className="space-y-1">
                {DEVICE_TYPES.map(({ key, label, icon: Icon }) => {
                  const isActive = deviceTypeFilter === key;
                  return (
                    <button
                      key={label}
                      onClick={() => onDeviceTypeFilter(key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                        isActive
                          ? "bg-cyan-600 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                        isActive ? "bg-white/20" : "bg-white/10"
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {!isCollapsed && (
                        <span className="text-sm font-medium flex-1 text-left">{label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="border-t border-white/10 py-2 px-2 space-y-1">
        <button
          onClick={onAddDevice}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Add Device</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-border shadow-sm hover:bg-muted p-0"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </aside>
  );
}
