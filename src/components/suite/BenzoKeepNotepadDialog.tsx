import { useState, useEffect } from "react";
import { StickyNote, Loader2, UserPlus, Search, User, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { saveUnassignedBenzoKeepNote, assignBenzoKeepNoteToClient, getClientsForNoteAssignment, ClientData } from "@/lib/sheets-api";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";
import { BookingCalendarMini } from "@/components/shared/BookingCalendarMini";

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
  const [content, setContent] = useState('');
  const [markerColor, setMarkerColor] = useState<MarkerColor>('yellow');
  const [isSaving, setIsSaving] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedColorConfig = MARKER_COLORS.find(c => c.id === markerColor) || MARKER_COLORS[0];

  const resetForm = () => {
    setContent('');
    setMarkerColor('yellow');
    setShowClientPicker(false);
    setSearchQuery("");
    setSelectedClientId(null);
  };

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const data = await getClientsForNoteAssignment();
      const sorted = data.sort((a, b) => {
        const dateA = a.registeredDateTimeAD || '';
        const dateB = b.registeredDateTimeAD || '';
        return dateB.localeCompare(dateA);
      });
      setClients(sorted);
    } catch (error) {
      console.error("Failed to load clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (showClientPicker && clients.length === 0) {
      loadClients();
    }
  }, [showClientPicker]);

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.clientName?.toLowerCase().includes(query) ||
      client.contactNo?.includes(query) ||
      client.whatsappNo?.includes(query)
    );
  });

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

  const handleAssignClick = () => {
    if (!content.trim()) {
      toast.error("Please write something before assigning");
      return;
    }
    setShowClientPicker(true);
  };

  const handleAssignToClient = async (client: ClientData) => {
    if (!client.registeredDateTimeAD) {
      toast.error("Invalid client data");
      return;
    }

    setSelectedClientId(client.registeredDateTimeAD);
    setIsSaving(true);
    try {
      const noteData = {
        content: content.trim(),
        markerColor,
        lastUpdated: new Date().toISOString(),
      };
      
      await assignBenzoKeepNoteToClient(client.registeredDateTimeAD, JSON.stringify(noteData));
      toast.success(`Note assigned to ${client.clientName}`);
      resetForm();
      onOpenChange(false);
      onNoteSaved?.();
    } catch (error) {
      console.error("Failed to assign note:", error);
      toast.error("Failed to assign note to client");
    } finally {
      setIsSaving(false);
      setSelectedClientId(null);
    }
  };

  // Client Picker View
  if (showClientPicker) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle>Assign Note to Client</DialogTitle>
          </DialogHeader>

          {/* Note Preview */}
          <div className={cn("rounded-lg p-3 mb-2 border", selectedColorConfig.bg, selectedColorConfig.border)}>
            <p className="text-xs text-gray-600 font-medium mb-1">Note to assign:</p>
            <p className="text-sm text-gray-700 line-clamp-2">{content}</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>

          {/* Client List */}
          <ScrollArea className="flex-1 -mx-2 px-2">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? "No clients match your search" : "No clients available"}
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.registeredDateTimeAD;
                  
                  return (
                    <button
                      key={client.registeredDateTimeAD}
                      onClick={() => handleAssignToClient(client)}
                      disabled={isSaving}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                        "hover:bg-violet-50 border border-transparent hover:border-violet-200",
                        isSelected && "bg-violet-100 border-violet-300"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {client.clientName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {client.events && (
                            <span className="truncate">{client.events}</span>
                          )}
                          {client.eventMonth && client.eventYear && (
                            <span className="text-gray-400">
                              • {client.eventMonth} {client.eventYear}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientPicker(false)} disabled={isSaving}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main Notepad View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-white text-gray-900", isMobile ? "max-w-xl" : "max-w-[90vw] w-full max-h-[85vh]")}>
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
          /* Mobile: single column */
          <div className="py-2 space-y-4">
            {/* Color Picker */}
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
                      color.bg,
                      color.border,
                      markerColor === color.id ? `ring-2 ${color.ring} ring-offset-2` : ''
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Note</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your notes here... Dates like 'Magh 25' will show matching events in Xito Search."
                className={cn(
                  "min-h-[250px] resize-none text-gray-900 placeholder:text-gray-400 border-2",
                  selectedColorConfig.bg,
                  selectedColorConfig.border
                )}
              />
            </div>
            <div className="text-xs text-gray-500">
              💡 Save unassigned or assign to a client directly
            </div>
          </div>
        ) : (
          /* Desktop: 3-column layout */
          <div className="grid grid-cols-4 gap-4 py-2 min-h-[400px] max-h-[60vh]">
            {/* Left: Xito Search */}
            <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
              <XitoSearchPanel noteContent={content} />
            </div>

            {/* Center: Note Editor */}
            <div className="col-span-2 space-y-4">
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
                        color.bg,
                        color.border,
                        markerColor === color.id ? `ring-2 ${color.ring} ring-offset-2` : ''
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Note</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes here... Dates like 'Magh 25' will show matching events in Xito Search."
                  className={cn(
                    "min-h-[300px] resize-none text-gray-900 placeholder:text-gray-400 border-2",
                    selectedColorConfig.bg,
                    selectedColorConfig.border
                  )}
                />
              </div>
              <div className="text-xs text-gray-500">
                💡 Save unassigned or assign to a client directly
              </div>
            </div>

            {/* Right: Booking Calendar */}
            <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
              <BookingCalendarMini />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveUnassigned}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <StickyNote className="w-4 h-4" />
            )}
            Save Unassigned
          </Button>
          <Button
            onClick={handleAssignClick}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
