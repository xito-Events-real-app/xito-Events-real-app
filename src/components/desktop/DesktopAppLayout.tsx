import { ReactNode, useState, useMemo, cloneElement, isValidElement } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { getCurrentStatus } from "@/lib/sheets-api";
import { cn } from "@/lib/utils";
import { getStatusConfig, sortCategoriesByOrder, normalizeStatus } from "@/lib/status-config";

interface DesktopAppLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

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
  
  // Hot date filter state (format: "YEAR-MONTH-DAY" e.g. "2082-11-27")
  const [selectedHotDate, setSelectedHotDate] = useState<string | null>(null);

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

  // Compute categories from clients with proper ordering
  const categories = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    clients.forEach(client => {
      const rawStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
      if (rawStatus !== 'UNTOUCHED') {
        // Normalize to canonical status before counting
        const status = normalizeStatus(rawStatus);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });
    
    const categoryList = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        config: getStatusConfig(status)
      }));
    
    return sortCategoriesByOrder(categoryList);
  }, [clients]);

  // Filtered clients based on all filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Handler filter
      if (selectedHandler) {
        const handler = client.clientHandler || client.whoAdded || '';
        if (handler !== selectedHandler) return false;
      }
      // Category filter - normalize both sides for matching
      if (selectedCategory) {
        const status = normalizeStatus(getCurrentStatus(client.statusLog || '').toUpperCase());
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
      // Hot date filter - matches clients with events on specific Year-Month-Day
      if (selectedHotDate) {
        const [hYear, hMonth, hDay] = selectedHotDate.split('-').map(Number);
        const years = (client.eventYear || '').split('\n').filter(Boolean);
        const months = (client.eventMonth || '').split('\n').filter(Boolean);
        const days = (client.eventDay || '').split('\n').filter(Boolean);
        
        // Check if any event matches the hot date
        let hasMatch = false;
        for (let i = 0; i < Math.max(years.length, months.length, days.length); i++) {
          const y = parseInt(years[i]) || 0;
          const m = parseInt(months[i]) || 0;
          const d = parseInt(days[i]) || 0;
          if (y === hYear && m === hMonth && d === hDay) {
            hasMatch = true;
            break;
          }
        }
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [clients, selectedHandler, selectedCategory, selectedYear, selectedMonth, selectedDay, selectedHotDate]);

  // Check if any filter is active
  const hasActiveFilter = selectedHandler !== null || 
                          selectedCategory !== null || 
                          selectedYear !== null || 
                          selectedMonth !== null || 
                          selectedDay !== null ||
                          selectedHotDate !== null;

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
    setSelectedHotDate(null);
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
        selectedHotDate,
        onClearHandler: () => setSelectedHandler(null),
        onClearCategory: () => setSelectedCategory(null),
        onHotDateFilter: setSelectedHotDate,
        onClearHotDate: () => setSelectedHotDate(null),
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
  }, [children, filteredClients, clients, hasActiveFilter, selectedHandler, selectedCategory, selectedHotDate, handlers, handlerCounts, isSyncing, dropdowns, updateClient]);

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
          selectedHotDate={selectedHotDate}
          onClearHotDate={() => setSelectedHotDate(null)}
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
