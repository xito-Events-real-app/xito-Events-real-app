import { LayoutDashboard, Image, Film, CreditCard, UserCircle, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalTab = 'dashboard' | 'photos' | 'videos' | 'payment' | 'details' | 'album' | 'references';
interface PortalBottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  albumCount?: number;
}

const tabs: { id: PortalTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'references', label: 'Ideas', icon: Sparkles },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'album', label: 'My Album', icon: BookOpen },
  { id: 'videos', label: 'Videos', icon: Film },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'details', label: 'My Profile', icon: UserCircle },
];

const PortalBottomNav = ({ activeTab, onTabChange, albumCount }: PortalBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-1.5 min-w-[44px] transition-all duration-300 relative",
                isActive ? "text-[hsl(350,80%,65%)]" : "text-gray-400 active:text-gray-600"
              )}
            >
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[hsl(350,80%,65%)] shadow-[0_0_8px_hsl(350,80%,65%/0.6)]" />
              )}
              <div className="relative">
                <Icon className={cn("h-4.5 w-4.5 transition-transform duration-300", isActive && "scale-110")} />
                {tab.id === 'album' && albumCount !== undefined && albumCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] rounded-full bg-[hsl(350,80%,65%)] text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {albumCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[8px] font-medium tracking-wide", isActive && "font-semibold")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalBottomNav;
