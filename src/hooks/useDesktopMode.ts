import { useState, useEffect } from "react";

const DESKTOP_MODE_KEY = "wtn_desktop_mode";

export function useDesktopMode() {
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DESKTOP_MODE_KEY);
    if (saved === "true") {
      setIsDesktopMode(true);
    }
  }, []);

  const toggleDesktopMode = () => {
    const newValue = !isDesktopMode;
    setIsDesktopMode(newValue);
    localStorage.setItem(DESKTOP_MODE_KEY, String(newValue));
    // Force a page reload to ensure all layouts update correctly
    window.location.reload();
  };

  const setDesktopMode = (value: boolean) => {
    setIsDesktopMode(value);
    localStorage.setItem(DESKTOP_MODE_KEY, String(value));
  };

  return { isDesktopMode, toggleDesktopMode, setDesktopMode };
}

// Utility function to check desktop mode without hook
export function getDesktopMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DESKTOP_MODE_KEY) === "true";
}
