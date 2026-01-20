import { Sparkles } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { suiteModules } from "@/lib/suite-modules";

export function MobileSuiteLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-8">
      {/* Header */}
      <header className="pt-safe px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">X</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Xito Business Suite
            </h1>
            <p className="text-sm text-muted-foreground">
              Your complete business toolkit
            </p>
          </div>
        </div>
      </header>

      {/* Active Modules Section */}
      <section className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-green-500" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Modules
          </h2>
        </div>
        <div className="space-y-3">
          {suiteModules
            .filter(m => m.status === 'active')
            .map(module => (
              <ModuleCard key={module.id} module={module} size="lg" />
            ))}
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="px-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Coming Soon
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {suiteModules
            .filter(m => m.status === 'coming-soon')
            .map(module => (
              <ModuleCard key={module.id} module={module} size="sm" />
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Xito Business Suite v1.0
        </p>
      </footer>
    </div>
  );
}
