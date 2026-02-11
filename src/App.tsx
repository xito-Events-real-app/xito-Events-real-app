import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Login from "./pages/Login";
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
import DailyTasks from "./pages/DailyTasks";
import Vendors from "./pages/Vendors";
import MyAccounts from "./pages/MyAccounts";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import ClientContactForm from "./pages/ClientContactForm";
import HotDates from "./pages/HotDates";
import BenzoKeepPage from "./pages/BenzoKeepPage";
import Freelancers from "./pages/Freelancers";

const queryClient = new QueryClient();

// Global auto-sync component for all data sources
function GlobalAutoSync() {
  useEffect(() => {
    // Compulsory refresh on app open
    const triggerInitialRefresh = () => {
      if (navigator.onLine) {
        console.log('[GLOBAL-SYNC] App opened - triggering compulsory refresh');
        // Staggered invalidation to prevent debounce cancellation
        window.dispatchEvent(new CustomEvent('cache-updated', { 
          detail: { type: 'clients-invalidate' } 
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cache-updated', { 
            detail: { type: 'booked-clients-invalidate' } 
          }));
        }, 200);
      }
    };
    
    triggerInitialRefresh();
    
    // Hourly auto-refresh
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        console.log('[GLOBAL-SYNC] Hourly refresh triggered');
        window.dispatchEvent(new CustomEvent('cache-updated', { 
          detail: { type: 'clients-invalidate' } 
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cache-updated', { 
            detail: { type: 'booked-clients-invalidate' } 
          }));
        }, 200);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(syncInterval);
  }, []);
  
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes - no auth required */}
            <Route path="/client-form/:clientName/:clientId" element={<ClientContactForm />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <GlobalAutoSync />
                <SuiteLanding />
              </ProtectedRoute>
            } />
            
            {/* Client Tracker Module */}
            <Route path="/client-tracker" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/client-tracker/quick-add" element={<ProtectedRoute><QuickAdd /></ProtectedRoute>} />
            <Route path="/client-tracker/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/client-tracker/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/client-tracker/fresh-clients" element={<ProtectedRoute><FreshClients /></ProtectedRoute>} />
            <Route path="/client-tracker/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
            <Route path="/client-tracker/handler/:handlerName" element={<ProtectedRoute><HandlerClients /></ProtectedRoute>} />
            <Route path="/client-tracker/client/:rowNumber" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/client-tracker/hot-dates" element={<ProtectedRoute><HotDates /></ProtectedRoute>} />
            
            {/* Booked Clients Module */}
            <Route path="/booked-clients" element={<ProtectedRoute><BookedClients /></ProtectedRoute>} />
            
            {/* Other Modules */}
            <Route path="/finance" element={<ProtectedRoute><FinanceManager /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><DailyTasks /></ProtectedRoute>} />
            <Route path="/video-edit" element={<ProtectedRoute><ComingSoon moduleId="video-edit-tracker" /></ProtectedRoute>} />
            <Route path="/photo-edit" element={<ProtectedRoute><ComingSoon moduleId="photo-edit-tracker" /></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute><ComingSoon moduleId="file-management" /></ProtectedRoute>} />
            <Route path="/media" element={<ProtectedRoute><ComingSoon moduleId="album-media" /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
            <Route path="/my-accounts" element={<ProtectedRoute><MyAccounts /></ProtectedRoute>} />
            <Route path="/benzo-keep" element={<ProtectedRoute><BenzoKeepPage /></ProtectedRoute>} />
            <Route path="/freelancers" element={<ProtectedRoute><Freelancers /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
