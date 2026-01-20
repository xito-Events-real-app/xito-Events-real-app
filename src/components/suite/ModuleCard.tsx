import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SuiteModule } from "@/lib/suite-modules";
import { toast } from "sonner";

interface ModuleCardProps {
  module: SuiteModule;
  size?: "sm" | "md" | "lg";
}

export function ModuleCard({ module, size = "md" }: ModuleCardProps) {
  const navigate = useNavigate();
  const Icon = module.icon;
  const isActive = module.status === "active";

  const handleClick = () => {
    if (isActive) {
      navigate(module.path);
    } else {
      toast.info(`${module.name} is coming soon!`, {
        description: "We're working hard to bring you this feature.",
      });
    }
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const iconContainerSizes = {
    sm: "w-10 h-10 rounded-lg",
    md: "w-14 h-14 rounded-xl",
    lg: "w-20 h-20 rounded-2xl",
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative w-full rounded-2xl border transition-all duration-300 text-left group overflow-hidden",
        sizeClasses[size],
        isActive
          ? "bg-card hover:bg-accent/50 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
          : "bg-muted/30 border-border/50 opacity-60 cursor-default"
      )}
    >
      {/* Gradient overlay on hover for active cards */}
      {isActive && (
        <div 
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
            module.gradient
          )}
        />
      )}

      <div className="relative z-10 flex flex-col gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center bg-gradient-to-br shadow-lg",
            iconContainerSizes[size],
            module.gradient,
            !isActive && "grayscale"
          )}
        >
          <Icon className={cn(iconSizes[size], "text-white")} />
        </div>

        {/* Content */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-semibold truncate",
              size === "lg" ? "text-lg" : "text-sm"
            )}>
              {module.name}
            </h3>
          </div>
          <p className={cn(
            "text-muted-foreground line-clamp-2",
            size === "lg" ? "text-sm" : "text-xs"
          )}>
            {module.description}
          </p>
        </div>

        {/* Status Badge */}
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={cn(
            "w-fit text-xs",
            isActive 
              ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isActive ? "Active" : "Coming Soon"}
        </Badge>
      </div>
    </button>
  );
}
