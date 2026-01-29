import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { cn } from "@/lib/utils";

interface GlobalModeToggleProps {
  className?: string;
}

export function GlobalModeToggle({ className }: GlobalModeToggleProps) {
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();

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
    </div>
  );
}
