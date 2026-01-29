import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  Smartphone,
  ChevronRight,
  Home,
  X,
  Users,
  MapPin,
  Flame,
} from "lucide-react";
import { NEPALI_MONTHS, getMonthName } from "@/lib/nepali-months";

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
  // Hot date filter props
  selectedHotDate?: string | null;
  onClearHotDate?: () => void;
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
  selectedHotDate,
  onClearHotDate,
  onClearAllFilters,
  hasActiveFilter = false,
  filteredCount = 0,
}: DesktopHeaderProps) {
  const location = useLocation();
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
          <div className="py-3 px-6 border-t border-border/50 bg-muted/30 space-y-3">
            {/* Row 1: Handler Buttons + Category Badge */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Handler Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* All Handlers Button */}
                <button
                  onClick={() => onHandlerFilter?.(null)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    selectedHandler === null
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-background border border-border hover:bg-muted hover:border-primary/30"
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span>All</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    selectedHandler === null ? "bg-white/20" : "bg-muted"
                  )}>
                    {totalClients}
                  </span>
                </button>

                {/* Individual Handler Buttons */}
                {handlers.map((handler) => {
                  const count = handlerCounts[handler] || 0;
                  const isSelected = selectedHandler === handler;
                  return (
                    <button
                      key={handler}
                      onClick={() => onHandlerFilter?.(isSelected ? null : handler)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-background border border-border hover:bg-muted hover:border-primary/30"
                      )}
                    >
                      <span>{handler}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        isSelected ? "bg-white/20" : "bg-muted"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Separator + Category Badge */}
              {selectedCategory && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Badge 
                    variant="secondary" 
                    className="gap-1.5 py-1.5 px-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{categoryLabel || selectedCategory}</span>
                    <button 
                      onClick={onClearCategory}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </>
              )}

              {/* Hot Date Badge */}
              {selectedHotDate && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Badge 
                    variant="secondary" 
                    className="gap-1.5 py-1.5 px-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-medium">
                      {(() => {
                        const [y, m, d] = selectedHotDate.split('-').map(Number);
                        return `${getMonthName(m)} ${d}, ${y}`;
                      })()}
                    </span>
                    <button 
                      onClick={onClearHotDate}
                      className="ml-1 hover:bg-orange-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </>
              )}
            </div>

            {/* Row 2: Date Filters (Enhanced Style) */}
            <div className="flex items-center gap-3">
              {/* Calendar Icon Label */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Event Date:</span>
              </div>
              
              {/* Year Selector */}
              <Select
                value={selectedYear?.toString() || "all"}
                onValueChange={(value) => onYearChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className={cn(
                  "w-[120px] h-10 text-sm rounded-full border-2 transition-all",
                  selectedYear 
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/50 font-medium" 
                    : "bg-background border-border"
                )}>
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

              {/* Month Selector */}
              <Select
                value={selectedMonth?.toString() || "all"}
                onValueChange={(value) => onMonthChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className={cn(
                  "w-[140px] h-10 text-sm rounded-full border-2 transition-all",
                  selectedMonth 
                    ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/50 font-medium" 
                    : "bg-background border-border"
                )}>
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

              {/* Day Selector */}
              <Select
                value={selectedDay?.toString() || "all"}
                onValueChange={(value) => onDayChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className={cn(
                  "w-[100px] h-10 text-sm rounded-full border-2 transition-all",
                  selectedDay 
                    ? "bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/50 font-medium" 
                    : "bg-background border-border"
                )}>
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

              {/* Clear Date Button */}
              {(selectedYear || selectedMonth || selectedDay) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    onYearChange?.(null);
                    onMonthChange?.(null);
                    onDayChange?.(null);
                  }}
                  className="text-muted-foreground hover:text-foreground gap-1 rounded-full"
                >
                  <X className="w-3 h-3" />
                  Clear Dates
                </Button>
              )}

              {/* Clear All + Count */}
              {hasActiveFilter && (
                <div className="flex items-center gap-3 ml-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onClearAllFilters}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 rounded-full border-destructive/30"
                  >
                    <X className="w-3 h-3" />
                    Clear All Filters
                  </Button>
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold px-3 py-1">
                    {filteredCount} client{filteredCount !== 1 ? 's' : ''} found
                  </Badge>
                </div>
              )}
            </div>
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
