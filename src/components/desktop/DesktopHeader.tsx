import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";
import {
  RefreshCw,
  Search,
  Calendar,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronRight,
  Home,
} from "lucide-react";

interface DesktopHeaderProps {
  onSync: () => void;
  isSyncing: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Breadcrumb mapping
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/fresh-clients": "Fresh Clients",
  "/today": "Today",
  "/quick-add": "Add Client",
  "/search": "Search",
  "/settings": "Settings",
};

export function DesktopHeader({ onSync, isSyncing, searchQuery, onSearchChange }: DesktopHeaderProps) {
  const location = useLocation();
  const { isMuted, toggleMute } = useAudio();
  const { toggleDesktopMode } = useDesktopMode();
  const [showDateConverter, setShowDateConverter] = useState(false);

  // Build breadcrumbs
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentLabel = routeLabels[location.pathname] || pathSegments[pathSegments.length - 1] || "Dashboard";

  return (
    <>
      <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
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

        {/* Center: Search (optional) */}
        {onSearchChange && (
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search clients..."
                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>
        )}

        {/* Right: Actions */}
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
      </header>

      {/* Date Converter Drawer */}
      <DateConverterDrawer
        isOpen={showDateConverter}
        onClose={() => setShowDateConverter(false)}
      />
    </>
  );
}
