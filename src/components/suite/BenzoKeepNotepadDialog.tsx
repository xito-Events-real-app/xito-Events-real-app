import { useState, useEffect } from "react";
import { StickyNote, Loader2, UserPlus, User, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { saveUnassignedBenzoKeepNote, assignBenzoKeepNoteToClient, getClientsForNoteAssignment, addClient, ClientData } from "@/lib/sheets-api";
import { parseBenzoKeepNotes } from "@/components/client-detail/BenzoKeepDialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useDropdownData } from "@/hooks/useDropdownData";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";
import { BenzoDateConverter } from "@/components/shared/BenzoDateConverter";
import { updateClientFieldInCache } from "@/lib/clients-supabase-cache";
import { supabase } from "@/integrations/supabase/client";
import { getMemoryClients, setMemoryClients } from "@/lib/memory-cache";
import { notifyCacheUpdate } from "@/lib/cache-manager";
import { BookingCalendarMini } from "@/components/shared/BookingCalendarMini";
import { BenzoKeepClientPanel, QuickClientData } from "@/components/suite/BenzoKeepClientPanel";

const MARKER_COLORS = [
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-200', border: 'border-yellow-400', ring: 'ring-yellow-500' },
  { id: 'green', name: 'Green', bg: 'bg-green-200', border: 'border-green-400', ring: 'ring-green-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-200', border: 'border-pink-400', ring: 'ring-pink-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-200', border: 'border-blue-400', ring: 'ring-blue-500' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-200', border: 'border-orange-400', ring: 'ring-orange-500' },
] as const;

type MarkerColor = 'yellow' | 'green' | 'pink' | 'blue' | 'orange';

interface BenzoKeepNotepadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved?: () => void;
}

export function BenzoKeepNotepadDialog({ open, onOpenChange, onNoteSaved }: BenzoKeepNotepadDialogProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: dropdownData } = useDropdownData();

  const [content, setContent] = useState('');
  const [markerColor, setMarkerColor] = useState<MarkerColor>('yellow');
  const [isSaving, setIsSaving] = useState(false);

  // Client panel state
  const [quickClientData, setQuickClientData] = useState<QuickClientData>({ clientName: '', contactNo: '', whatsappNo: '', source: '', clientHandler: '', initialStatus: '', events: '', eventYear: '', eventMonth: '', eventDay: '' });
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [recentClients, setRecentClients] = useState<ClientData[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientPanelOpen, setClientPanelOpen] = useState(false);

  const selectedColorConfig = MARKER_COLORS.find(c => c.id === markerColor) || MARKER_COLORS[0];

  const resetForm = () => {
    setContent('');
    setMarkerColor('yellow');
    setQuickClientData({ clientName: '', contactNo: '', whatsappNo: '', source: '', clientHandler: '', initialStatus: '', events: '', eventYear: '', eventMonth: '', eventDay: '' });
    setSelectedClient(null);
    setClientPanelOpen(false);
  };

  // Load recent clients when dialog opens
  useEffect(() => {
    if (open && recentClients.length === 0) {
      setIsLoadingClients(true);
      getClientsForNoteAssignment()
        .then((data) => {
          const sorted = data.sort((a, b) => {
            const dateA = a.registeredDateTimeAD || '';
            const dateB = b.registeredDateTimeAD || '';
            return dateB.localeCompare(dateA);
          });
          setRecentClients(sorted);
        })
        .catch(() => toast.error("Failed to load clients"))
        .finally(() => setIsLoadingClients(false));
    }
  }, [open]);

  // Handle client selection — load their Keep notes + auto-fill form fields
  const handleSelectClient = (client: ClientData | null) => {
    setSelectedClient(client);
    if (client) {
      // Auto-fill form fields with client data
      setQuickClientData({
        clientName: client.clientName || '',
        contactNo: client.contactNo || '',
        whatsappNo: client.whatsappNo || '',
        source: client.source || '',
        clientHandler: client.clientHandler || '',
        initialStatus: client.initialStatus || '',
        events: client.events || '',
        eventYear: client.eventYear || '',
        eventMonth: client.eventMonth || '',
        eventDay: client.eventDay || '',
      });
      // Load their Benzo Keep notes — or clear if none
      if (client.benzoKeepNotes) {
        const parsed = parseBenzoKeepNotes(client.benzoKeepNotes);
        if (parsed) {
          setContent(parsed.content);
          setMarkerColor(parsed.markerColor);
        } else {
          setContent('');
          setMarkerColor('yellow');
        }
      } else {
        setContent('');
        setMarkerColor('yellow');
      }
    }
  };

  const sources = dropdownData?.sources || [];
  const handlers = dropdownData?.whatsappOwners || [];
  const statuses = dropdownData?.clientStatuses || [];

  const handleOpenFullForm = () => {
    onOpenChange(false);
    navigate('/client-tracker/quick-add');
  };

  const handleSaveUnassigned = async () => {
    if (!content.trim()) {
      toast.error("Please write something before saving");
      return;
    }
    setIsSaving(true);
    try {
      const note = {
        id: Date.now().toString(),
        content: content.trim(),
        markerColor,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await saveUnassignedBenzoKeepNote(note);
      toast.success("Note saved to unassigned pool");
      resetForm();
      onOpenChange(false);
      onNoteSaved?.();
    } catch (error) {
      console.error("Failed to save unassigned note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWithClient = async () => {
    if (!content.trim()) {
      toast.error("Please write something before saving");
      return;
    }

    if (selectedClient) {
      if (!selectedClient.registeredDateTimeAD) {
        toast.error("Invalid client data");
        return;
      }
      setIsSaving(true);
      try {
        const noteData = {
          content: content.trim(),
          markerColor,
          lastUpdated: new Date().toISOString(),
        };
        await assignBenzoKeepNoteToClient(selectedClient.registeredDateTimeAD, JSON.stringify(noteData));
        try {
          // Try exact match first, then fallback to client name match (handles date format differences)
          const noteJson = JSON.stringify(noteData);
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
        } catch (cacheErr) {
          console.warn("Cache update failed (non-blocking):", cacheErr);
        }
        window.dispatchEvent(new CustomEvent('cache-updated', { detail: { type: 'clients-invalidate' } }));
        toast.success(`Note assigned to ${selectedClient.clientName}`);
        resetForm();
        onOpenChange(false);
        onNoteSaved?.();
      } catch (error) {
        console.error("Failed to assign note:", error);
        toast.error("Failed to assign note");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!quickClientData.clientName.trim()) {
      toast.error("Enter a client name or select a recent client");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const registeredDateTimeAD = now.toISOString();

      const noteData = {
        content: content.trim(),
        markerColor,
        lastUpdated: new Date().toISOString(),
      };
      const benzoKeepNotesJson = JSON.stringify(noteData);

      const newClient: ClientData = {
        clientName: quickClientData.clientName.trim(),
        contactNo: quickClientData.contactNo.trim(),
        whatsappNo: quickClientData.whatsappNo.trim(),
        source: quickClientData.source,
        clientHandler: quickClientData.clientHandler,
        initialStatus: quickClientData.initialStatus,
        events: quickClientData.events,
        eventYear: quickClientData.eventYear,
        eventMonth: quickClientData.eventMonth,
        eventDay: quickClientData.eventDay,
        registeredDateTimeAD,
        benzoKeepNotes: benzoKeepNotesJson,
      };

      // 1) Insert into database FIRST (cache-first architecture)
      const { error: insertError } = await supabase.from('clients_cache').upsert({
        registered_date_time_ad: registeredDateTimeAD,
        client_name: quickClientData.clientName.trim(),
        contact_no: quickClientData.contactNo.trim(),
        whatsapp_no: quickClientData.whatsappNo.trim(),
        source: quickClientData.source,
        client_handler: quickClientData.clientHandler,
        status_log: quickClientData.initialStatus
          ? `${now.toLocaleString()} - ${quickClientData.initialStatus}`
          : '',
        events: quickClientData.events,
        event_year: quickClientData.eventYear,
        event_month: quickClientData.eventMonth,
        event_day: quickClientData.eventDay,
        benzo_keep_notes: benzoKeepNotesJson,
        sheet_source: 'tracker',
        synced_to_sheet: false,
      } as any, { onConflict: 'registered_date_time_ad' } as any);

      if (insertError) {
        console.error('Database insert failed:', insertError);
        throw insertError;
      }

      // 2) Update memory cache + notify UI
      const memClients = getMemoryClients();
      if (memClients) {
        setMemoryClients([newClient, ...memClients]);
      }
      notifyCacheUpdate('clients');

      // 3) Sync to Sheets in background (non-blocking)
      addClient(newClient).catch(err => console.warn('Sheet sync failed:', err));
      assignBenzoKeepNoteToClient(registeredDateTimeAD, benzoKeepNotesJson).catch(err => console.warn('Sheet note sync failed:', err));

      toast.success(`Client "${quickClientData.clientName}" created & note assigned`);
      resetForm();
      onOpenChange(false);
      onNoteSaved?.();
    } catch (error) {
      console.error("Failed to create client and assign note:", error);
      toast.error("Failed to create client");
    } finally {
      setIsSaving(false);
    }
  };

  const hasClientTarget = selectedClient || quickClientData.clientName.trim();
  const assignButtonLabel = selectedClient
    ? `Assign to ${selectedClient.clientName}`
    : quickClientData.clientName.trim()
      ? `Create "${quickClientData.clientName}" + Assign`
      : "Assign to Client";

  // Shared color picker
  const colorPicker = (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">Marker Color</Label>
      <div className="flex gap-2">
        {MARKER_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => setMarkerColor(color.id as MarkerColor)}
            className={cn(
              "w-8 h-8 rounded-full transition-all border-2",
              color.bg, color.border,
              markerColor === color.id ? `ring-2 ${color.ring} ring-offset-2` : ''
            )}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );

  // Shared note textarea
  const noteTextarea = (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">Note</Label>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your notes here... Dates like 'Magh 25' will show matching events in Xito Search."
        className={cn(
          isMobile ? "min-h-[200px]" : "min-h-[300px]",
          "resize-none text-gray-900 placeholder:text-gray-400 border-2",
          selectedColorConfig.bg, selectedColorConfig.border
        )}
      />
    </div>
  );

  const clientPanelProps = {
    quickData: quickClientData,
    onQuickDataChange: setQuickClientData,
    selectedClient,
    onSelectClient: handleSelectClient,
    recentClients,
    isLoadingClients,
    sources,
    handlers,
    statuses,
    onOpenFullForm: handleOpenFullForm,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-white text-gray-900",
        isMobile
          ? "max-w-xl"
          : "w-screen h-screen max-w-none max-h-none rounded-none flex flex-col"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            Benzo Keep
          </DialogTitle>
          <DialogDescription>
            Write a note and save it unassigned or assign directly to a client
          </DialogDescription>
        </DialogHeader>

        {isMobile ? (
          /* Mobile: single column with collapsible client panel */
          <div className="py-2 space-y-4">
            <BenzoDateConverter />

            {/* Collapsible Client Panel */}
            <Collapsible open={clientPanelOpen} onOpenChange={setClientPanelOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-sm font-medium text-violet-700">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedClient ? `Client: ${selectedClient.clientName}` : "Client (optional)"}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", clientPanelOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="border rounded-lg p-3 bg-gray-50">
                  <BenzoKeepClientPanel {...clientPanelProps} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {colorPicker}
            {noteTextarea}
            <div className="text-xs text-gray-500">
              💡 Save unassigned or assign to a client directly
            </div>
          </div>
        ) : (
          /* Desktop: Top bar (client panel) + 3-column grid below */
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* TOP BAR: Client Panel */}
            <div className="border rounded-lg p-3 bg-gray-50 shrink-0">
              <BenzoKeepClientPanel {...clientPanelProps} layout="horizontal" />
            </div>

            {/* MAIN: 3-column grid — Xito Search | Note Editor | Booking Calendar */}
            <div className="grid grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
              {/* Left: Xito Search */}
              <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
                <XitoSearchPanel noteContent={content} />
              </div>

              {/* Center: Note Editor */}
              <div className="col-span-2 space-y-4 overflow-auto">
                <BenzoDateConverter />
                {colorPicker}
                {noteTextarea}
                <div className="text-xs text-gray-500">
                  💡 Save unassigned or assign to a client directly
                </div>
              </div>

              {/* Right: Booking Calendar */}
              <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
                <BookingCalendarMini />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveUnassigned}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
            Save Unassigned
          </Button>
          <Button
            onClick={handleSaveWithClient}
            disabled={isSaving || !hasClientTarget}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span className="truncate max-w-[200px]">{assignButtonLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
