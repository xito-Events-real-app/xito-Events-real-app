import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, StickyNote, Loader2, Search } from "lucide-react";
import { useBenzoKeepPopup } from "@/contexts/BenzoKeepPopupContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMemoryClients, setMemoryClients } from "@/lib/memory-cache";
import { notifyCacheUpdate } from "@/lib/cache-manager";
import { saveUnassignedBenzoKeepNote, assignBenzoKeepNoteToClient, ClientData } from "@/lib/sheets-api";
import { parseBenzoKeepNotes } from "@/components/client-detail/BenzoKeepDialog";
import { supabase } from "@/integrations/supabase/client";

const MIN_W = 320, MIN_H = 350, MAX_W = 700, MAX_H = 650;
const DEFAULT_W = 380, DEFAULT_H = 500;

const MARKER_COLORS = [
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-200', border: 'border-yellow-400', ring: 'ring-yellow-500' },
  { id: 'green', name: 'Green', bg: 'bg-green-200', border: 'border-green-400', ring: 'ring-green-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-200', border: 'border-pink-400', ring: 'ring-pink-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-200', border: 'border-blue-400', ring: 'ring-blue-500' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-200', border: 'border-orange-400', ring: 'ring-orange-500' },
] as const;

type MarkerColor = typeof MARKER_COLORS[number]['id'];

export function FloatingBenzoKeep() {
  const { isOpen, close } = useBenzoKeepPopup();
  const [pos, setPos] = useState({ x: window.innerWidth - DEFAULT_W - 24, y: window.innerHeight - DEFAULT_H - 24 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // State
  const [content, setContent] = useState("");
  const [markerColor, setMarkerColor] = useState<MarkerColor>("yellow");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const recentClients = useMemo(() => {
    if (!isOpen) return [];
    const clients = getMemoryClients();
    if (!clients) return [];
    return [...clients]
      .sort((a, b) => {
        const da = a.registeredDateTimeAD || "";
        const db = b.registeredDateTimeAD || "";
        return db.localeCompare(da);
      })
      .slice(0, 100);
  }, [isOpen]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return recentClients.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return recentClients.filter(c =>
      c.clientName?.toLowerCase().includes(q) ||
      c.contactNo?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [recentClients, searchQuery]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setMarkerColor("yellow");
      setSelectedClient(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Load existing note when client selected
  const handleSelectClient = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setSearchQuery("");
    if (client.benzoKeepNotes) {
      const parsed = parseBenzoKeepNotes(client.benzoKeepNotes);
      if (parsed) {
        setContent(parsed.content || "");
        setMarkerColor((parsed.markerColor as MarkerColor) || "yellow");
      }
    } else {
      setContent("");
      setMarkerColor("yellow");
    }
  }, []);

  // Save unassigned
  const handleSaveUnassigned = async () => {
    if (!content.trim()) { toast.error("Write something first"); return; }
    setIsSaving(true);
    try {
      await saveUnassignedBenzoKeepNote({
        id: `note_${Date.now()}`,
        content: content.trim(),
        markerColor,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
      toast.success("Note saved to unassigned pool");
      setContent(""); setMarkerColor("yellow");
    } catch { toast.error("Failed to save note"); }
    finally { setIsSaving(false); }
  };

  // Save to client
  const handleSaveToClient = async () => {
    if (!content.trim()) { toast.error("Write something first"); return; }
    if (!selectedClient?.registeredDateTimeAD) return;
    setIsSaving(true);
    try {
      const noteData = { content: content.trim(), markerColor, lastUpdated: new Date().toISOString() };
      const noteJson = JSON.stringify(noteData);
      await assignBenzoKeepNoteToClient(selectedClient.registeredDateTimeAD, noteJson);
      try {
        const { data: updated } = await supabase
          .from('clients_cache')
          .update({ benzo_keep_notes: noteJson, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
          .eq('registered_date_time_ad', selectedClient.registeredDateTimeAD)
          .select('registered_date_time_ad');
        if (!updated?.length && selectedClient.clientName) {
          await supabase
            .from('clients_cache')
            .update({ benzo_keep_notes: noteJson, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
            .eq('client_name', selectedClient.clientName);
        }
      } catch {}
      const memClients = getMemoryClients();
      if (memClients) {
        setMemoryClients(memClients.map(c =>
          c.registeredDateTimeAD === selectedClient.registeredDateTimeAD
            ? { ...c, benzoKeepNotes: noteJson } : c
        ));
      }
      notifyCacheUpdate('clients');
      toast.success(`Note saved to ${selectedClient.clientName}`);
      setContent(""); setMarkerColor("yellow"); setSelectedClient(null);
    } catch { toast.error("Failed to save note"); }
    finally { setIsSaving(false); }
  };

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizing.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        setPos({ x: dragging.current.origX + e.clientX - dragging.current.startX, y: dragging.current.origY + e.clientY - dragging.current.startY });
      }
      if (resizing.current) {
        setSize({
          w: Math.min(MAX_W, Math.max(MIN_W, resizing.current.origW + e.clientX - resizing.current.startX)),
          h: Math.min(MAX_H, Math.max(MIN_H, resizing.current.origH + e.clientY - resizing.current.startY)),
        });
      }
    };
    const onUp = () => { dragging.current = null; resizing.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  if (!isOpen) return null;

  const isUpdating = selectedClient && selectedClient.benzoKeepNotes;

  return createPortal(
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 250 }}
      className="rounded-xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Header */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950/40 cursor-grab active:cursor-grabbing border-b border-border shrink-0"
      >
        <span className="text-xs font-bold text-violet-700 dark:text-violet-300 tracking-wide flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          Benzo Keep
        </span>
        <button onClick={close} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
        {/* Client selector */}
        {selectedClient ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedClient.clientName}</p>
              <p className="text-xs text-muted-foreground">{isUpdating ? "Updating note" : "New note"}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setSelectedClient(null); setContent(""); setMarkerColor("yellow"); }}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="shrink-0 space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <ScrollArea className="max-h-[140px]">
              <div className="space-y-0.5">
                {filteredClients.map(client => (
                  <button
                    key={client.registeredDateTimeAD}
                    onClick={() => handleSelectClient(client)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/80 text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="font-medium text-foreground truncate flex-1">{client.clientName}</span>
                    {client.benzoKeepNotes && <StickyNote className="w-3 h-3 text-violet-500 shrink-0" />}
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center">No clients found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Color picker */}
        <div className="flex items-center gap-1.5 shrink-0">
          {MARKER_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => setMarkerColor(color.id)}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all",
                color.bg, color.border,
                markerColor === color.id ? `ring-2 ${color.ring} ring-offset-1` : "opacity-60 hover:opacity-100"
              )}
              title={color.name}
            />
          ))}
        </div>

        {/* Note textarea */}
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your note..."
          className="flex-1 text-sm resize-none min-h-[80px]"
        />

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!selectedClient && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveUnassigned}
              disabled={isSaving || !content.trim()}
              className="gap-1.5 text-xs flex-1"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5" />}
              Save Unassigned
            </Button>
          )}
          {selectedClient && (
            <Button
              size="sm"
              onClick={handleSaveToClient}
              disabled={isSaving || !content.trim()}
              className="gap-1.5 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5" />}
              {isUpdating ? `Save to ${selectedClient.clientName}` : `Assign to ${selectedClient.clientName}`}
            </Button>
          )}
        </div>
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
