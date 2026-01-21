import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Calendar,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronRight,
  Home,
  X,
  Users,
} from "lucide-react";
import { NEPALI_MONTHS } from "@/lib/nepali-months";

interface DesktopHeaderProps {
  onSync: () => void;
  isSyncing: boolean;
  // Handler filter props
  handlers?: string[];
  handlerCounts?: Record<string, number>;
  selectedHandler?: string | null;
  onHandlerFilter?: (handler: string | null) => void;
  // Category display props
  selectedCategory?: string | null;
  categoryLabel?: string;
  onClearCategory?: () => void;
  // Date filter props
  selectedYear?: number | null;
  selectedMonth?: number | null;
  selectedDay?: number | null;
  onYearChange?: (year: number | null) => void;
  onMonthChange?: (month: number | null) => void;
  onDayChange?: (day: number | null) => void;
  // Clear all
  onClearAllFilters?: () => void;
  hasActiveFilter?: boolean;
  filteredCount?: number;
}

// Breadcrumb mapping
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/fresh-clients": "Fresh Clients",
  "/today": "Today",
  "/quick-add": "Add Client",
  "/search": "Search",
  "/settings": "Settings",
  "/client-tracker": "Dashboard",
};

// Generate year range for Nepali calendar (BS)
const getBSYearsRange = () => {
  const years: number[] = [];
  for (let y = 2082; y >= 2075; y--) {
    years.push(y);
  }
  return years;
};

// Generate days 1-32
const getDaysRange = () => {
  const days: number[] = [];
  for (let d = 1; d <= 32; d++) {
    days.push(d);
  }
  return days;
};

export function DesktopHeader({ 
  onSync, 
  isSyncing, 
  handlers = [],
  handlerCounts = {},
  selectedHandler,
  onHandlerFilter,
  selectedCategory,
  categoryLabel,
  onClearCategory,
  selectedYear,
  selectedMonth,
  selectedDay,
  onYearChange,
  onMonthChange,
  onDayChange,
  onClearAllFilters,
  hasActiveFilter = false,
  filteredCount = 0,
}: DesktopHeaderProps) {
  const location = useLocation();
  const { isMuted, toggleMute } = useAudio();
  const { toggleDesktopMode } = useDesktopMode();
  const [showDateConverter, setShowDateConverter] = useState(false);

  // Build breadcrumbs
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentLabel = routeLabels[location.pathname] || pathSegments[pathSegments.length - 1] || "Dashboard";

  const totalClients = Object.values(handlerCounts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <header className="bg-background border-b border-border sticky top-0 z-30">
        {/* Top row: Breadcrumbs + Controls */}
        <div className="h-14 flex items-center justify-between px-6">
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            {location.pathname !== "/" && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                <span className="font-medium text-foreground">{currentLabel}</span>
              </>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Date Converter */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDateConverter(true)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden lg:inline">Date Converter</span>
            </Button>

            {/* Sync */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              <span className="hidden lg:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
            </Button>

            {/* Mute */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-muted-foreground hover:text-foreground"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            {/* Switch to Mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDesktopMode}
              className="gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden lg:inline">Mobile View</span>
            </Button>
          </div>
        </div>

        {/* Filter row (always visible on client-tracker) */}
        {location.pathname.startsWith('/client-tracker') && (
          <div className="h-12 flex items-center gap-4 px-6 border-t border-border/50 bg-muted/30">
            {/* Handler Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Handler:</span>
              <Select
                value={selectedHandler || "all"}
                onValueChange={(value) => onHandlerFilter?.(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm bg-background">
                  <SelectValue placeholder="All Handlers" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>All Handlers</span>
                      <span className="text-muted-foreground">({totalClients})</span>
                    </div>
                  </SelectItem>
                  {handlers.map((handler) => (
                    <SelectItem key={handler} value={handler}>
                      <div className="flex items-center gap-2">
                        <span>{handler}</span>
                        <span className="text-muted-foreground">({handlerCounts[handler] || 0})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Badge (when selected) */}
            {selectedCategory && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                {categoryLabel || selectedCategory}
                <button 
                  onClick={onClearCategory}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {/* Separator */}
            <div className="h-6 w-px bg-border" />

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date:</span>
              
              {/* Year */}
              <Select
                value={selectedYear?.toString() || "all"}
                onValueChange={(value) => onYearChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[100px] h-8 text-sm bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Years</SelectItem>
                  {getBSYearsRange().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} BS
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month */}
              <Select
                value={selectedMonth?.toString() || "all"}
                onValueChange={(value) => onMonthChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[120px] h-8 text-sm bg-background">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Months</SelectItem>
                  {Object.entries(NEPALI_MONTHS).map(([num, name]) => (
                    <SelectItem key={num} value={num}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Day */}
              <Select
                value={selectedDay?.toString() || "all"}
                onValueChange={(value) => onDayChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[90px] h-8 text-sm bg-background">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-[300px]">
                  <SelectItem value="all">All Days</SelectItem>
                  {getDaysRange().map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear All + Count */}
            {hasActiveFilter && (
              <>
                <div className="h-6 w-px bg-border" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearAllFilters}
                  className="text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  Showing {filteredCount} client{filteredCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        )}
      </header>

      {/* Date Converter Drawer */}
      <DateConverterDrawer
        isOpen={showDateConverter}
        onClose={() => setShowDateConverter(false)}
      />
    </>
  );
}
