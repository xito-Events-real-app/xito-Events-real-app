import { ReactNode, useState, useMemo, cloneElement, isValidElement } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { getCurrentStatus } from "@/lib/sheets-api";
import { cn } from "@/lib/utils";
import {
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
} from "lucide-react";

interface DesktopAppLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Get icon and color for each status category
const getStatusConfig = (status: string) => {
  const s = status.toUpperCase();
  if (s.includes('JUST ENQUIRED')) return { icon: Users, color: 'bg-emerald-600', label: 'Just Enquired' };
  if (s.includes('NUMBER PROVIDED')) return { icon: Phone, color: 'bg-teal-600', label: 'Number Provided' };
  if (s.includes('TEXTED')) return { icon: MessageSquare, color: 'bg-yellow-500', label: 'Texted' };
  if (s.includes('CALL NOT')) return { icon: PhoneOff, color: 'bg-orange-500', label: 'Call Not Received' };
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return { icon: FileText, color: 'bg-blue-500', label: 'Quotation Pending' };
  if (s.includes('QUOTATION SENT')) return { icon: SendHorizontal, color: 'bg-indigo-500', label: 'Quotation Sent' };
  if (s.includes('BARGAINING')) return { icon: Scale, color: 'bg-purple-500', label: 'Bargaining' };
  if (s.includes('ADVANCE PENDING')) return { icon: Clock, color: 'bg-pink-500', label: 'Advance Pending' };
  if (s.includes('BOOKED')) return { icon: CheckCircle, color: 'bg-green-500', label: 'Booked' };
  if (s.includes('CANCELLED')) return { icon: XCircle, color: 'bg-red-500', label: 'Cancelled' };
  if (s.includes('POSTPONED')) return { icon: CalendarX, color: 'bg-slate-500', label: 'Postponed' };
  return { icon: Users, color: 'bg-gray-500', label: status };
};

export function DesktopAppLayout({ 
  children, 
  showSearch = false,
  searchQuery,
  onSearchChange 
}: DesktopAppLayoutProps) {
  const navigate = useNavigate();
  const { 
    clients,
    dropdowns,
    isFromCache,
    isSyncing,
    lastSyncedAt,
    pendingSyncs,
    refreshData,
    updateClient,
  } = useCachedData();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Filter state
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Date filter state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Get handlers and their counts
  const handlers = dropdowns?.whatsappOwners || [];
  const handlerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      const handler = client.clientHandler || client.whoAdded || '';
      if (handler) {
        counts[handler] = (counts[handler] || 0) + 1;
      }
    });
    return counts;
  }, [clients]);

  // Compute categories from clients
  const categories = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      if (status !== 'UNTOUCHED') {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        config: getStatusConfig(status)
      }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Filtered clients based on all filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Handler filter
      if (selectedHandler) {
        const handler = client.clientHandler || client.whoAdded || '';
        if (handler !== selectedHandler) return false;
      }
      // Category filter
      if (selectedCategory) {
        const status = getCurrentStatus(client.statusLog || '').toUpperCase();
        if (status !== selectedCategory) return false;
      }
      // Date filters (BS dates from event columns)
      if (selectedYear) {
        const years = (client.eventYear || '').split('\n').filter(Boolean);
        if (!years.some(y => parseInt(y) === selectedYear)) return false;
      }
      if (selectedMonth) {
        const months = (client.eventMonth || '').split('\n').filter(Boolean);
        if (!months.some(m => parseInt(m) === selectedMonth)) return false;
      }
      if (selectedDay) {
        const days = (client.eventDay || '').split('\n').filter(Boolean);
        if (!days.some(d => parseInt(d) === selectedDay)) return false;
      }
      return true;
    });
  }, [clients, selectedHandler, selectedCategory, selectedYear, selectedMonth, selectedDay]);

  // Check if any filter is active
  const hasActiveFilter = selectedHandler !== null || 
                          selectedCategory !== null || 
                          selectedYear !== null || 
                          selectedMonth !== null || 
                          selectedDay !== null;

  // Get category label for display
  const categoryLabel = selectedCategory 
    ? getStatusConfig(selectedCategory).label 
    : undefined;

  const handleSync = async () => {
    await refreshData();
  };

  const handleClearAllFilters = () => {
    setSelectedHandler(null);
    setSelectedCategory(null);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  // Clone children and pass filter-related props
  const enhancedChildren = useMemo(() => {
    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        clients: filteredClients,
        allClients: clients,
        hasActiveFilter,
        selectedHandler,
        selectedCategory,
        onClearHandler: () => setSelectedHandler(null),
        onClearCategory: () => setSelectedCategory(null),
        onClearAllFilters: handleClearAllFilters,
        handlers,
        handlerCounts,
        isLoading: false,
        onSync: handleSync,
        isSyncing,
        dropdowns,
        onClientUpdate: updateClient,
      });
    }
    return children;
  }, [children, filteredClients, clients, hasActiveFilter, selectedHandler, selectedCategory, handlers, handlerCounts, isSyncing, dropdowns, updateClient]);

  const totalClients = clients.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sync Status Indicator */}
      <SyncStatusIndicator 
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        isFromCache={isFromCache}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
      />

      {/* Sidebar - Categories Only */}
      <DesktopSidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryFilter={setSelectedCategory}
        totalClients={totalClients}
      />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        {/* Header with Handler + Date Filters */}
        <DesktopHeader
          onSync={handleSync}
          isSyncing={isSyncing}
          handlers={handlers}
          handlerCounts={handlerCounts}
          selectedHandler={selectedHandler}
          onHandlerFilter={setSelectedHandler}
          selectedCategory={selectedCategory}
          categoryLabel={categoryLabel}
          onClearCategory={() => setSelectedCategory(null)}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedDay={selectedDay}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          onDayChange={setSelectedDay}
          onClearAllFilters={handleClearAllFilters}
          hasActiveFilter={hasActiveFilter}
          filteredCount={filteredClients.length}
        />

        {/* Content */}
        <main className="bg-muted/30 min-h-[calc(100vh-56px)]">
          {enhancedChildren}
        </main>
      </div>
    </div>
  );
}
