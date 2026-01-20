import { useIsMobile } from "@/hooks/use-mobile";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import MobileBookedClients from "@/components/booked/MobileBookedClients";
import DesktopBookedClients from "@/components/booked/DesktopBookedClients";

const BookedClients = () => {
  const isMobile = useIsMobile();
  const { isDesktopMode } = useDesktopMode();

  // Use desktop view if in desktop mode or on actual desktop
  if (isDesktopMode || !isMobile) {
    return <DesktopBookedClients />;
  }

  return <MobileBookedClients />;
};

export default BookedClients;
