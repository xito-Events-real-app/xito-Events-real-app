import { Monitor, Smartphone, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { useAudio } from "@/contexts/AudioContext";
import { cn } from "@/lib/utils";

interface GlobalModeToggleProps {
  showMute?: boolean;
  className?: string;
}

export function GlobalModeToggle({ showMute = true, className }: GlobalModeToggleProps) {
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();
  const { isMuted, toggleMute } = useAudio();

  return (
    <div className={cn("fixed top-4 right-4 z-50 flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDesktopMode}
        className="bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
        aria-label={isDesktopMode ? "Switch to Mobile view" : "Switch to Desktop view"}
      >
        {isDesktopMode ? (
          <Smartphone className="h-5 w-5 text-primary" />
        ) : (
          <Monitor className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
      {showMute && (
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
      )}
    </div>
  );
}