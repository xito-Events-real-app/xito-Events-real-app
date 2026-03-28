import { LayoutDashboard, Image, Film, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalTab = 'dashboard' | 'photos' | 'videos' | 'payment';

interface PortalBottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

const tabs: { id: PortalTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'photos', label: 'My Photos', icon: Image },
  { id: 'videos', label: 'My Videos', icon: Film },
  { id: 'payment', label: 'My Payment', icon: CreditCard },
];

const PortalBottomNav = ({ activeTab, onTabChange }: PortalBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(220,25%,6%)] border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors",
                isActive ? "text-primary" : "text-white/40"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalBottomNav;
