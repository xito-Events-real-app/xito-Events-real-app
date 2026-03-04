import { useState, useMemo, useEffect } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buildFilePath, StorageDevice, FileRecord } from "@/lib/files-api";
import { cn } from "@/lib/utils";

const PHOTO_ROLES = ["PB", "PG", "EP"];
const VIDEO_ROLES = ["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"];

const PHOTO_CARD_OPTIONS = ["RAW", "JPEG", "RAW AND JPEG"];
const VIDEO_CARD_OPTIONS = ["NORMAL", "CF", "CF_NORMAL"];

const NEPALI_MONTHS: Record<number, string> = {
  1: "BAISAKH", 2: "JESTHA", 3: "ASHADH", 4: "SHRAWAN",
  5: "BHADRA", 6: "ASHWIN", 7: "KARTIK", 8: "MANGSIR",
  9: "POUSH", 10: "MAGH", 11: "FALGUN", 12: "CHAITRA",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileRecord: FileRecord | null;
  devices: StorageDevice[];
  onSave: (updates: Partial<FileRecord>) => Promise<void>;
}

export function FilePathBuilderDialog({ open, onOpenChange, fileRecord, devices, onSave }: Props) {
  const [storageType, setStorageType] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [yearEventFolder, setYearEventFolder] = useState("");
  const [category, setCategory] = useState("");
  const [clientFolder, setClientFolder] = useState("");
  const [eventFolder, setEventFolder] = useState("");
  const [side, setSide] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  const [cardLabel, setCardLabel] = useState("");
  const [sizeGb, setSizeGb] = useState<string>("");
  const [numberOfItems, setNumberOfItems] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset all fields when dialog opens with a new record
  useEffect(() => {
    if (!fileRecord || !open) return;

    const role = fileRecord.freelancer_type || "";
    const isPhoto = PHOTO_ROLES.includes(role);
    const monthNum = parseInt(fileRecord.event_month || "0", 10);
    const defaultYearFolder = monthNum && fileRecord.event_year
      ? `${NEPALI_MONTHS[monthNum] || fileRecord.event_month} EVENTS ${fileRecord.event_year}`
      : "";

    setStorageType(fileRecord.storage_type || "");
    setDeviceId(fileRecord.storage_device_id || "");
    setYearEventFolder(fileRecord.year_event_folder || defaultYearFolder);
    setCategory(fileRecord.category || (isPhoto ? "PHOTOS" : "VIDEOS"));
    setClientFolder(fileRecord.client_folder_name || fileRecord.client_name?.toUpperCase() || "");
    setEventFolder(fileRecord.event_folder_name || fileRecord.event_name?.toUpperCase() || "");
    setSide(fileRecord.side || "");
    setFreelancerName(fileRecord.freelancer_name || "");
    setCardLabel(fileRecord.card_label || (isPhoto ? "RAW AND JPEG" : "NORMAL"));
    setSizeGb(fileRecord.size_gb ? String(fileRecord.size_gb) : "");
    setNumberOfItems(fileRecord.number_of_items ? String(fileRecord.number_of_items) : "");
  }, [fileRecord, open]);

  const isPhoto = PHOTO_ROLES.includes(fileRecord?.freelancer_type || "");

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
        size_gb: sizeGb ? Number(sizeGb) : 0,
        number_of_items: numberOfItems ? Number(numberOfItems) : 0,
        final_generated_path: generatedPath,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const cardNum = fileRecord?.card_label || "1";
  const headerText = `CARD ${cardNum} — ${fileRecord?.client_name || ""} — ${fileRecord?.event_name || ""} — ${fileRecord?.freelancer_name || ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-600 dark:text-blue-400">File Path Builder</DialogTitle>
          <DialogDescription>Build and preview the storage path for this file entry</DialogDescription>
        </DialogHeader>

        {/* ─── Section 1: Details Header ─── */}
        <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
          <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 tracking-wide">{headerText}</p>
        </div>

        <Separator />

        {/* ─── Section 2: Storage & Path Configuration ─── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Storage & Path</p>

          {/* Storage Type + Device */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Storage Type</Label>
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
              <Label className="text-xs font-bold">Storage Device</Label>
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

          {/* Drive Letter - ONLY when PC */}
          {storageType === "PC" && selectedDevice?.pc_drive_letter && (
            <div className="space-y-1">
              <Label className="text-xs font-bold">Drive Letter Path</Label>
              <Input value={`${selectedDevice.pc_drive_letter}:\\`} readOnly className="bg-muted font-bold" />
            </div>
          )}

          {/* Unsafe warning */}
          {selectedDevice?.safety_status === "UNSAFE" && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-600 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Warning: This device is marked as UNSAFE</span>
            </div>
          )}

          {/* Year Event Folder + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Year Event Folder</Label>
              <Input value={yearEventFolder} onChange={(e) => setYearEventFolder(e.target.value)} placeholder="e.g. FALGUN EVENTS 2082" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTOS">PHOTOS</SelectItem>
                  <SelectItem value="VIDEOS">VIDEOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client Folder + Event Folder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Client Folder</Label>
              <Input value={clientFolder} onChange={(e) => setClientFolder(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Event Folder</Label>
              <Input value={eventFolder} onChange={(e) => setEventFolder(e.target.value)} />
            </div>
          </div>

          {/* Side + Freelancer + Card Label */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Side</Label>
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
              <Label className="text-xs font-bold">Freelancer</Label>
              <Input value={freelancerName} readOnly className="bg-muted font-bold" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Card Label</Label>
              <Select value={cardLabel} onValueChange={setCardLabel}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(isPhoto ? PHOTO_CARD_OPTIONS : VIDEO_CARD_OPTIONS).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Path Preview */}
          {generatedPath && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-blue-600 dark:text-blue-400 font-bold">Generated Path</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-xs text-blue-600">
                  {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                </Button>
              </div>
              <p className="text-xs font-mono break-all text-foreground font-bold">{generatedPath}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* ─── Section 3: File Info ─── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">File Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">File Size (GB)</Label>
              <Input
                type="number"
                value={sizeGb}
                onChange={(e) => setSizeGb(e.target.value)}
                placeholder="0"
                step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">No. of Items</Label>
              <Input
                type="number"
                value={numberOfItems}
                onChange={(e) => setNumberOfItems(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            {saving ? "Saving..." : "Save & Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
