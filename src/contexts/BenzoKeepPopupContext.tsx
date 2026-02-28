import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface BenzoKeepPopupContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const BenzoKeepPopupContext = createContext<BenzoKeepPopupContextType | null>(null);

export function BenzoKeepPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastKTime = useRef<number>(0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
        return;
      }

      if (e.key.toLowerCase() === "k") {
        const el = document.activeElement;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable)
        ) return;

        const now = Date.now();
        if (now - lastKTime.current < 400) {
          e.preventDefault();
          toggle();
          lastKTime.current = 0;
        } else {
          lastKTime.current = now;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, close, isOpen]);

  return (
    <BenzoKeepPopupContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </BenzoKeepPopupContext.Provider>
  );
}

export function useBenzoKeepPopup() {
  const ctx = useContext(BenzoKeepPopupContext);
  if (!ctx) throw new Error("useBenzoKeepPopup must be used within BenzoKeepPopupProvider");
  return ctx;
}
