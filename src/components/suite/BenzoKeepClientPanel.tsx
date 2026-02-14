import { useState } from "react";
import { User, ExternalLink, X, Loader2, Phone, MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ClientData } from "@/lib/sheets-api";

export interface QuickClientData {
  clientName: string;
  contactNo: string;
  whatsappNo: string;
  source: string;
}

interface BenzoKeepClientPanelProps {
  quickData: QuickClientData;
  onQuickDataChange: (data: QuickClientData) => void;
  selectedClient: ClientData | null;
  onSelectClient: (client: ClientData | null) => void;
  recentClients: ClientData[];
  isLoadingClients: boolean;
  sources: string[];
  onOpenFullForm: () => void;
  layout?: 'vertical' | 'horizontal';
}

export function BenzoKeepClientPanel({
  quickData,
  onQuickDataChange,
  selectedClient,
  onSelectClient,
  recentClients,
  isLoadingClients,
  sources,
  onOpenFullForm,
  layout = 'vertical',
}: BenzoKeepClientPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = recentClients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.clientName?.toLowerCase().includes(q) ||
      c.contactNo?.includes(q) ||
      c.whatsappNo?.includes(q)
    );
  });

  const handleClearSelection = () => {
    onSelectClient(null);
    onQuickDataChange({ clientName: "", contactNo: "", whatsappNo: "", source: "" });
  };

  // Selected client detail view
  if (selectedClient) {
    if (layout === 'horizontal') {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected:</h4>
            <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-900">{selectedClient.clientName}</span>
              {selectedClient.contactNo && <span className="text-xs text-gray-500">• {selectedClient.contactNo}</span>}
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={handleClearSelection}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <RecentClientsList
              clients={filteredClients}
              isLoading={isLoadingClients}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={onSelectClient}
              selectedId={selectedClient.registeredDateTimeAD}
              layout="horizontal"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected Client</h4>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClearSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <p className="font-semibold text-sm text-gray-900 truncate">{selectedClient.clientName}</p>
          </div>
          {selectedClient.contactNo && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="w-3 h-3" /> {selectedClient.contactNo}
            </div>
          )}
          {selectedClient.whatsappNo && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MessageCircle className="w-3 h-3" /> {selectedClient.whatsappNo}
            </div>
          )}
          {selectedClient.events && (
            <p className="text-xs text-gray-500">{selectedClient.events} • {selectedClient.eventMonth} {selectedClient.eventYear}</p>
          )}
          {selectedClient.source && (
            <p className="text-xs text-gray-400">Source: {selectedClient.source}</p>
          )}
        </div>

        <p className="text-[10px] text-gray-400 text-center">Note will be assigned to this client</p>

        <RecentClientsList
          clients={filteredClients}
          isLoading={isLoadingClients}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={onSelectClient}
          selectedId={selectedClient.registeredDateTimeAD}
        />
      </div>
    );
  }

  // Horizontal layout for top bar
  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-4">
        {/* Quick-add fields inline */}
        <div className="flex items-center gap-2 shrink-0">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">New Client:</h4>
          <Input
            value={quickData.clientName}
            onChange={(e) => onQuickDataChange({ ...quickData, clientName: e.target.value })}
            placeholder="Name"
            className="h-7 text-xs w-28"
          />
          <Input
            value={quickData.contactNo}
            onChange={(e) => onQuickDataChange({ ...quickData, contactNo: e.target.value })}
            placeholder="Phone"
            className="h-7 text-xs w-24"
            type="tel"
          />
          <Input
            value={quickData.whatsappNo}
            onChange={(e) => onQuickDataChange({ ...quickData, whatsappNo: e.target.value })}
            placeholder="WhatsApp"
            className="h-7 text-xs w-24"
            type="tel"
          />
          <Select value={quickData.source} onValueChange={(v) => onQuickDataChange({ ...quickData, source: v })}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600 px-1.5" onClick={onOpenFullForm}>
            <ExternalLink className="w-3 h-3" /> Full Form
          </Button>
        </div>
        {/* Recent clients inline */}
        <div className="flex-1 min-w-0">
          <RecentClientsList
            clients={filteredClients}
            isLoading={isLoadingClients}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={onSelectClient}
            selectedId={null}
            layout="horizontal"
          />
        </div>
      </div>
    );
  }

  // Vertical quick-add form view
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Add Client</h4>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-violet-600 px-1.5" onClick={onOpenFullForm}>
          <ExternalLink className="w-3 h-3" /> Full Form
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-[11px] text-gray-500">Name</Label>
          <Input
            value={quickData.clientName}
            onChange={(e) => onQuickDataChange({ ...quickData, clientName: e.target.value })}
            placeholder="Client name"
            className="h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-500">Contact</Label>
            <Input
              value={quickData.contactNo}
              onChange={(e) => onQuickDataChange({ ...quickData, contactNo: e.target.value })}
              placeholder="Phone"
              className="h-8 text-xs"
              type="tel"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500">WhatsApp</Label>
            <Input
              value={quickData.whatsappNo}
              onChange={(e) => onQuickDataChange({ ...quickData, whatsappNo: e.target.value })}
              placeholder="WhatsApp"
              className="h-8 text-xs"
              type="tel"
            />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-gray-500">Source</Label>
          <Select value={quickData.source} onValueChange={(v) => onQuickDataChange({ ...quickData, source: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-2 mt-auto">
        <RecentClientsList
          clients={filteredClients}
          isLoading={isLoadingClients}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={onSelectClient}
          selectedId={null}
        />
      </div>
    </div>
  );
}

// Sub-component for the recent clients list
function RecentClientsList({
  clients,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelect,
  selectedId,
  layout = 'vertical',
}: {
  clients: ClientData[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (client: ClientData) => void;
  selectedId: string | null | undefined;
  layout?: 'vertical' | 'horizontal';
}) {
  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Recent:</h4>
        <div className="relative shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="h-7 text-xs pl-7 w-32"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : clients.length === 0 ? (
            <p className="text-xs text-gray-400">{searchQuery ? "No match" : "No clients"}</p>
          ) : (
            clients.slice(0, 10).map((client) => (
              <button
                key={client.registeredDateTimeAD}
                onClick={() => onSelect(client)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0",
                  "hover:bg-violet-50 border",
                  selectedId === client.registeredDateTimeAD ? "bg-violet-100 border-violet-300" : "border-gray-200"
                )}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="font-medium text-gray-900">{client.clientName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Clients</h4>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="h-7 text-xs pl-7"
        />
      </div>
      <ScrollArea className="flex-1 min-h-0 max-h-[180px]">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {searchQuery ? "No match" : "No recent clients"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {clients.slice(0, 15).map((client) => (
              <button
                key={client.registeredDateTimeAD}
                onClick={() => onSelect(client)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md text-left text-xs transition-colors",
                  "hover:bg-violet-50",
                  selectedId === client.registeredDateTimeAD && "bg-violet-100"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{client.clientName}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {[client.events, client.eventMonth, client.eventYear].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
