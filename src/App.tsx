import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AudioProvider } from "./contexts/AudioContext";
import { DesktopModeProvider } from "./contexts/DesktopModeContext";
import Dashboard from "./pages/Dashboard";
import QuickAdd from "./pages/QuickAdd";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import FreshClients from "./pages/FreshClients";
import Today from "./pages/Today";
import HandlerClients from "./pages/HandlerClients";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AudioProvider>
        <DesktopModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quick-add" element={<QuickAdd />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/fresh-clients" element={<FreshClients />} />
              <Route path="/today" element={<Today />} />
              <Route path="/handler/:handlerName" element={<HandlerClients />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DesktopModeProvider>
      </AudioProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
