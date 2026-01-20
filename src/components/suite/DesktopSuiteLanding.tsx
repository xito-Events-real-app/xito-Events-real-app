import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, Construction, Smartphone } from "lucide-react";
import { suiteModules } from "@/lib/suite-modules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDesktopMode } from "@/hooks/useDesktopMode";

export function DesktopSuiteLanding() {
  const { toggleDesktopMode } = useDesktopMode();
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');

  const handleComingSoonClick = (moduleName: string) => {
    toast.info(`${moduleName} is coming soon!`, {
      description: "We're working hard to bring you this feature.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Xito Business Suite</h1>
              <p className="text-sm text-muted-foreground">Your complete business toolkit</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDesktopMode}
            className="gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Switch to Mobile
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Active Modules */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-5 h-5 text-green-500" />
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Active Modules
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {activeModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.id} to={module.path}>
                  <Card className="shadow-soft border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-lg",
                          module.gradient
                        )}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xl text-foreground">
                            {module.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Coming Soon Modules */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Construction className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Coming Soon
            </h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.id}
                  className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] opacity-60"
                  onClick={() => handleComingSoonClick(module.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br grayscale",
                        module.gradient
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {module.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Coming Soon
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-muted-foreground">
            Xito Business Suite v1.0 • © 2024 Xito. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
