import { useState, useRef, useCallback } from "react";
import { Home, Plus, Search, Users, RefreshCw, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getCachedData, setCachedClients, setCachedDropdowns, notifyCacheUpdate } from "@/lib/cache-manager";
import { supabase } from "@/integrations/supabase/client";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";
import { Button } from "@/components/ui/button";

// Unique whoosh/teleport sound for sync
const SYNC_START_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";
const SYNC_COMPLETE_URL = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Users, label: "Fresh Clients", path: "/fresh-clients" },
  { icon: Plus, label: "Add Client", path: "/quick-add" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDateConverter, setShowDateConverter] = useState(false);
  const syncAudioRef = useRef<HTMLAudioElement | null>(null);
  const completeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle sync
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    // Play whoosh sound
    if (!syncAudioRef.current) {
      syncAudioRef.current = new Audio(SYNC_START_URL);
    }
    syncAudioRef.current.currentTime = 0;
    syncAudioRef.current.volume = 0.5;
    syncAudioRef.current.loop = false;
    syncAudioRef.current.play().catch(() => {});
    
    // Prepare completion sound
    if (!completeAudioRef.current) {
      completeAudioRef.current = new Audio(SYNC_COMPLETE_URL);
    }
    
    try {
      const [clientsResult, dropdownsResult] = await Promise.all([
        supabase.functions.invoke("google-sheets", {
          body: { action: "getClients", limit: 500 },
        }),
        supabase.functions.invoke("google-sheets", {
          body: { action: "getDropdowns" },
        }),
      ]);

      if (clientsResult.data?.success) {
        await setCachedClients(clientsResult.data.data);
        notifyCacheUpdate('clients', clientsResult.data.data);
      }
      
      if (dropdownsResult.data?.success) {
        await setCachedDropdowns(dropdownsResult.data.data);
        notifyCacheUpdate('dropdowns', dropdownsResult.data.data);
      }
      
      // Stop sync sound and play completion sound
      if (syncAudioRef.current) {
        syncAudioRef.current.pause();
        syncAudioRef.current.currentTime = 0;
      }
      
      if (completeAudioRef.current) {
        completeAudioRef.current.currentTime = 0;
        completeAudioRef.current.volume = 0.6;
        completeAudioRef.current.play().catch(() => {});
      }
      
    } catch (error) {
      console.error("Sync failed:", error);
      if (syncAudioRef.current) {
        syncAudioRef.current.pause();
        syncAudioRef.current.currentTime = 0;
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-border h-16">
        <div className="h-full max-w-7xl mx-auto px-8 flex items-center justify-between">
          {/* Logo/Brand - Left side with space for toggle */}
          <div className="flex items-center gap-4 pl-14">
            <h1 className="text-xl font-bold text-gradient-primary">WTN Client Tracker</h1>
          </div>

          {/* Navigation Links - Center */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive
                      ? "gradient-primary text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Actions - Right side */}
          <div className="flex items-center gap-3 pr-14">
            {/* Date Converter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDateConverter(true)}
              className="border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
            >
              🕉️ Date Converter
            </Button>
            
            {/* Sync Button */}
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="gradient-primary text-white"
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4 mr-2",
                  isSyncing && "animate-spin"
                )}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Date Converter Drawer */}
      <DateConverterDrawer 
        isOpen={showDateConverter} 
        onClose={() => setShowDateConverter(false)} 
      />
    </>
  );
}
