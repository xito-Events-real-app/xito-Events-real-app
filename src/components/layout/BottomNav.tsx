import { useState, useRef, useCallback } from "react";
import { Home, Plus, Search, LayoutGrid } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";

// Long press duration in ms
const LONG_PRESS_DURATION = 500;

interface NavItem {
  icon?: typeof Home;
  label?: string;
  path?: string;
  type?: "search";
}

const navItems: NavItem[] = [
  { icon: LayoutGrid, label: "Suite", path: "/" },
  { icon: Home, label: "Dashboard", path: "/client-tracker" },
  { icon: Plus, label: "Add Client", path: "/client-tracker/quick-add" },
  { type: "search", icon: Search, label: "Search", path: "/client-tracker/search" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDateConverter, setShowDateConverter] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Long press handlers for Search button
  const handleSearchTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setShowDateConverter(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handleSearchTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      navigate("/client-tracker/search");
    }
  }, [navigate]);

  const handleSearchTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            // Special handling for Search button with long-press
            if (item.type === "search") {
              const isActive = location.pathname === item.path;
              const Icon = item.icon!;
              
              return (
                <button
                  key="search"
                  onTouchStart={handleSearchTouchStart}
                  onTouchEnd={handleSearchTouchEnd}
                  onTouchCancel={handleSearchTouchCancel}
                  onMouseDown={handleSearchTouchStart}
                  onMouseUp={handleSearchTouchEnd}
                  onMouseLeave={handleSearchTouchCancel}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all press-effect",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all relative",
                      isActive && "gradient-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-colors",
                        isActive && "text-white"
                      )}
                    />
                    {/* Small indicator for long-press feature */}
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path;
            const Icon = item.icon!;

            return (
              <Link
                key={item.path}
                to={item.path!}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all press-effect",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isActive && "gradient-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive && "text-white"
                    )}
                  />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Date Converter Drawer - opens on Search long-press */}
      <DateConverterDrawer 
        isOpen={showDateConverter} 
        onClose={() => setShowDateConverter(false)} 
      />
    </>
  );
}
