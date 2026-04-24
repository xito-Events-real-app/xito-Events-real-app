import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopPhotoEditTracker } from "@/components/photo-edit/DesktopPhotoEditTracker";
import { MobilePhotoEditTracker } from "@/components/photo-edit/MobilePhotoEditTracker";

export default function PhotoEditTracker() {
  const isMobile = useIsMobile();
  return isMobile ? <MobilePhotoEditTracker /> : <DesktopPhotoEditTracker />;
}
