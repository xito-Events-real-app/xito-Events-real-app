import { ReactNode, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { cn } from "@/lib/utils";

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
  } = useCachedData();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const handleHandlerClick = (handler: string) => {
    navigate(`/handler/${encodeURIComponent(handler)}?stay=true`);
  };

  const handleSync = async () => {
    await refreshData();
  };

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

      {/* Sidebar */}
      <DesktopSidebar
        handlers={handlers}
        handlerCounts={handlerCounts}
        onHandlerClick={handleHandlerClick}
      />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        {/* Header */}
        <DesktopHeader
          onSync={handleSync}
          isSyncing={isSyncing}
          searchQuery={showSearch ? searchQuery : undefined}
          onSearchChange={showSearch ? onSearchChange : undefined}
        />

        {/* Content */}
        <main className="bg-muted/30 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
