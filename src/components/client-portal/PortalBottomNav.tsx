import { LayoutDashboard, Image, Film, CreditCard, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalTab = 'dashboard' | 'photos' | 'videos' | 'payment' | 'details';

interface PortalBottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

const tabs: { id: PortalTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'videos', label: 'Videos', icon: Film },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'details', label: 'My Info', icon: UserCircle },
];

const PortalBottomNav = ({ activeTab, onTabChange }: PortalBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(220,25%,5%)]/95 backdrop-blur-xl border-t border-white/[0.06] safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 px-2 min-w-[52px] transition-all duration-300 relative",
                isActive ? "text-[hsl(350,80%,65%)]" : "text-white/30 active:text-white/50"
              )}
            >
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[hsl(350,80%,65%)] shadow-[0_0_8px_hsl(350,80%,65%/0.6)]" />
              )}
              <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
              <span className={cn("text-[9px] font-medium tracking-wide", isActive && "font-semibold")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalBottomNav;
