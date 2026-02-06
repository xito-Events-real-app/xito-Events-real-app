import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopDailyTasks } from "@/components/tasks/DesktopDailyTasks";
import { MobileDailyTasks } from "@/components/tasks/MobileDailyTasks";

const DailyTasks = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileDailyTasks /> : <DesktopDailyTasks />;
};

export default DailyTasks;
