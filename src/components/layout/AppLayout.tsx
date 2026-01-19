import { ReactNode, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { MuteButton } from "./MuteButton";
import { DesktopModeToggle } from "./DesktopModeToggle";
import { DesktopNav } from "./DesktopNav";
import { getDesktopMode } from "@/hooks/useDesktopMode";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/contexts/AudioContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const { isMuted, toggleMute } = useAudio();

  useEffect(() => {
    setIsDesktopMode(getDesktopMode());
  }, []);

  // Apply viewport meta tag for desktop mode
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (isDesktopMode) {
        viewport.setAttribute('content', 'width=1024, initial-scale=0.5');
      } else {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
  }, [isDesktopMode]);

  // Add desktop-mode class to body for global CSS
  useEffect(() => {
    if (isDesktopMode) {
      document.body.classList.add('desktop-mode');
    } else {
      document.body.classList.remove('desktop-mode');
    }
  }, [isDesktopMode]);

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isDesktopMode && "desktop-mode"
    )}>
      {/* Top left controls - Desktop Mode Toggle + Mute side by side */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <DesktopModeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
          aria-label={isMuted ? "Unmute music" : "Mute music"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Volume2 className="h-5 w-5 text-primary" />
          )}
        </Button>
      </div>
      
      {/* Desktop mode: top nav */}
      {isDesktopMode && <DesktopNav />}
      
      <main className={cn(
        isDesktopMode ? "pt-20 pb-8" : "pb-24"
      )}>
        {children}
      </main>
      
      {/* Mobile mode: bottom nav */}
      {!isDesktopMode && <BottomNav />}
    </div>
  );
}
