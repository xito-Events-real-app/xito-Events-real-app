import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileVendors, DesktopVendors } from "@/components/vendors";

export default function Vendors() {
  const { isDesktopMode } = useDesktopMode();

  if (isDesktopMode) {
    return <DesktopVendors />;
  }

  return <MobileVendors />;
}
