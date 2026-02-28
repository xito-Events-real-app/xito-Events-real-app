import { useState, useMemo } from "react";
import { Wand2, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFilesManagement } from "@/hooks/useFilesManagement";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "./FilePathBuilderDialog";
import { FileRecord } from "@/lib/files-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function FilesManagementTable() {
  const [selectedClient, setSelectedClient] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [bookedClients, setBookedClients] = useState<{ registered_date_time_ad: string; client_name: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const filters = useMemo(() => selectedClient ? { clientName: selectedClient } : undefined, [selectedClient]);
  const { files, isLoading, isGenerating, update, generateRows } = useFilesManagement(filters);
  const { devices } = useStorageDevices();

  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

  // Search booked clients
  const searchClients = async (query: string) => {
    setClientSearch(query);
    if (query.length < 2) { setBookedClients([]); return; }
    setLoadingClients(true);
    try {
      const { data } = await (supabase as any)
        .from("clients_cache")
        .select("registered_date_time_ad, client_name")
        .eq("sheet_source", "booked")
        .ilike("client_name", `%${query}%`)
        .limit(20);
      setBookedClients(data ?? []);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSelectClient = (client: { registered_date_time_ad: string; client_name: string }) => {
    setSelectedClient(client.client_name);
    setClientSearch(client.client_name);
    setBookedClients([]);
  };

  const handleAutoGenerate = async () => {
    if (!selectedClient) {
      toast({ title: "Select a client first", variant: "destructive" });
      return;
    }
    // Find registered_date_time_ad for this client
    const { data } = await (supabase as any)
      .from("clients_cache")
      .select("registered_date_time_ad")
      .eq("client_name", selectedClient)
      .eq("sheet_source", "booked")
      .single();
    if (!data) {
      toast({ title: "Client not found in booked", variant: "destructive" });
      return;
    }
    await generateRows(data.registered_date_time_ad);
  };

  const openPathBuilder = (file: FileRecord) => {
    setSelectedFile(file);
    setPathDialogOpen(true);
  };

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    await update(id, { [field]: value, synced_to_sheet: false });
  };

  return (
    <div className="space-y-4">
      {/* Client selector + actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={clientSearch}
            onChange={(e) => searchClients(e.target.value)}
            placeholder="Search booked client..."
            className="pl-8"
          />
          {bookedClients.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 bg-popover border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {bookedClients.map((c) => (
                <button
                  key={c.registered_date_time_ad}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelectClient(c)}
                >
                  {c.client_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleAutoGenerate}
          disabled={isGenerating || !selectedClient}
          className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
        >
          <Wand2 className="w-4 h-4 mr-1" />
          {isGenerating ? "Generating..." : "Auto-Generate Rows"}
        </Button>
      </div>

      {selectedClient && (
        <Badge variant="secondary" className="text-xs">
          Showing files for: {selectedClient}
          <button className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => { setSelectedClient(""); setClientSearch(""); }}>✕</button>
        </Badge>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{selectedClient ? "No files found for this client" : "Select a client to view files"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                <TableHead className="text-xs w-24">Crew</TableHead>
                <TableHead className="text-xs">Freelancer</TableHead>
                <TableHead className="text-xs">Event</TableHead>
                <TableHead className="text-xs w-20">Category</TableHead>
                <TableHead className="text-xs w-24">Side</TableHead>
                <TableHead className="text-xs w-20">Card</TableHead>
                <TableHead className="text-xs w-20">Size GB</TableHead>
                <TableHead className="text-xs w-24">Format</TableHead>
                <TableHead className="text-xs w-24">Who Copied</TableHead>
                <TableHead className="text-xs text-center w-10">✓</TableHead>
                <TableHead className="text-xs text-center w-10">2x</TableHead>
                <TableHead className="text-xs text-center w-10">3x</TableHead>
                <TableHead className="text-xs text-center w-10">☁</TableHead>
                <TableHead className="text-xs">File Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id} className="text-xs">
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{file.freelancer_type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{file.freelancer_name}</TableCell>
                  <TableCell>{file.event_name}</TableCell>
                  <TableCell>{file.category}</TableCell>
                  <TableCell>
                    <Select value={file.side || ""} onValueChange={(v) => handleInlineUpdate(file.id, "side", v)}>
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRIDE SIDE">BRIDE</SelectItem>
                        <SelectItem value="GROOM SIDE">GROOM</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-7 text-xs w-16 border-0 bg-transparent p-1"
                      defaultValue={file.card_label}
                      onBlur={(e) => { if (e.target.value !== file.card_label) handleInlineUpdate(file.id, "card_label", e.target.value); }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-7 text-xs w-16 border-0 bg-transparent p-1"
                      defaultValue={file.size_gb || ""}
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== file.size_gb) handleInlineUpdate(file.id, "size_gb", v); }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={file.format_type || ""} onValueChange={(v) => handleInlineUpdate(file.id, "format_type", v)}>
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        {["RAW_ONLY", "JPEG_ONLY", "RAW_JPEG", "CF", "NORMAL", "CF_NORMAL"].map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-7 text-xs w-20 border-0 bg-transparent p-1"
                      defaultValue={file.who_copied}
                      onBlur={(e) => { if (e.target.value !== file.who_copied) handleInlineUpdate(file.id, "who_copied", e.target.value); }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={file.reconfirmation} onCheckedChange={(v) => handleInlineUpdate(file.id, "reconfirmation", !!v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={file.double_backup} onCheckedChange={(v) => handleInlineUpdate(file.id, "double_backup", !!v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={file.triple_backup} onCheckedChange={(v) => handleInlineUpdate(file.id, "triple_backup", !!v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={file.drive_upload} onCheckedChange={(v) => handleInlineUpdate(file.id, "drive_upload", !!v)} />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => openPathBuilder(file)}
                      className={cn(
                        "text-xs truncate max-w-[180px] text-left hover:text-blue-600 transition-colors",
                        file.final_generated_path ? "text-foreground underline decoration-dotted" : "text-muted-foreground italic"
                      )}
                    >
                      {file.final_generated_path || "Set path..."}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        onSave={async (updates) => {
          if (selectedFile) await update(selectedFile.id, { ...updates, synced_to_sheet: false });
        }}
      />
    </div>
  );
}
