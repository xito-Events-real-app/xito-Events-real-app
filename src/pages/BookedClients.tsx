import { useDesktopMode } from "@/hooks/useDesktopMode";
import MobileBookedClients from "@/components/booked/MobileBookedClients";
import { DesktopBookedAppLayout } from "@/components/booked/DesktopBookedAppLayout";

const BookedClients = () => {
  const { isDesktopMode } = useDesktopMode();

  // Use new desktop dashboard layout if desktop mode is enabled
  if (isDesktopMode) {
    return <DesktopBookedAppLayout />;
  }

  return <MobileBookedClients />;
};

export default BookedClients;
