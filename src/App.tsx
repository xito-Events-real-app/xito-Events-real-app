import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { WtnFilesAnnouncementDialog } from "./components/files/WtnFilesAnnouncementDialog";
import { SaugatSearchProvider } from "./contexts/SaugatSearchContext";
import { BookingCalendarPopupProvider } from "./contexts/BookingCalendarPopupContext";
import { BenzoKeepPopupProvider } from "./contexts/BenzoKeepPopupContext";
import { SaugatSearch } from "./components/suite/SaugatSearch";
import { FloatingBookingCalendar } from "./components/shared/FloatingBookingCalendar";
import { FloatingBenzoKeep } from "./components/shared/FloatingBenzoKeep";
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
import FileManagement from "./pages/FileManagement";
import DailyTasks from "./pages/DailyTasks";
import Vendors from "./pages/Vendors";
import MyAccounts from "./pages/MyAccounts";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import ClientContactForm from "./pages/ClientContactForm";
import HotDates from "./pages/HotDates";
import BenzoKeepPage from "./pages/BenzoKeepPage";
import Freelancers from "./pages/Freelancers";
import FreelancerProfile from "./pages/FreelancerProfile";
import CrewSchedule from "./pages/CrewSchedule";
import VideoEditTracker from "./pages/VideoEditTracker";
import FileClientDetail from "./pages/FileClientDetail";

const queryClient = new QueryClient();

function WtnFilesAnnouncement() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  return <WtnFilesAnnouncementDialog user={user} onNavigate={() => navigate('/files?section=files')} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SaugatSearchProvider>
        <BookingCalendarPopupProvider>
          <BenzoKeepPopupProvider>
          <BrowserRouter>
            <AuthProvider>
              <WtnFilesAnnouncement />
              <SaugatSearch />
              <FloatingBookingCalendar />
              <FloatingBenzoKeep />
              <Toaster />
              <Sonner />
            <Routes>
              {/* Public routes - no auth required */}
              <Route path="/client-form/:clientName/:clientId" element={<ClientContactForm />} />
              <Route path="/crew-schedule/:freelancerName" element={<CrewSchedule />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
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
              <Route path="/video-edit" element={<ProtectedRoute><VideoEditTracker /></ProtectedRoute>} />
              <Route path="/photo-edit" element={<ProtectedRoute><ComingSoon moduleId="photo-edit-tracker" /></ProtectedRoute>} />
              <Route path="/files" element={<ProtectedRoute><FileManagement /></ProtectedRoute>} />
              <Route path="/media" element={<ProtectedRoute><ComingSoon moduleId="album-media" /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
              <Route path="/my-accounts" element={<ProtectedRoute><MyAccounts /></ProtectedRoute>} />
              <Route path="/benzo-keep" element={<ProtectedRoute><BenzoKeepPage /></ProtectedRoute>} />
              <Route path="/freelancers" element={<ProtectedRoute><Freelancers /></ProtectedRoute>} />
              <Route path="/freelancer/:freelancerName" element={<ProtectedRoute><FreelancerProfile /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
          </BrowserRouter>
          </BenzoKeepPopupProvider>
        </BookingCalendarPopupProvider>
      </SaugatSearchProvider>
      </TooltipProvider>
  </QueryClientProvider>
);

export default App;
