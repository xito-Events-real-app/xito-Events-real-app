import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface DesktopSidebarProps {
  handlers: string[];
  handlerCounts: Record<string, number>;
  onHandlerClick: (handler: string) => void;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Fresh Clients", path: "/fresh-clients" },
  { icon: Calendar, label: "Today", path: "/today" },
  { icon: UserPlus, label: "Add Client", path: "/quick-add" },
  { icon: Search, label: "Search", path: "/search" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Settings", path: "/settings" },
];

// Handler avatar colors
const handlerColors = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-yellow-600',
];

export function DesktopSidebar({ handlers, handlerCounts, onHandlerClick }: DesktopSidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border z-40 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">WTN Tracker</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Client Management</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Handlers Section */}
        {handlers.length > 0 && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            <div className="px-4 mb-2">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Handlers
                </h3>
              )}
            </div>
            <div className="space-y-1 px-2">
              {handlers.map((handler, idx) => {
                const count = handlerCounts[handler] || 0;
                const colorClass = handlerColors[idx % handlerColors.length];
                const initials = handler.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                
                return (
                  <button
                    key={handler}
                    onClick={() => onHandlerClick(handler)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                      "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br text-white text-xs font-bold",
                      colorClass
                    )}>
                      {initials}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left truncate">{handler}</span>
                        <span className="text-xs bg-sidebar-accent px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border py-2 px-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-border shadow-sm hover:bg-muted p-0"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </aside>
  );
}
