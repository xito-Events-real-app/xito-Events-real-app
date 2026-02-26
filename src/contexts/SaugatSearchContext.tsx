import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface SaugatSearchContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SaugatSearchContext = createContext<SaugatSearchContextType | null>(null);

const SEARCH_SOUND_URL = "https://cdn.freesound.org/previews/270/270304_5123451-lq.mp3";
let searchAudio: HTMLAudioElement | null = null;

function playSearchSound() {
  try {
    if (!searchAudio) {
      searchAudio = new Audio(SEARCH_SOUND_URL);
      searchAudio.volume = 0.4;
    }
    searchAudio.currentTime = 0;
    searchAudio.play().catch(() => {});
    // Stop after 2 seconds
    setTimeout(() => {
      if (searchAudio) {
        searchAudio.pause();
        searchAudio.currentTime = 0;
      }
    }, 2000);
  } catch {}
}

export function SaugatSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    playSearchSound();
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) playSearchSound();
      return !prev;
    });
  }, []);

  // Global Ctrl+F / Cmd+F listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, close, isOpen]);

  return (
    <SaugatSearchContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SaugatSearchContext.Provider>
  );
}

export function useSaugatSearch() {
  const ctx = useContext(SaugatSearchContext);
  if (!ctx) throw new Error("useSaugatSearch must be used within SaugatSearchProvider");
  return ctx;
}
