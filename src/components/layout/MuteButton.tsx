import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/contexts/AudioContext";

export function MuteButton() {
  const { isMuted, toggleMute } = useAudio();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMute}
      className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
      aria-label={isMuted ? "Unmute music" : "Mute music"}
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Volume2 className="h-5 w-5 text-primary" />
      )}
    </Button>
  );
}
