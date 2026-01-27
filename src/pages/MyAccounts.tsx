import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileAccounts, DesktopAccounts } from "@/components/accounts";

export default function MyAccounts() {
  const { isDesktopMode } = useDesktopMode();

  if (isDesktopMode) {
    return <DesktopAccounts />;
  }

  return <MobileAccounts />;
}
