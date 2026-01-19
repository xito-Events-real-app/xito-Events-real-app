import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DesktopModeContextType {
  isDesktopMode: boolean;
  toggleDesktopMode: () => void;
}

const DesktopModeContext = createContext<DesktopModeContextType | undefined>(undefined);

export function DesktopModeProvider({ children }: { children: ReactNode }) {
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wtn_desktop_mode');
    if (saved === 'true') {
      setIsDesktopMode(true);
    }
  }, []);

  // Apply desktop mode class to document
  useEffect(() => {
    if (isDesktopMode) {
      document.documentElement.classList.add('desktop-mode');
      // Set viewport to desktop width
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=1024, initial-scale=0.5, maximum-scale=1');
      }
    } else {
      document.documentElement.classList.remove('desktop-mode');
      // Reset viewport to mobile
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  }, [isDesktopMode]);

  const toggleDesktopMode = () => {
    const newValue = !isDesktopMode;
    setIsDesktopMode(newValue);
    localStorage.setItem('wtn_desktop_mode', String(newValue));
    // Force page reload to apply all styles correctly
    window.location.reload();
  };

  return (
    <DesktopModeContext.Provider value={{ isDesktopMode, toggleDesktopMode }}>
      {children}
    </DesktopModeContext.Provider>
  );
}

export function useDesktopMode() {
  const context = useContext(DesktopModeContext);
  if (!context) {
    throw new Error("useDesktopMode must be used within DesktopModeProvider");
  }
  return context;
}
