import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, Construction } from "lucide-react";
import { suiteModules } from "@/lib/suite-modules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";

export function MobileSuiteLanding() {
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');

  const handleComingSoonClick = (moduleName: string) => {
    toast.info(`${moduleName} is coming soon!`, {
      description: "We're working hard to bring you this feature.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Global Mode Toggle */}
      <GlobalModeToggle />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Xito Business Suite</h1>
          <p className="text-sm text-muted-foreground">Your complete business toolkit</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">X</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in max-w-lg mx-auto">
        {/* Active Modules - Large Cards */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Active Modules
            </h3>
          </div>
          
          {activeModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} to={module.path}>
                <Card className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-lg",
                        module.gradient
                      )}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-foreground">
                          {module.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Coming Soon Modules - Grid */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Construction className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Coming Soon
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.id}
                  className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] opacity-60"
                  onClick={() => handleComingSoonClick(module.name)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br grayscale",
                        module.gradient
                      )}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {module.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
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
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Xito Business Suite v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
