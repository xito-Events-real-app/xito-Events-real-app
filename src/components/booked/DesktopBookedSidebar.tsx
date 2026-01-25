import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Camera,
  CalendarCheck,
  ArrowUp,
  ArrowDown,
  TrendingUp,
} from "lucide-react";

export type HotDatesSortOrder = 'ascending' | 'descending' | 'popularity';

interface DesktopBookedSidebarProps {
  totalClients: number;
  selectedCategory: string | null;
  onCategoryFilter: (category: string | null) => void;
  // Hot Dates filter props
  hotDatesSortOrder: HotDatesSortOrder;
  onSortChange: (sort: HotDatesSortOrder) => void;
  selectedMonth: string | null;
  onMonthFilter: (month: string | null) => void;
  availableMonths: { value: string; label: string }[];
  // Client filter props
  allClients: { name: string; registeredDateTimeAD: string }[];
  selectedClient: string | null;
  onClientFilter: (clientName: string | null) => void;
}

export function DesktopBookedSidebar({ 
  totalClients,
  selectedCategory,
  onCategoryFilter,
  hotDatesSortOrder,
  onSortChange,
  selectedMonth,
  onMonthFilter,
  availableMonths,
  allClients,
  selectedClient,
  onClientFilter,
}: DesktopBookedSidebarProps) {
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">Booked Clients</h1>
              <p className="text-[10px] text-white/60">Confirmed events</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Scrollable Content - Categories & Filters */}
      <ScrollArea className="flex-1 py-3">
        <div className="px-3">
          {!isCollapsed && (
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
              Categories
            </h3>
          )}
          <div className="space-y-1">
            {/* All Clients Option */}
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
                  <span className="text-sm font-medium flex-1 text-left">All Clients</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    selectedCategory === null ? "bg-white/20" : "bg-white/10"
                  )}>
                    {totalClients}
                  </span>
                </>
              )}
            </button>

            {/* Photographers Assignment */}
            <button
              onClick={() => onCategoryFilter('photographers')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                selectedCategory === 'photographers'
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-purple-500"
              )}>
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Photographers Assignment</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                    {totalClients}
                  </span>
                </>
              )}
            </button>
          </div>
          
          {/* Month Filter - Outside the box for prominence */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                Filter by Month
              </h3>
              <div className="px-1">
                <Select 
                  value={selectedMonth || "all"} 
                  onValueChange={(val) => onMonthFilter(val === "all" ? null : val)}
                >
                  <SelectTrigger className="w-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/50 text-white h-10">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,25%,15%)] border-white/20 z-50">
                    <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      All Months
                    </SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem 
                        key={month.value} 
                        value={month.value}
                        className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Client Filter - Outside the box for prominence */}
          {!isCollapsed && (
            <div className="mt-4">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                Filter by Client
              </h3>
              <div className="px-1">
                <Select 
                  value={selectedClient || "all"} 
                  onValueChange={(val) => onClientFilter(val === "all" ? null : val)}
                >
                  <SelectTrigger className="w-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/50 text-white h-10">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,25%,15%)] border-white/20 z-50 max-h-60">
                    <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      All Clients ({allClients.length})
                    </SelectItem>
                    {allClients.map((client) => (
                      <SelectItem 
                        key={client.registeredDateTimeAD} 
                        value={client.name}
                        className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                      >
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Hot Dates Sort Section */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                Hot Dates Sort
              </h3>
              
              {/* Sort Order Buttons */}
              <div className="space-y-1">
                <button
                  onClick={() => onSortChange('ascending')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    hotDatesSortOrder === 'ascending'
                      ? "bg-green-600 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    hotDatesSortOrder === 'ascending' ? "bg-white/20" : "bg-white/10"
                  )}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">Ascending</span>
                </button>
                
                <button
                  onClick={() => onSortChange('descending')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    hotDatesSortOrder === 'descending'
                      ? "bg-green-600 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    hotDatesSortOrder === 'descending' ? "bg-white/20" : "bg-white/10"
                  )}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">Descending</span>
                </button>
                
                <button
                  onClick={() => onSortChange('popularity')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    hotDatesSortOrder === 'popularity'
                      ? "bg-green-600 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    hotDatesSortOrder === 'popularity' ? "bg-white/20" : "bg-white/10"
                  )}>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">Most Events</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions at Bottom */}
      <div className="border-t border-white/10 py-2 px-2 space-y-1">
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
