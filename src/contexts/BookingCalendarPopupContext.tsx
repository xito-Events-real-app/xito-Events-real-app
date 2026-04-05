import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface BookingCalendarPopupContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const BookingCalendarPopupContext = createContext<BookingCalendarPopupContextType | null>(null);

export function BookingCalendarPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastBTime = useRef<number>(0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const p = window.location.pathname;
      if (p.startsWith('/client-portal') || p.startsWith('/crew-schedule') || p.startsWith('/editor-portal') || p.startsWith('/client-form') || p.startsWith('/login')) return;

      if (e.key === "Escape" && isOpen) {
        close();
        return;
      }

      if (!e.key) return;
      if (e.key.toLowerCase() === "b") {
        const el = document.activeElement;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable)
        ) return;

        const now = Date.now();
        if (now - lastBTime.current < 400) {
          e.preventDefault();
          toggle();
          lastBTime.current = 0;
        } else {
          lastBTime.current = now;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, close, isOpen]);

  return (
    <BookingCalendarPopupContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </BookingCalendarPopupContext.Provider>
  );
}

export function useBookingCalendarPopup() {
  const ctx = useContext(BookingCalendarPopupContext);
  if (!ctx) throw new Error("useBookingCalendarPopup must be used within BookingCalendarPopupProvider");
  return ctx;
}
