import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal } from "lucide-react";
import { useBookingCalendarPopup } from "@/contexts/BookingCalendarPopupContext";
import { BookingCalendarMini } from "./BookingCalendarMini";
import { ScrollArea } from "@/components/ui/scroll-area";

const MIN_W = 320, MIN_H = 300, MAX_W = 800, MAX_H = 700;
const DEFAULT_W = 380, DEFAULT_H = 450;

export function FloatingBookingCalendar() {
  const { isOpen, close } = useBookingCalendarPopup();
  const [pos, setPos] = useState({ x: window.innerWidth - DEFAULT_W - 24, y: window.innerHeight - DEFAULT_H - 24 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos]);

  // Resize handlers
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const dx = e.clientX - dragging.current.startX;
        const dy = e.clientY - dragging.current.startY;
        setPos({ x: dragging.current.origX + dx, y: dragging.current.origY + dy });
      }
      if (resizing.current) {
        const dx = e.clientX - resizing.current.startX;
        const dy = e.clientY - resizing.current.startY;
        setSize({
          w: Math.min(MAX_W, Math.max(MIN_W, resizing.current.origW + dx)),
          h: Math.min(MAX_H, Math.max(MIN_H, resizing.current.origH + dy)),
        });
      }
    };
    const onUp = () => {
      dragging.current = null;
      resizing.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 250,
      }}
      className="rounded-xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Header - draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2 bg-muted/80 cursor-grab active:cursor-grabbing border-b border-border shrink-0"
      >
        <span className="text-xs font-bold text-foreground tracking-wide">Booking Calendar</span>
        <button
          onClick={close}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <BookingCalendarMini />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground"
      >
        <GripHorizontal className="w-3 h-3 rotate-[-45deg]" />
      </div>
    </div>,
    document.body
  );
}
