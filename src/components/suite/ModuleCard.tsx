import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight, TrendingUp, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

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
          "bg-white border border-gray-200 shadow-sm",
          "hover:border-gray-300 hover:shadow-md",
          "hover:scale-[1.01] active:scale-[0.99]"
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
                "bg-gradient-to-br shadow-md",
                gradient
              )}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-emerald-700 transition-colors">
                  {name}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {description}
                </p>
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Stats row */}
            {stats && (stats.primary || stats.activity) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs">
                  {stats.primary && (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="font-medium">{stats.primary}</span>
                    </div>
                  )}
                  {stats.activity && (
                    <div className="flex items-center gap-1.5 text-gray-500">
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
        "bg-white border border-gray-200 shadow-sm",
        "hover:border-gray-300 hover:shadow-lg",
        "hover:scale-[1.02] active:scale-[0.98]"
      )}>
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
              "bg-gradient-to-br shadow-lg",
              gradient
            )}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-xl group-hover:text-emerald-700 transition-colors">
                {name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {description}
              </p>
            </div>
            
            <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
          </div>

          {/* Stats Section */}
          {stats && (
            <div className="space-y-2 pt-4 border-t border-gray-100">
              {stats.primary && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">{stats.primary}</span>
                </div>
              )}
              {stats.secondary && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-600">{stats.secondary}</span>
                </div>
              )}
              {stats.activity && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 truncate">{stats.activity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
