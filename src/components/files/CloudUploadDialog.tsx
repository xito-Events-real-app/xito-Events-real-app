import { useState, useEffect, useMemo } from "react";
import { Cloud, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileRecord, StorageDevice } from "@/lib/files-api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileRecord: FileRecord | null;
  devices: StorageDevice[];
  onSave: (id: string, updates: Partial<FileRecord>) => Promise<void>;
}

export function CloudUploadDialog({ open, onOpenChange, fileRecord, devices, onSave }: Props) {
  const [cloudDeviceName, setCloudDeviceName] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [saving, setSaving] = useState(false);

  const cloudDevices = useMemo(() => devices.filter(d => d.device_type === "CLOUD"), [devices]);

  const isEditing = !!(fileRecord?.drive_upload && fileRecord?.drive_upload_path);

  useEffect(() => {
    if (!open || !fileRecord) return;
    setCloudDeviceName(fileRecord.drive_upload_path || "");
    setDriveLink(fileRecord.drive_link || "");
  }, [open, fileRecord]);

  const handleSave = async () => {
    if (!fileRecord) return;
    if (!cloudDeviceName) {
      toast.error("Please select a cloud device");
      return;
    }
    setSaving(true);
    try {
      await onSave(fileRecord.id, {
        drive_upload: true,
        drive_upload_path: cloudDeviceName,
        drive_link: driveLink,
        synced_to_sheet: false,
      });
      onOpenChange(false);
      toast.success("Cloud backup saved");
    } catch (err: any) {
      toast.error("Failed to save: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!fileRecord) return;
    setSaving(true);
    try {
      await onSave(fileRecord.id, {
        drive_upload: false,
        drive_upload_path: "",
        drive_link: "",
        synced_to_sheet: false,
      });
      onOpenChange(false);
      toast.success("Cloud backup removed");
    } catch (err: any) {
      toast.error("Failed to remove: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <Cloud className="w-5 h-5" /> Cloud Backup
          </DialogTitle>
          <DialogDescription>
            {fileRecord?.client_name} — {fileRecord?.event_name} — {fileRecord?.freelancer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Storage Type - read only */}
          <div className="space-y-1">
            <Label className="text-xs font-bold">Storage Type</Label>
            <Input value="CLOUD" readOnly className="h-8 text-xs bg-muted/50 font-bold" />
          </div>

          {/* Cloud Name dropdown */}
          <div className="space-y-1">
            <Label className="text-xs font-bold">Cloud Name</Label>
            <Select value={cloudDeviceName} onValueChange={setCloudDeviceName}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select cloud device..." />
              </SelectTrigger>
              <SelectContent>
                {cloudDevices.map(d => (
                  <SelectItem key={d.id} value={d.device_name}>
                    {d.device_name} {d.cloud_type ? `(${d.cloud_type})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cloudDevices.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No cloud devices found. Add one in Storage Devices.</p>
            )}
          </div>

          {/* Drive Link */}
          <div className="space-y-1">
            <Label className="text-xs font-bold">Drive Link</Label>
            <Input
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEditing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={saving}
              className="mr-auto"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove Cloud Backup
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !cloudDeviceName}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {saving ? "Saving..." : "Save Cloud Backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
