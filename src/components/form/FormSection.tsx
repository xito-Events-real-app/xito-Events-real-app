import { cn } from "@/lib/utils";
import { ChevronDown, LucideIcon } from "lucide-react";
import { useState } from "react";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: LucideIcon;
  gradient?: "blue" | "purple" | "green" | "amber" | "pink";
}

const gradientMap = {
  blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  green: "from-green-500/20 to-green-600/5 border-green-500/30",
  amber: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  pink: "from-pink-500/20 to-pink-600/5 border-pink-500/30",
};

const iconColorMap = {
  blue: "text-blue-500",
  purple: "text-purple-500",
  green: "text-green-500",
  amber: "text-amber-500",
  pink: "text-pink-500",
};

export function FormSection({
  title,
  children,
  defaultOpen = true,
  className,
  icon: Icon,
  gradient,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div 
      className={cn(
        "border-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-300",
        gradient 
          ? `bg-gradient-to-br ${gradientMap[gradient]}` 
          : "border-border bg-card",
        isOpen && "shadow-md",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-all duration-200",
          gradient 
            ? "hover:bg-white/30 dark:hover:bg-black/10" 
            : "bg-muted/30 hover:bg-muted/60"
        )}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "p-2 rounded-xl",
              gradient 
                ? `bg-white/50 dark:bg-black/20 ${iconColorMap[gradient]}` 
                : "bg-primary/10 text-primary"
            )}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h3 className="font-bold text-foreground tracking-tight">{title}</h3>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div 
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
