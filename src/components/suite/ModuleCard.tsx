import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight, TrendingUp, Clock, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNPR } from "@/lib/client-card-utils";

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  gradient: string;
  stats?: {
    primary?: string;
    secondary?: string;
    activity?: string;
  };
  isCompact?: boolean;
}

export function ModuleCard({
  id,
  name,
  description,
  icon: Icon,
  path,
  gradient,
  stats,
  isCompact = false,
}: ModuleCardProps) {
  if (isCompact) {
    return (
      <Link to={path} className="block group">
        <div className={cn(
          "relative overflow-hidden rounded-xl transition-all duration-300",
          "bg-slate-800/80 backdrop-blur-sm border border-slate-700/50",
          "hover:border-slate-500/50 hover:shadow-xl hover:shadow-black/20",
          "hover:scale-[1.02] active:scale-[0.98]"
        )}>
          {/* Gradient accent bar */}
          <div className={cn(
            "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
            gradient
          )} />
          
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                "bg-gradient-to-br shadow-lg",
                gradient
              )}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg truncate group-hover:text-emerald-300 transition-colors">
                  {name}
                </h3>
                <p className="text-sm text-slate-400 truncate">
                  {description}
                </p>
              </div>
              
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Stats row */}
            {stats && (stats.primary || stats.activity) && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-4 text-xs">
                  {stats.primary && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{stats.primary}</span>
                    </div>
                  )}
                  {stats.activity && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="truncate">{stats.activity}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={path} className="block group">
      <div className={cn(
        "relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-slate-800/80 backdrop-blur-sm border border-slate-700/50",
        "hover:border-slate-500/50 hover:shadow-2xl hover:shadow-black/30",
        "hover:scale-[1.03] active:scale-[0.98]"
      )}>
        {/* Background gradient effect */}
        <div className={cn(
          "absolute inset-0 opacity-10 bg-gradient-to-br",
          gradient
        )} />
        
        {/* Gradient accent bar */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
          gradient
        )} />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn(
              "w-16 h-16 rounded-xl flex items-center justify-center shrink-0",
              "bg-gradient-to-br shadow-xl",
              gradient
            )}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-xl group-hover:text-emerald-300 transition-colors">
                {name}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {description}
              </p>
            </div>
            
            <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mt-1" />
          </div>

          {/* Stats Section */}
          {stats && (
            <div className="space-y-2 pt-4 border-t border-slate-700/50">
              {stats.primary && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{stats.primary}</span>
                </div>
              )}
              {stats.secondary && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-amber-400">{stats.secondary}</span>
                </div>
              )}
              {stats.activity && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400 truncate">{stats.activity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
