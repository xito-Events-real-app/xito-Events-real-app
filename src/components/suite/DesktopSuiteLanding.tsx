import { Sparkles, Monitor } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { suiteModules } from "@/lib/suite-modules";
import { Button } from "@/components/ui/button";
import { useDesktopMode } from "@/hooks/useDesktopMode";

export function DesktopSuiteLanding() {
  const { toggleDesktopMode } = useDesktopMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,25%,8%)] via-[hsl(220,25%,10%)] to-[hsl(220,25%,14%)]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[hsl(220,25%,8%)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Xito Business Suite
              </h1>
              <p className="text-sm text-white/60">
                Your complete business toolkit
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleDesktopMode}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            <Monitor className="w-4 h-4" />
            Switch to Mobile
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to Your Business Hub
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Manage all aspects of your business from one centralized dashboard. 
            Click on a module to get started.
          </p>
        </div>

        {/* Active Modules */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              Active Modules
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suiteModules
              .filter(m => m.status === 'active')
              .map(module => (
                <ModuleCard key={module.id} module={module} size="lg" />
              ))}
          </div>
        </div>

        {/* Coming Soon Modules */}
        <div>
          <h3 className="text-lg font-semibold text-white/60 mb-6">
            Coming Soon
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {suiteModules
              .filter(m => m.status === 'coming-soon')
              .map(module => (
                <ModuleCard key={module.id} module={module} size="md" />
              ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-sm text-white/40">
            Xito Business Suite v1.0
          </p>
          <p className="text-sm text-white/40">
            © 2024 Xito. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
