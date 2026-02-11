import { cn } from "@/lib/utils";
import { UserCog, Users, Camera, Video, Image, Film, Zap, Aperture, Plane } from "lucide-react";
import { LucideIcon } from "lucide-react";

const ROLE_CATEGORIES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'Photographer', label: 'Photographer', icon: Camera },
  { key: 'Videographer', label: 'Videographer', icon: Video },
  { key: 'Photo Editor', label: 'Photo Editor', icon: Image },
  { key: 'Video Editor', label: 'Video Editor', icon: Film },
  { key: 'Hybrid Shooter', label: 'Hybrid Shooter', icon: Aperture },
  { key: 'Hybrid Editor', label: 'Hybrid Editor', icon: Zap },
  { key: 'Drone/FPV Operator', label: 'Drone/FPV Operator', icon: Plane },
];

interface FreelancerTypeSidebarProps {
  roleCounts: Record<string, number>;
  selectedRole: string | null;
  onSelectRole: (role: string | null) => void;
  totalCount: number;
}

export function FreelancerTypeSidebar({
  roleCounts,
  selectedRole,
  onSelectRole,
  totalCount,
}: FreelancerTypeSidebarProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Role Categories
        </h2>
      </div>

      <div className="p-2">
        <button
          onClick={() => onSelectRole(null)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
            selectedRole === null
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Freelancers
          </span>
          <span className="bg-slate-600 text-slate-200 text-xs px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </button>
      </div>

      <div className="px-4 py-2">
        <div className="h-px bg-slate-700" />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {ROLE_CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelectRole(key)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left",
              selectedRole === key
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </span>
            {(roleCounts[key] || 0) > 0 && (
              <span className="bg-slate-600 text-slate-200 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                {roleCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
