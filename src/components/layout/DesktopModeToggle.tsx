import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { cn } from "@/lib/utils";

export function DesktopModeToggle() {
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDesktopMode}
      className={cn(
        "bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background",
        isDesktopMode && "bg-primary/10 border-primary/30"
      )}
      aria-label={isDesktopMode ? "Switch to Mobile view" : "Switch to Desktop view"}
    >
      {isDesktopMode ? (
        <Monitor className="h-5 w-5 text-primary" />
      ) : (
        <Smartphone className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
