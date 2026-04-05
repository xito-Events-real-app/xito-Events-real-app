import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

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
  const lastSpaceTime = useRef<number>(0);

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

  // Double-space listener (only when not in input/textarea/contenteditable)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const p = window.location.pathname;
      if (p.startsWith('/client-portal') || p.startsWith('/crew-schedule') || p.startsWith('/editor-portal') || p.startsWith('/client-form') || p.startsWith('/login')) return;

      if (e.key === "Escape" && isOpen) {
        close();
        return;
      }

      if (e.key === " ") {
        const el = document.activeElement;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable)
        ) {
          return;
        }

        const now = Date.now();
        if (now - lastSpaceTime.current < 400) {
          e.preventDefault();
          toggle();
          lastSpaceTime.current = 0;
        } else {
          lastSpaceTime.current = now;
        }
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
