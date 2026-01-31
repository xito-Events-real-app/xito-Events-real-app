import { ReactNode, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { getDesktopMode } from "@/hooks/useDesktopMode";
import { cn } from "@/lib/utils";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopMode } from "@/hooks/useDesktopMode";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const { toggleDesktopMode } = useDesktopMode();

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

  // In desktop mode, render nothing here - Desktop pages handle their own layout
  if (isDesktopMode) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top right controls - Desktop Mode Toggle */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDesktopMode}
          className="bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
          aria-label="Switch to Desktop view"
        >
          <Monitor className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
      
      <main className="pb-24">
        {children}
      </main>
      
      {/* Mobile mode: bottom nav */}
      <BottomNav />
    </div>
  );
}
