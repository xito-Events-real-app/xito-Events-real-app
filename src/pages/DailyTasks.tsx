import { useDesktopMode } from "@/hooks/useDesktopMode";
import { DesktopDailyTasks } from "@/components/tasks/DesktopDailyTasks";

const DailyTasks = () => {
  const { isDesktopMode } = useDesktopMode();

  // For now, both views use the desktop component
  // A mobile-specific view can be added later
  return <DesktopDailyTasks />;
};

export default DailyTasks;
