import { X, Users, Settings, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Users, label: "Fresh Clients", path: "/fresh-clients" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: Info, label: "About", path: "/about" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-background border-l border-border z-50 shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            WTN Client Tracker v1.0
          </p>
        </div>
      </div>
    </>
  );
}
