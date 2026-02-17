import { useState, useEffect } from "react";
import { Search, User, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UnassignedBenzoNote } from "@/hooks/useUnassignedBenzoKeepNotes";
import { getClientsForNoteAssignment, transferBenzoKeepNote, ClientData } from "@/lib/sheets-api";
import { updateClientFieldInCache } from "@/lib/clients-supabase-cache";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AssignNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: UnassignedBenzoNote;
  onSuccess: () => void;
}

export function AssignNoteDialog({ open, onOpenChange, note, onSuccess }: AssignNoteDialogProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await getClientsForNoteAssignment();
      // Sort by registeredDateTimeAD descending (most recent first)
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
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.clientName?.toLowerCase().includes(query) ||
      client.contactNo?.includes(query) ||
      client.whatsappNo?.includes(query)
    );
  });

  const handleTransfer = async (client: ClientData) => {
    if (!client.registeredDateTimeAD) {
      toast.error("Invalid client data");
      return;
    }

    setSelectedClientId(client.registeredDateTimeAD);
    setIsTransferring(true);

    try {
      await transferBenzoKeepNote(note.id, client.registeredDateTimeAD);
      try {
        const noteData = JSON.stringify({
          content: note.content,
          markerColor: note.markerColor,
          lastUpdated: new Date().toISOString(),
        });
        await updateClientFieldInCache(client.registeredDateTimeAD!, 'benzoKeepNotes', noteData);
      } catch (cacheErr) {
        console.warn("Cache update failed (non-blocking):", cacheErr);
      }
      toast.success(`Note assigned to ${client.clientName}`, {
        action: {
          label: "View Client",
          onClick: () => navigate(`/client/${encodeURIComponent(client.registeredDateTimeAD!)}`),
        },
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to transfer note:", error);
      toast.error("Failed to assign note to client");
    } finally {
      setIsTransferring(false);
      setSelectedClientId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Note to Client</DialogTitle>
        </DialogHeader>

        {/* Note Preview */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
          <p className="text-xs text-amber-600 font-medium mb-1">Note to assign:</p>
          <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
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
          {isLoading ? (
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
                    onClick={() => handleTransfer(client)}
                    disabled={isTransferring}
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
                    {isSelected && isTransferring ? (
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
      </DialogContent>
    </Dialog>
  );
}
