import { useState, useMemo } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildFilePath, StorageDevice, FileRecord } from "@/lib/files-api";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileRecord: FileRecord | null;
  devices: StorageDevice[];
  onSave: (updates: Partial<FileRecord>) => Promise<void>;
}

export function FilePathBuilderDialog({ open, onOpenChange, fileRecord, devices, onSave }: Props) {
  const [storageType, setStorageType] = useState(fileRecord?.storage_type || "");
  const [deviceId, setDeviceId] = useState(fileRecord?.storage_device_id || "");
  const [yearEventFolder, setYearEventFolder] = useState(fileRecord?.year_event_folder || "");
  const [category, setCategory] = useState(fileRecord?.category || "");
  const [clientFolder, setClientFolder] = useState(fileRecord?.client_folder_name || "");
  const [eventFolder, setEventFolder] = useState(fileRecord?.event_folder_name || "");
  const [side, setSide] = useState(fileRecord?.side || "");
  const [freelancerName, setFreelancerName] = useState(fileRecord?.freelancer_name || "");
  const [cardLabel, setCardLabel] = useState(fileRecord?.card_label || "");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useState(() => {
    if (fileRecord && open) {
      setStorageType(fileRecord.storage_type || "");
      setDeviceId(fileRecord.storage_device_id || "");
      setYearEventFolder(fileRecord.year_event_folder || "");
      setCategory(fileRecord.category || "");
      setClientFolder(fileRecord.client_folder_name || fileRecord.client_name?.toUpperCase() || "");
      setEventFolder(fileRecord.event_folder_name || fileRecord.event_name?.toUpperCase() || "");
      setSide(fileRecord.side || "");
      setFreelancerName(fileRecord.freelancer_name || "");
      setCardLabel(fileRecord.card_label || "");
    }
  });

  const selectedDevice = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId]);
  const filteredDevices = useMemo(() => {
    if (!storageType) return devices;
    const typeMap: Record<string, string> = { PC: "PC", HARD_DRIVE: "HARD_DRIVE", DRIVE: "SSD" };
    return devices.filter((d) => d.device_type === (typeMap[storageType] || storageType));
  }, [devices, storageType]);

  const generatedPath = useMemo(() => {
    if (!storageType || !selectedDevice) return "";
    return buildFilePath({
      storageType,
      deviceName: selectedDevice.device_name,
      pcDriveLetter: selectedDevice.pc_drive_letter || undefined,
      yearEventFolder,
      category,
      clientFolderName: clientFolder,
      eventFolderName: eventFolder,
      side,
      freelancerName,
      cardLabel,
    });
  }, [storageType, selectedDevice, yearEventFolder, category, clientFolder, eventFolder, side, freelancerName, cardLabel]);

  const handleCopy = () => {
    if (generatedPath) {
      navigator.clipboard.writeText(generatedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        storage_type: storageType,
        storage_device_id: deviceId || null,
        year_event_folder: yearEventFolder,
        category,
        client_folder_name: clientFolder,
        event_folder_name: eventFolder,
        side,
        card_label: cardLabel,
        final_generated_path: generatedPath,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-600 dark:text-blue-400">File Path Builder</DialogTitle>
          <DialogDescription>Build and preview the storage path for this file entry</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Storage Type + Device */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Storage Type</Label>
              <Select value={storageType} onValueChange={setStorageType}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PC">PC</SelectItem>
                  <SelectItem value="HARD_DRIVE">Hard Drive</SelectItem>
                  <SelectItem value="DRIVE">Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Storage Device</Label>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {filteredDevices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.device_name} ({d.remaining_storage_gb} GB free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unsafe warning */}
          {selectedDevice?.safety_status === "UNSAFE" && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-600 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Warning: This device is marked as UNSAFE</span>
            </div>
          )}

          {/* Folder segments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Year Event Folder</Label>
              <Input value={yearEventFolder} onChange={(e) => setYearEventFolder(e.target.value)} placeholder="e.g. JANUARY EVENTS 2026" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTOS">PHOTOS</SelectItem>
                  <SelectItem value="VIDEOS">VIDEOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Client Folder</Label>
              <Input value={clientFolder} onChange={(e) => setClientFolder(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Event Folder</Label>
              <Input value={eventFolder} onChange={(e) => setEventFolder(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Side</Label>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRIDE SIDE">BRIDE SIDE</SelectItem>
                  <SelectItem value="GROOM SIDE">GROOM SIDE</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Freelancer</Label>
              <Input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Card Label</Label>
              <Input value={cardLabel} onChange={(e) => setCardLabel(e.target.value)} placeholder="e.g. CF1" />
            </div>
          </div>

          {/* Path Preview */}
          {generatedPath && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Generated Path</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-xs text-blue-600">
                  {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                </Button>
              </div>
              <p className="text-xs font-mono break-all text-foreground">{generatedPath}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !generatedPath} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Saving..." : "Save & Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
