import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileAccounts, DesktopAccounts } from "@/components/accounts";
import { AccountPasswordGate } from "@/components/accounts/AccountPasswordGate";

export default function MyAccounts() {
  const { isDesktopMode } = useDesktopMode();

  return (
    <AccountPasswordGate>
      {isDesktopMode ? <DesktopAccounts /> : <MobileAccounts />}
    </AccountPasswordGate>
  );
}
