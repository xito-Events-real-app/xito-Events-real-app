import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface XitoTransferPopupContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const XitoTransferPopupContext = createContext<XitoTransferPopupContextType | null>(null);

export function XitoTransferPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastXTime = useRef<number>(0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
        return;
      }

      if (e.key === "x" || e.key === "X") {
        const el = document.activeElement;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable)
        ) {
          return;
        }

        const now = Date.now();
        if (now - lastXTime.current < 400) {
          e.preventDefault();
          toggle();
          lastXTime.current = 0;
        } else {
          lastXTime.current = now;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, close, isOpen]);

  return (
    <XitoTransferPopupContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </XitoTransferPopupContext.Provider>
  );
}

export function useXitoTransferPopup() {
  const ctx = useContext(XitoTransferPopupContext);
  if (!ctx) throw new Error("useXitoTransferPopup must be used within XitoTransferPopupProvider");
  return ctx;
}
