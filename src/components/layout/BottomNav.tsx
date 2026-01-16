import { useState, useEffect, useRef } from "react";
import { Home, Plus, Search, Users, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getCachedData, setCachedClients, setCachedDropdowns, notifyCacheUpdate } from "@/lib/cache-manager";
import { supabase } from "@/integrations/supabase/client";

// Relaxing sync music URL
const SYNC_MUSIC_URL = "https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3";

interface NavItem {
  icon?: typeof Home;
  label?: string;
  path?: string;
  type?: "sync";
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Users, label: "Fresh Clients", path: "/fresh-clients" },
  { type: "sync" },
  { icon: Plus, label: "Add Client", path: "/quick-add" },
  { icon: Search, label: "Search", path: "/search" },
];

export function BottomNav() {
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const syncAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sync audio
  useEffect(() => {
    syncAudioRef.current = new Audio(SYNC_MUSIC_URL);
    syncAudioRef.current.loop = true;
    syncAudioRef.current.volume = 0;
    
    return () => {
      if (syncAudioRef.current) {
        syncAudioRef.current.pause();
        syncAudioRef.current = null;
      }
    };
  }, []);

  // Handle sync
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setShowOverlay(true);
    setSyncComplete(false);
    
    // Start relaxing sync music with fade in
    if (syncAudioRef.current) {
      syncAudioRef.current.currentTime = 0;
      syncAudioRef.current.volume = 0;
      syncAudioRef.current.play().catch(() => {});
      
      // Fade in
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol += 0.05;
        if (syncAudioRef.current && vol <= 0.4) {
          syncAudioRef.current.volume = vol;
        } else {
          clearInterval(fadeIn);
        }
      }, 50);
    }
    
    try {
      // Fetch fresh data from Google Sheets
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
      
      setSyncComplete(true);
      
      // Fade out sync music
      if (syncAudioRef.current) {
        const fadeOut = setInterval(() => {
          if (syncAudioRef.current && syncAudioRef.current.volume > 0.05) {
            syncAudioRef.current.volume -= 0.05;
          } else {
            clearInterval(fadeOut);
            if (syncAudioRef.current) {
              syncAudioRef.current.pause();
              syncAudioRef.current.currentTime = 0;
            }
          }
        }, 50);
      }
      
      // Keep overlay for effect
      setTimeout(() => {
        setShowOverlay(false);
        setSyncComplete(false);
      }, 1500);
      
    } catch (error) {
      console.error("Sync failed:", error);
      setShowOverlay(false);
      // Stop music on error
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
      {/* Time Travel Sync Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
          {/* Dark backdrop with radial gradient */}
          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              syncComplete ? "opacity-0" : "opacity-100"
            )}
            style={{
              background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)"
            }}
          />
          
          {/* Scan lines effect */}
          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              syncComplete ? "opacity-0" : "opacity-30"
            )}
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 200, 255, 0.1) 2px, rgba(0, 200, 255, 0.1) 4px)",
              animation: "scanlines 0.5s linear infinite"
            }}
          />
          
          {/* Radial pulse waves */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-cyan-400/50"
                style={{
                  width: "100px",
                  height: "100px",
                  animation: `ripple 1.5s ease-out infinite`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}
          </div>
          
          {/* Center sync icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={cn(
                "relative transition-all duration-500",
                syncComplete ? "scale-150 opacity-0" : "scale-100 opacity-100"
              )}
            >
              {/* Glowing orb */}
              <div 
                className="absolute -inset-6 rounded-full blur-xl"
                style={{
                  background: "radial-gradient(circle, rgba(0, 200, 255, 0.6) 0%, transparent 70%)",
                  animation: "pulse 0.8s ease-in-out infinite"
                }}
              />
              
              {/* Icon container */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl">
                <RefreshCw 
                  className={cn(
                    "w-10 h-10 text-white",
                    !syncComplete && "animate-spin"
                  )} 
                  style={{ animationDuration: "0.6s" }}
                />
              </div>
            </div>
          </div>
          
          {/* Status text */}
          <div className="absolute inset-x-0 bottom-32 flex flex-col items-center gap-2">
            <p 
              className={cn(
                "text-lg font-bold text-cyan-400 tracking-wider transition-all duration-500",
                syncComplete ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              )}
              style={{ textShadow: "0 0 20px rgba(0, 200, 255, 0.8)" }}
            >
              SYNCING DATA
            </p>
            <p 
              className={cn(
                "text-sm text-cyan-300/80 transition-all duration-500",
                syncComplete ? "opacity-0" : "opacity-100"
              )}
            >
              Time traveling through data...
            </p>
          </div>
          
          {/* Success flash */}
          {syncComplete && (
            <div 
              className="absolute inset-0 bg-cyan-400/20 animate-flash"
            />
          )}
          
          {/* Data stream particles */}
          {!syncComplete && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    height: `${20 + Math.random() * 40}px`,
                    animation: `dataStream 0.8s linear infinite`,
                    animationDelay: `${Math.random() * 0.8}s`,
                    opacity: 0.6
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item, index) => {
            if (item.type === "sync") {
              return (
                <button
                  key="sync"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all press-effect",
                    "text-muted-foreground hover:text-foreground",
                    isSyncing && "pointer-events-none"
                  )}
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                    <RefreshCw
                      className={cn(
                        "w-5 h-5 text-white transition-transform",
                        isSyncing && "animate-spin"
                      )}
                    />
                  </div>
                  <span className="text-xs font-medium">Sync</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path;
            const Icon = item.icon!;

            return (
              <Link
                key={item.path}
                to={item.path!}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all press-effect",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isActive && "gradient-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive && "text-white"
                    )}
                  />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Keyframe animations */}
      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(8);
            opacity: 0;
          }
        }
        
        @keyframes scanlines {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4px);
          }
        }
        
        @keyframes dataStream {
          0% {
            transform: translateY(-100vh);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        
        @keyframes flash {
          0% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
        
        .animate-flash {
          animation: flash 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}
