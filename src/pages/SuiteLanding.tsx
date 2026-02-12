import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileSuiteLanding } from "@/components/suite/MobileSuiteLanding";
import { DesktopSuiteLanding } from "@/components/suite/DesktopSuiteLanding";

export default function SuiteLanding() {
  const { isDesktopMode } = useDesktopMode();

  return isDesktopMode ? <DesktopSuiteLanding /> : <MobileSuiteLanding />;
}
