import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AudioProvider } from "./contexts/AudioContext";
import SuiteLanding from "./pages/SuiteLanding";
import Dashboard from "./pages/Dashboard";
import QuickAdd from "./pages/QuickAdd";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import FreshClients from "./pages/FreshClients";
import Today from "./pages/Today";
import HandlerClients from "./pages/HandlerClients";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AudioProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
            
            {/* Coming Soon Modules */}
            <Route path="/booked-clients" element={<ComingSoon moduleId="booked-clients" />} />
            <Route path="/finance" element={<ComingSoon moduleId="finance-manager" />} />
            <Route path="/tasks" element={<ComingSoon moduleId="daily-task-manager" />} />
            <Route path="/video-edit" element={<ComingSoon moduleId="video-edit-tracker" />} />
            <Route path="/photo-edit" element={<ComingSoon moduleId="photo-edit-tracker" />} />
            <Route path="/files" element={<ComingSoon moduleId="file-management" />} />
            <Route path="/media" element={<ComingSoon moduleId="album-media" />} />
            <Route path="/vendors" element={<ComingSoon moduleId="vendors" />} />
            <Route path="/freelancers" element={<ComingSoon moduleId="freelancers" />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AudioProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
