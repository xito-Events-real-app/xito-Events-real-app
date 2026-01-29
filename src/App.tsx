import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import SuiteLanding from "./pages/SuiteLanding";
import Dashboard from "./pages/Dashboard";
import QuickAdd from "./pages/QuickAdd";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import FreshClients from "./pages/FreshClients";
import Today from "./pages/Today";
import HandlerClients from "./pages/HandlerClients";
import BookedClients from "./pages/BookedClients";
import FinanceManager from "./pages/FinanceManager";
import ComingSoon from "./pages/ComingSoon";
import Vendors from "./pages/Vendors";
import MyAccounts from "./pages/MyAccounts";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import ClientContactForm from "./pages/ClientContactForm";
import HotDates from "./pages/HotDates";

import { fullResyncAllBookedClients } from "./lib/sheets-api";

const queryClient = new QueryClient();

// Hourly auto-sync component for booked clients
function BookedClientsAutoSync() {
  useEffect(() => {
    // Auto-sync booked clients every hour
    const syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        console.log('[AUTO-SYNC] Hourly booked clients sync triggered');
        try {
          const result = await fullResyncAllBookedClients();
          console.log('[AUTO-SYNC] Complete:', result);
        } catch (error) {
          console.error('[AUTO-SYNC] Failed:', error);
        }
      }
    }, 60 * 60 * 1000); // 1 hour in milliseconds
    
    return () => clearInterval(syncInterval);
  }, []);
  
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <>
        <Toaster />
        <Sonner />
        <BookedClientsAutoSync />
        <BrowserRouter>
          <Routes>
            {/* Public Client Form - Isolated, no app access */}
            <Route path="/client-form/:clientId" element={<ClientContactForm />} />
            {/* Suite Landing */}
            <Route path="/" element={<SuiteLanding />} />
            
            {/* Client Tracker Module */}
            <Route path="/client-tracker" element={<Dashboard />} />
            <Route path="/client-tracker/quick-add" element={<QuickAdd />} />
            <Route path="/client-tracker/search" element={<Search />} />
            <Route path="/client-tracker/settings" element={<Settings />} />
            <Route path="/client-tracker/fresh-clients" element={<FreshClients />} />
            <Route path="/client-tracker/today" element={<Today />} />
            <Route path="/client-tracker/handler/:handlerName" element={<HandlerClients />} />
            <Route path="/client-tracker/client/:rowNumber" element={<ClientDetail />} />
            <Route path="/client-tracker/hot-dates" element={<HotDates />} />
            
            {/* Booked Clients Module */}
            <Route path="/booked-clients" element={<BookedClients />} />
            
            {/* Coming Soon Modules */}
            <Route path="/finance" element={<FinanceManager />} />
            <Route path="/tasks" element={<ComingSoon moduleId="daily-task-manager" />} />
            <Route path="/video-edit" element={<ComingSoon moduleId="video-edit-tracker" />} />
            <Route path="/photo-edit" element={<ComingSoon moduleId="photo-edit-tracker" />} />
            <Route path="/files" element={<ComingSoon moduleId="file-management" />} />
            <Route path="/media" element={<ComingSoon moduleId="album-media" />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/my-accounts" element={<MyAccounts />} />
            <Route path="/freelancers" element={<ComingSoon moduleId="freelancers" />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
