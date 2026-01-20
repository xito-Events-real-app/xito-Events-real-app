import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileFinanceManager, DesktopFinanceManager } from "@/components/finance";

const FinanceManager = () => {
  const { isDesktopMode } = useDesktopMode();

  if (isDesktopMode) {
    return <DesktopFinanceManager />;
  }

  return <MobileFinanceManager />;
};

export default FinanceManager;
