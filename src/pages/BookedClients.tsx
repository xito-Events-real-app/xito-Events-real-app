import { useDesktopMode } from "@/hooks/useDesktopMode";
import MobileBookedClients from "@/components/booked/MobileBookedClients";
import DesktopBookedClients from "@/components/booked/DesktopBookedClients";

const BookedClients = () => {
  const { isDesktopMode } = useDesktopMode();

  // Use desktop view only if desktop mode is explicitly enabled
  // Default to mobile view for all users
  if (isDesktopMode) {
    return <DesktopBookedClients />;
  }

  return <MobileBookedClients />;
};

export default BookedClients;
