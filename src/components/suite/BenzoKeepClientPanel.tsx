import { useState } from "react";
import { User, X, Loader2, Phone, MessageCircle, Search, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { ClientData } from "@/lib/sheets-api";

export interface QuickClientData {
  clientName: string;
  contactNo: string;
  whatsappNo: string;
  source: string;
  clientHandler: string;
  initialStatus: string;
  events: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
}

interface BenzoKeepClientPanelProps {
  quickData: QuickClientData;
  onQuickDataChange: (data: QuickClientData) => void;
  selectedClient: ClientData | null;
  onSelectClient: (client: ClientData | null) => void;
  recentClients: ClientData[];
  isLoadingClients: boolean;
  sources: string[];
  handlers?: string[];
  statuses?: string[];
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
  handlers = [],
  statuses = [],
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
    onQuickDataChange({ clientName: "", contactNo: "", whatsappNo: "", source: "", clientHandler: "", initialStatus: "", events: "", eventYear: "", eventMonth: "", eventDay: "" });
  };

  const handleClientClick = (client: ClientData) => {
    // Auto-fill the form fields with client data
    onQuickDataChange({
      clientName: client.clientName || "",
      contactNo: client.contactNo || "",
      whatsappNo: client.whatsappNo || "",
      source: client.source || "",
      clientHandler: client.clientHandler || "",
      initialStatus: client.initialStatus || "",
      events: client.events || "",
      eventYear: client.eventYear || "",
      eventMonth: client.eventMonth || "",
      eventDay: client.eventDay || "",
    });
    // Trigger note loading in dialog
    onSelectClient(client);
  };

  const update = (field: keyof QuickClientData, value: string) => {
    onQuickDataChange({ ...quickData, [field]: value });
  };

  // Horizontal layout for desktop top bar
  if (layout === 'horizontal') {
    return (
      <div className="flex flex-col gap-0 rounded-xl overflow-hidden bg-slate-800/90 text-white">
        {/* ROW 1: Quick-Add Form */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              {selectedClient ? "✏️ Editing Client" : "➕ New Client"}
            </h4>
            {selectedClient && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-300 hover:text-red-200 hover:bg-red-900/30 px-2" onClick={handleClearSelection}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
          <div className="flex items-end gap-3">
            <div className="shrink-0 min-w-0">
              <Label className="text-sm text-slate-400 mb-1 block">Name *</Label>
              <Input
                value={quickData.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                placeholder="Client full name"
                className="h-10 text-sm w-48 bg-white/10 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-400"
              />
            </div>
            <div className="shrink-0">
              <Label className="text-sm text-slate-400 mb-1 block">Phone</Label>
              <Input
                value={quickData.contactNo}
                onChange={(e) => update('contactNo', e.target.value)}
                placeholder="Phone"
                className="h-10 text-sm w-36 bg-white/10 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-400"
                type="tel"
              />
            </div>
            <div className="shrink-0">
              <Label className="text-sm text-slate-400 mb-1 block">WhatsApp</Label>
              <Input
                value={quickData.whatsappNo}
                onChange={(e) => update('whatsappNo', e.target.value)}
                placeholder="WhatsApp"
                className="h-10 text-sm w-36 bg-white/10 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-400"
                type="tel"
              />
            </div>
            <div className="shrink-0">
              <Label className="text-sm text-slate-400 mb-1 block">Source</Label>
              <Select value={quickData.source} onValueChange={(v) => update('source', v)}>
                <SelectTrigger className="h-10 text-sm w-36 bg-white/10 border-slate-600 text-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0">
              <Label className="text-sm text-slate-400 mb-1 block">Handler</Label>
              <Select value={quickData.clientHandler} onValueChange={(v) => update('clientHandler', v)}>
                <SelectTrigger className="h-10 text-sm w-40 bg-white/10 border-slate-600 text-white">
                  <SelectValue placeholder="Handler" />
                </SelectTrigger>
                <SelectContent>
                  {handlers.map((h) => (
                    <SelectItem key={h} value={h} className="text-sm">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0">
              <Label className="text-sm text-slate-400 mb-1 block">Status</Label>
              <Select value={quickData.initialStatus} onValueChange={(v) => update('initialStatus', v)}>
                <SelectTrigger className="h-10 text-sm w-48 bg-white/10 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ROW 2: Recent Clients */}
        <div className="px-4 py-2.5 bg-slate-900/50 border-t border-slate-700">
          <RecentClientsList
            clients={filteredClients}
            isLoading={isLoadingClients}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={handleClientClick}
            selectedId={selectedClient?.registeredDateTimeAD}
            layout="horizontal"
          />
        </div>
      </div>
    );
  }

  // Vertical layout (mobile)
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {selectedClient ? "Editing Client" : "Quick Add Client"}
        </h4>
        {selectedClient && (
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-red-500 px-1.5" onClick={handleClearSelection}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-[11px] text-gray-500">Name</Label>
          <Input
            value={quickData.clientName}
            onChange={(e) => update('clientName', e.target.value)}
            placeholder="Client name"
            className="h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-500">Contact</Label>
            <Input
              value={quickData.contactNo}
              onChange={(e) => update('contactNo', e.target.value)}
              placeholder="Phone"
              className="h-8 text-xs"
              type="tel"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500">WhatsApp</Label>
            <Input
              value={quickData.whatsappNo}
              onChange={(e) => update('whatsappNo', e.target.value)}
              placeholder="WhatsApp"
              className="h-8 text-xs"
              type="tel"
            />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-gray-500">Source</Label>
          <Select value={quickData.source} onValueChange={(v) => update('source', v)}>
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
          onSelect={handleClientClick}
          selectedId={selectedClient?.registeredDateTimeAD}
        />
      </div>
    </div>
  );
}

// Client detail hover card content
function ClientHoverDetail({ client }: { client: ClientData }) {
  return (
    <div className="space-y-2.5 p-1">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{client.clientName}</p>
          {client.source && <p className="text-xs text-gray-400">via {client.source}</p>}
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {client.contactNo && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Phone className="w-3 h-3 text-blue-500" /> {client.contactNo}
          </div>
        )}
        {client.whatsappNo && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <MessageCircle className="w-3 h-3 text-green-500" /> {client.whatsappNo}
          </div>
        )}
        {client.events && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="w-3 h-3 text-amber-500" /> {client.events}
            {(client.eventMonth || client.eventYear) && (
              <span className="text-gray-400">
                • {[client.eventDay, client.eventMonth, client.eventYear].filter(Boolean).join(" ")}
              </span>
            )}
          </div>
        )}
        {client.clientHandler && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-3 h-3 text-violet-500" /> Handler: {client.clientHandler}
          </div>
        )}
        {client.initialStatus && (
          <div className="mt-1">
            <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium">
              {client.initialStatus}
            </span>
          </div>
        )}
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
  const [visibleCount, setVisibleCount] = useState(8);
  const visibleClients = clients.slice(0, visibleCount);
  const hasMore = clients.length > visibleCount;

  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Recent:</h4>
        <div className="relative shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="h-8 text-sm pl-7 w-40 bg-white/10 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-500">{searchQuery ? "No match" : "No clients"}</p>
          ) : (
            <>
              {visibleClients.map((client) => (
                <HoverCard key={client.registeredDateTimeAD} openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={() => onSelect(client)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all shrink-0",
                        "hover:bg-violet-500/20 border",
                        selectedId === client.registeredDateTimeAD
                          ? "bg-violet-500/30 border-violet-400 text-white"
                          : "border-slate-600 text-slate-200 hover:border-violet-400"
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-medium">{client.clientName}</span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" className="w-72">
                    <ClientHoverDetail client={client} />
                  </HoverCardContent>
                </HoverCard>
              ))}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-violet-300 hover:text-violet-200 hover:bg-violet-500/20 px-2 shrink-0"
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                >
                  More <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
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
