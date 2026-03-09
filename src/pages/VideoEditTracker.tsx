import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopVideoEditTracker } from "@/components/video-edit/DesktopVideoEditTracker";
import { MobileVideoEditTracker } from "@/components/video-edit/MobileVideoEditTracker";

export default function VideoEditTracker() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileVideoEditTracker /> : <DesktopVideoEditTracker />;
}
