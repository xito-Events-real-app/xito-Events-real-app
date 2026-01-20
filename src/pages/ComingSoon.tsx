import { useNavigate } from "react-router-dom";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suiteModules } from "@/lib/suite-modules";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";

interface ComingSoonProps {
  moduleId?: string;
}

export default function ComingSoon({ moduleId }: ComingSoonProps) {
  const navigate = useNavigate();
  const module = suiteModules.find(m => m.id === moduleId);
  const ModuleIcon = module?.icon || Construction;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Global Mode Toggle */}
      <GlobalModeToggle showMute={false} />

      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg truncate">
          {module?.name || "Coming Soon"}
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div 
            className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${module?.gradient || 'from-gray-500 to-slate-600'} flex items-center justify-center shadow-2xl`}
          >
            <ModuleIcon className="w-16 h-16 text-white" />
          </div>
          
          {/* Sparkle decorations */}
          <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-yellow-400 animate-pulse" />
          <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-center mb-3">
          {module?.name || "New Feature"}
        </h2>
        <p className="text-muted-foreground text-center max-w-sm mb-2">
          {module?.description || "This feature is under development."}
        </p>
        <p className="text-muted-foreground/70 text-sm text-center mb-8">
          We're working hard to bring you this feature soon!
        </p>

        {/* Construction Animation */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Construction className="w-4 h-4 text-yellow-500 animate-bounce" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Under Construction
          </span>
        </div>

        {/* Back Button */}
        <Button 
          onClick={() => navigate("/")}
          className="mt-8 gap-2"
          variant="outline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suite
        </Button>
      </div>
    </div>
  );
}
