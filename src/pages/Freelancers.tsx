import { useDesktopMode } from "@/hooks/useDesktopMode";
import { DesktopFreelancers } from "@/components/freelancers";

export default function Freelancers() {
  const { isDesktopMode } = useDesktopMode();

  // Desktop-only for now, show desktop layout always
  return <DesktopFreelancers />;
}
