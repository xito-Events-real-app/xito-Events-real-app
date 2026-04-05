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
import { FloatingYouTubePlayerProvider } from "./contexts/FloatingYouTubePlayerContext";
import { FloatingYouTubePlayer } from "./components/shared/FloatingYouTubePlayer";
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
import PotentialDelete from "./pages/PotentialDelete";
import EditedFiles from "./pages/EditedFiles";
import XitoDrive from "./pages/XitoDrive";
import PCloudDrive from "./pages/PCloudDrive";
import BarunsResearch from "./pages/BarunsResearch";
import ClientPortal from "./pages/ClientPortal";
import EditorPortal from "./pages/EditorPortal";
import { EditedFilesUploadProvider } from "./components/edited-files/EditedFilesUploadContext";
import { UploadProgressTracker } from "./components/edited-files/UploadProgressTracker";
import { PCloudUploadProvider } from "./contexts/PCloudUploadContext";
import { PCloudUploadTracker } from "./components/pcloud-drive/PCloudUploadTracker";
import { XitoDriveUploadProvider } from "./contexts/XitoDriveUploadContext";
import { XitoUploadTracker } from "./components/xito-drive/XitoUploadTracker";
import { YouTubeUploadProvider } from "./contexts/YouTubeUploadContext";
import { YouTubeUploadTracker } from "./components/suite/YouTubeUploadTracker";
import { StartupAnnouncementPopup } from "./components/suite/StartupAnnouncementPopup";
import { XitoTransferPopupProvider } from "./contexts/XitoTransferPopupContext";
import { FloatingXitoTransfer } from "./components/shared/FloatingXitoTransfer";
import XitoTransfer from "./pages/XitoTransfer";

const queryClient = new QueryClient();

function WtnFilesAnnouncement() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  return <WtnFilesAnnouncementDialog user={user} onNavigate={() => navigate('/files?section=files')} />;
}

const PUBLIC_PREFIXES = ['/client-portal', '/crew-schedule', '/editor-portal', '/client-form', '/login'];

function isPublicRoute() {
  return PUBLIC_PREFIXES.some(p => window.location.pathname.startsWith(p));
}

function AdminOnlyFeatures() {
  const { user } = useAuthContext();
  if (!user || isPublicRoute()) return null;
  return (
    <>
      <WtnFilesAnnouncement />
      <StartupAnnouncementPopup />
      <SaugatSearch />
      <FloatingBookingCalendar />
      <FloatingBenzoKeep />
      <FloatingYouTubePlayer />
      <FloatingXitoTransfer />
      <UploadProgressTracker />
      <PCloudUploadTracker />
      <XitoUploadTracker />
      <YouTubeUploadTracker />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SaugatSearchProvider>
        <BookingCalendarPopupProvider>
           <BenzoKeepPopupProvider>
          <EditedFilesUploadProvider>
          <PCloudUploadProvider>
          <XitoDriveUploadProvider>
          <YouTubeUploadProvider>
          <XitoTransferPopupProvider>
          <BrowserRouter>
           <FloatingYouTubePlayerProvider>
            <AuthProvider>
              <AdminOnlyFeatures />
              <Toaster />
              <Sonner />
            <Routes>
              {/* Public routes - no auth required */}
              <Route path="/client-form/:clientName/:clientId" element={<ClientContactForm />} />
              <Route path="/client-portal/:clientName/:clientId" element={<ClientPortal />} />
              <Route path="/crew-schedule/:freelancerName" element={<CrewSchedule />} />
              <Route path="/editor-portal/:editorName" element={<EditorPortal />} />
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
               <Route path="/xito-transfer" element={<ProtectedRoute><XitoTransfer /></ProtectedRoute>} />
              <Route path="/photo-edit" element={<ProtectedRoute><ComingSoon moduleId="photo-edit-tracker" /></ProtectedRoute>} />
              <Route path="/files" element={<ProtectedRoute><FileManagement /></ProtectedRoute>} />
              <Route path="/files/client/:clientId" element={<ProtectedRoute><FileClientDetail /></ProtectedRoute>} />
              <Route path="/media" element={<ProtectedRoute><ComingSoon moduleId="album-media" /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
              <Route path="/my-accounts" element={<ProtectedRoute><MyAccounts /></ProtectedRoute>} />
              <Route path="/benzo-keep" element={<ProtectedRoute><BenzoKeepPage /></ProtectedRoute>} />
              <Route path="/freelancers" element={<ProtectedRoute><Freelancers /></ProtectedRoute>} />
              <Route path="/freelancer/:freelancerName" element={<ProtectedRoute><FreelancerProfile /></ProtectedRoute>} />
              <Route path="/potential-delete" element={<ProtectedRoute><PotentialDelete /></ProtectedRoute>} />
              <Route path="/edited-files" element={<ProtectedRoute><EditedFiles /></ProtectedRoute>} />
              <Route path="/xito-drive" element={<ProtectedRoute><XitoDrive /></ProtectedRoute>} />
              <Route path="/pcloud-drive" element={<ProtectedRoute><PCloudDrive /></ProtectedRoute>} />
              <Route path="/baruns-research" element={<ProtectedRoute><BarunsResearch /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
           </FloatingYouTubePlayerProvider>
          </BrowserRouter>
           </XitoTransferPopupProvider>
           </YouTubeUploadProvider>
          </XitoDriveUploadProvider>
          </PCloudUploadProvider>
          </EditedFilesUploadProvider>
           </BenzoKeepPopupProvider>
        </BookingCalendarPopupProvider>
      </SaugatSearchProvider>
      </TooltipProvider>
  </QueryClientProvider>
);

export default App;
