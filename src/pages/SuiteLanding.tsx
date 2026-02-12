import { useDesktopMode } from "@/hooks/useDesktopMode";
import { useNavigate } from "react-router-dom";
import { MobileSuiteLanding } from "@/components/suite/MobileSuiteLanding";
import { DesktopSuiteLanding } from "@/components/suite/DesktopSuiteLanding";
import { AllClientsAnnouncementDialog } from "@/components/suite/AllClientsAnnouncementDialog";

export default function SuiteLanding() {
  const { isDesktopMode } = useDesktopMode();
  const navigate = useNavigate();

  // Navigate to booked clients where ALL CLIENTS crew table lives
  const handleGoToAllClients = () => {
    navigate("/booked-clients");
  };

  return (
    <>
      <AllClientsAnnouncementDialog onNavigate={handleGoToAllClients} />
      {isDesktopMode ? <DesktopSuiteLanding /> : <MobileSuiteLanding />}
    </>
  );
}
