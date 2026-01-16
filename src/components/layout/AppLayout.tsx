import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MuteButton } from "./MuteButton";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MuteButton />
      <main className="pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
