import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  UserPlus,
  Users,
  Phone,
  MessageSquare,
  PhoneOff,
  FileText,
  SendHorizontal,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  CalendarX,
  AlertTriangle,
  Snowflake,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface StatusConfig {
  icon: React.ElementType;
  color: string;
  label: string;
}

interface CategoryStat {
  status: string;
  count: number;
  config: StatusConfig;
}

interface DesktopSidebarProps {
  categories: CategoryStat[];
  specialCategories?: CategoryStat[];
  selectedCategory: string | null;
  onCategoryFilter: (category: string | null) => void;
  totalClients?: number;
}

// Get icon for status
const getStatusIcon = (status: string) => {
  const s = status.toUpperCase();
  if (s.includes('JUST ENQUIRED')) return Users;
  if (s.includes('NUMBER PROVIDED')) return Phone;
  if (s.includes('TEXTED')) return MessageSquare;
  if (s.includes('CALL NOT')) return PhoneOff;
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return FileText;
  if (s.includes('QUOTATION SENT')) return SendHorizontal;
  if (s.includes('BARGAINING')) return Scale;
  if (s.includes('ADVANCE PENDING')) return Clock;
  if (s.includes('BOOKED')) return CheckCircle;
  if (s.includes('CANCELLED')) return XCircle;
  if (s.includes('POSTPONED')) return CalendarX;
  if (s === 'LOST') return XCircle;
  if (s === 'ALMOST LOST') return AlertTriangle;
  if (s === 'COLD DATES') return Snowflake;
  return Users;
};

export function DesktopSidebar({ 
  categories,
  specialCategories = [],
  selectedCategory,
  onCategoryFilter,
  totalClients = 0,
}: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r z-40 flex flex-col transition-all duration-300",
        "bg-[hsl(220,25%,10%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Back to Suite */}
      <div className={cn(
        "h-14 flex items-center border-b border-[hsl(220,20%,18%)] px-3 gap-2",
        isCollapsed ? "justify-center" : "justify-start"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className={cn(
            "text-white/70 hover:text-white hover:bg-white/10",
            isCollapsed ? "w-10 h-10 p-0" : "gap-2"
          )}
        >
          <LayoutGrid className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm">Back to Suite</span>}
        </Button>
      </div>

      {/* Module Title */}
      <div className={cn(
        "px-4 py-3 border-b border-[hsl(220,20%,18%)]",
        isCollapsed && "px-2"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">Client Tracker</h1>
              <p className="text-[10px] text-white/60">Manage leads & inquiries</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Scrollable Content - Categories Only */}
      <ScrollArea className="flex-1 py-3">
        {/* Category Filter Section */}
        <div className="px-3">
          {!isCollapsed && (
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
              Categories
            </h3>
          )}
          <div className="space-y-1">
            {/* All Categories Option */}
            <button
              onClick={() => onCategoryFilter(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                selectedCategory === null
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                selectedCategory === null ? "bg-white/20" : "bg-white/10"
              )}>
                <Users className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">All Categories</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    selectedCategory === null ? "bg-white/20" : "bg-white/10"
                  )}>
                    {totalClients}
                  </span>
                </>
              )}
            </button>

            {/* Individual Categories */}
            {categories.map(({ status, count, config }) => {
              const Icon = getStatusIcon(status);
              const isSelected = selectedCategory === status;
              
              return (
                <button
                  key={status}
                  onClick={() => onCategoryFilter(isSelected ? null : status)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    isSelected
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    config.color
                  )}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium flex-1 text-left truncate">{config.label}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isSelected ? "bg-white/20" : "bg-white/10 text-white/80"
                      )}>
                        {count}
                      </span>
                    </>
                  )}
                </button>
              );
            })}

            {/* Special Categories Separator */}
            {specialCategories.length > 0 && (
              <>
                <Separator className="my-2 bg-white/20" />
                {specialCategories.map(({ status, count, config }) => {
                  const Icon = getStatusIcon(status);
                  const isSelected = selectedCategory === status;
                  
                  return (
                    <button
                      key={status}
                      onClick={() => onCategoryFilter(isSelected ? null : status)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                        isSelected
                          ? "bg-primary text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                        config.color
                      )}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="text-sm font-medium flex-1 text-left truncate">{config.label}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            isSelected ? "bg-white/20" : "bg-white/10 text-white/80"
                          )}>
                            {count}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Quick Actions at Bottom */}
      <div className="border-t border-white/10 py-2 px-2 space-y-1">
        <Link
          to="/client-tracker/quick-add"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <UserPlus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Add Client</span>}
        </Link>
        <Link
          to="/client-tracker/search"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Search className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Search</span>}
        </Link>
        <Link
          to="/client-tracker/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
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
