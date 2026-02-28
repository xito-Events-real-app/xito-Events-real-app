import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StorageDevice } from "@/lib/files-api";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDevice: StorageDevice | null;
  onSave: (data: Partial<StorageDevice>) => Promise<void>;
}

export function AddStorageDeviceDrawer({ open, onOpenChange, editDevice, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    device_type: "HARD_DRIVE",
    device_name: "",
    pc_drive_letter: "",
    total_storage_gb: "",
    health_percent: "100",
    safety_status: "SAFE",
    speed_rating: "3",
    purchase_date_ad: "",
    purchase_date_bs: "",
    price_npr: "",
    purchased_from: "",
  });

  useEffect(() => {
    if (editDevice) {
      setForm({
        device_type: editDevice.device_type,
        device_name: editDevice.device_name,
        pc_drive_letter: editDevice.pc_drive_letter || "",
        total_storage_gb: String(editDevice.total_storage_gb),
        health_percent: String(editDevice.health_percent),
        safety_status: editDevice.safety_status,
        speed_rating: String(editDevice.speed_rating),
        purchase_date_ad: editDevice.purchase_date_ad,
        purchase_date_bs: editDevice.purchase_date_bs,
        price_npr: String(editDevice.price_npr || ""),
        purchased_from: editDevice.purchased_from,
      });
    } else {
      setForm({
        device_type: "HARD_DRIVE",
        device_name: "",
        pc_drive_letter: "",
        total_storage_gb: "",
        health_percent: "100",
        safety_status: "SAFE",
        speed_rating: "3",
        purchase_date_ad: "",
        purchase_date_bs: "",
        price_npr: "",
        purchased_from: "",
      });
    }
  }, [editDevice, open]);

  const handleSave = async () => {
    if (!form.device_name.trim()) {
      toast({ title: "Device name required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      await onSave({
        device_type: form.device_type,
        device_name: form.device_name,
        pc_drive_letter: form.device_type === "PC" ? form.pc_drive_letter : null,
        total_storage_gb: Number(form.total_storage_gb) || 0,
        health_percent: Number(form.health_percent) || 100,
        safety_status: form.safety_status,
        speed_rating: Number(form.speed_rating) || 3,
        purchase_date_ad: form.purchase_date_ad,
        purchase_date_bs: form.purchase_date_bs,
        price_npr: Number(form.price_npr) || 0,
        purchased_from: form.purchased_from,
      });
      toast({ title: editDevice ? "Device updated" : "Device added" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{editDevice ? "Edit Device" : "Add Storage Device"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Device Type</Label>
              <Select value={form.device_type} onValueChange={(v) => set("device_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HARD_DRIVE">Hard Drive</SelectItem>
                  <SelectItem value="SSD">SSD</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Device Name</Label>
              <Input value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder="e.g. WD 2TB" />
            </div>
          </div>

          {form.device_type === "PC" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Drive Letter</Label>
              <Input value={form.pc_drive_letter} onChange={(e) => set("pc_drive_letter", e.target.value)} placeholder="e.g. D" className="w-24" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Total Storage (GB)</Label>
              <Input type="number" value={form.total_storage_gb} onChange={(e) => set("total_storage_gb", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Health %</Label>
              <Input type="number" value={form.health_percent} onChange={(e) => set("health_percent", e.target.value)} min="0" max="100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Safety Status</Label>
              <Select value={form.safety_status} onValueChange={(v) => set("safety_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAFE">SAFE</SelectItem>
                  <SelectItem value="SLOW">SLOW</SelectItem>
                  <SelectItem value="UNSAFE">UNSAFE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Speed Rating (1-5)</Label>
              <Select value={form.speed_rating} onValueChange={(v) => set("speed_rating", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase Date (AD)</Label>
              <Input value={form.purchase_date_ad} onChange={(e) => set("purchase_date_ad", e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase Date (BS)</Label>
              <Input value={form.purchase_date_bs} onChange={(e) => set("purchase_date_bs", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Price (NPR)</Label>
              <Input type="number" value={form.price_npr} onChange={(e) => set("price_npr", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Purchased From</Label>
              <Input value={form.purchased_from} onChange={(e) => set("purchased_from", e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Saving..." : editDevice ? "Update Device" : "Add Device"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
