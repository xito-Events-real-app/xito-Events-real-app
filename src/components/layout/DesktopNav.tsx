import { useState } from "react";
import { Home, Plus, Search, Users, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Users, label: "Fresh Clients", path: "/fresh-clients" },
  { icon: Plus, label: "Add Client", path: "/quick-add" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function DesktopNav() {
  const location = useLocation();
  const [showDateConverter, setShowDateConverter] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-border h-16">
        <div className="h-full max-w-7xl mx-auto px-8 flex items-center justify-between">
          {/* Logo/Brand - Left side with space for toggle */}
          <div className="flex items-center gap-4 pl-14">
            <h1 className="text-xl font-bold text-gradient-primary">WTN Client Tracker</h1>
          </div>

          {/* Navigation Links - Center */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive
                      ? "gradient-primary text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Actions - Right side */}
          <div className="flex items-center gap-3 pr-14">
            {/* Date Converter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDateConverter(true)}
              className="border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
            >
              🕉️ Date Converter
            </Button>
          </div>
        </div>
      </nav>

      {/* Date Converter Drawer */}
      <DateConverterDrawer 
        isOpen={showDateConverter} 
        onClose={() => setShowDateConverter(false)} 
      />
    </>
  );
}
