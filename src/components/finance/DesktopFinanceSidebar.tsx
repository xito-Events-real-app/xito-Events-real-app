import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
} from "lucide-react";
import { getMonthName } from "@/lib/nepali-months";

export type PaymentStatus = 'all' | 'fully-paid' | 'partial' | 'no-payment';

interface HandlerData {
  name: string;
  count: number;
}

interface MonthData {
  value: string;
  label: string;
}

interface DesktopFinanceSidebarProps {
  totalClients: number;
  handlers: HandlerData[];
  selectedHandler: string | null;
  onHandlerFilter: (handler: string | null) => void;
  paymentFilter: PaymentStatus;
  onPaymentFilterChange: (status: PaymentStatus) => void;
  paymentCounts: {
    all: number;
    'fully-paid': number;
    partial: number;
    'no-payment': number;
  };
  selectedMonth: string | null;
  onMonthFilter: (month: string | null) => void;
  availableMonths: MonthData[];
}

export function DesktopFinanceSidebar({
  totalClients,
  handlers,
  selectedHandler,
  onHandlerFilter,
  paymentFilter,
  onPaymentFilterChange,
  paymentCounts,
  selectedMonth,
  onMonthFilter,
  availableMonths,
}: DesktopFinanceSidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const paymentStatuses: { value: PaymentStatus; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'all', label: 'All', icon: Users, color: 'bg-slate-500' },
    { value: 'fully-paid', label: 'Fully Paid', icon: CheckCircle, color: 'bg-green-500' },
    { value: 'partial', label: 'Partial', icon: AlertCircle, color: 'bg-amber-500' },
    { value: 'no-payment', label: 'No Payment', icon: XCircle, color: 'bg-red-500' },
  ];

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">Finance Manager</h1>
              <p className="text-[10px] text-white/60">Payment tracking</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 py-3">
        <div className="px-3">
          {/* Handler Filters Section */}
          {!isCollapsed && (
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
              Handlers
            </h3>
          )}
          <div className="space-y-1">
            {/* All Handlers Option */}
            <button
              onClick={() => onHandlerFilter(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                selectedHandler === null
                  ? "bg-emerald-600 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                selectedHandler === null ? "bg-white/20" : "bg-white/10"
              )}>
                <Users className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">All Handlers</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    selectedHandler === null ? "bg-white/20" : "bg-white/10"
                  )}>
                    {totalClients}
                  </span>
                </>
              )}
            </button>

            {/* Dynamic Handler Buttons */}
            {handlers.map((handler) => (
              <button
                key={handler.name}
                onClick={() => onHandlerFilter(handler.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  selectedHandler === handler.name
                    ? "bg-emerald-600 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-purple-500"
                )}>
                  <span className="text-[10px] font-bold text-white">
                    {handler.name.charAt(0)}
                  </span>
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">{handler.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                      {handler.count}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Payment Status Filters Section */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                Payment Status
              </h3>
              <div className="space-y-1">
                {paymentStatuses.map((status) => {
                  const Icon = status.icon;
                  return (
                    <button
                      key={status.value}
                      onClick={() => onPaymentFilterChange(status.value)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                        paymentFilter === status.value
                          ? "bg-emerald-600 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                        status.color
                      )}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left">{status.label}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        paymentFilter === status.value ? "bg-white/20" : "bg-white/10"
                      )}>
                        {paymentCounts[status.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month Filter Section */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                Filter by Month
              </h3>
              <div className="flex flex-col gap-1 px-1">
                {/* All Months Tab */}
                <button
                  onClick={() => onMonthFilter(null)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                    selectedMonth === null
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white border border-white/20"
                  )}
                >
                  ALL MONTHS
                </button>

                {/* Dynamic Month Tabs */}
                {availableMonths.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => onMonthFilter(month.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                      selectedMonth === month.value
                        ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white border border-white/20"
                    )}
                  >
                    {month.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions at Bottom */}
      <div className="border-t border-white/10 py-2 px-2 space-y-1">
        <button
          onClick={() => navigate("/client-tracker/search")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Search className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Search</span>}
        </button>
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
