import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { StorageDevice } from "@/lib/files-api";
import { toast } from "@/hooks/use-toast";
import { adToBS, bsToAD, formatBSDate, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { HardDrive, Calendar as CalendarIcon, DollarSign, CalendarDays } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDevice: StorageDevice | null;
  onSave: (data: Partial<StorageDevice>) => Promise<void>;
}

export function AddStorageDeviceDrawer({ open, onOpenChange, editDevice, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [usedUnit, setUsedUnit] = useState<"TB" | "GB">("TB");
  const [remainingUnit, setRemainingUnit] = useState<"TB" | "GB">("TB");
  const converting = useRef(false);
  const [form, setForm] = useState({
    device_type: "HARD_DRIVE",
    device_name: "",
    pc_drive_letter: "",
    total_storage_tb: "",
    used_storage: "",
    remaining_storage: "",
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
        total_storage_tb: String(editDevice.total_storage_gb / 1024),
        used_storage: String((editDevice.used_storage_gb || 0) / 1024),
        remaining_storage: String((editDevice.remaining_storage_gb ?? 0) / 1024),
        health_percent: String(editDevice.health_percent),
        safety_status: editDevice.safety_status === "UNSAFE" || editDevice.safety_status === "SLOW" ? "RISKY" : editDevice.safety_status,
        speed_rating: String(editDevice.speed_rating),
        purchase_date_ad: editDevice.purchase_date_ad || "",
        purchase_date_bs: editDevice.purchase_date_bs || "",
        price_npr: String(editDevice.price_npr || ""),
        purchased_from: editDevice.purchased_from || "",
      });
      setUsedUnit("TB");
      setRemainingUnit("TB");
    } else {
      setUsedUnit("TB");
      setRemainingUnit("TB");
      setForm({
        device_type: "HARD_DRIVE",
        device_name: "",
        pc_drive_letter: "",
        total_storage_tb: "",
        used_storage: "",
        remaining_storage: "",
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

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleADDatePick = (date: Date | undefined) => {
    if (!date) return;
    const val = format(date, "yyyy-MM-dd");
    set("purchase_date_ad", val);
    converting.current = true;
    try {
      const bs = adToBS(date);
      set("purchase_date_bs", formatBSDate(bs));
    } catch { /* ignore */ }
    converting.current = false;
  };

  const handleADChange = (val: string) => {
    set("purchase_date_ad", val);
    if (converting.current) return;
    converting.current = true;
    try {
      const parts = val.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          const bs = adToBS(date);
          set("purchase_date_bs", formatBSDate(bs));
        }
      }
    } catch { /* ignore */ }
    converting.current = false;
  };

  const handleBSChange = (val: string) => {
    set("purchase_date_bs", val);
    if (converting.current) return;
    converting.current = true;
    try {
      const parts = val.trim().split(/\s+/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthIdx = nepaliMonthsEnglish.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
        const year = parseInt(parts[2]);
        if (!isNaN(day) && monthIdx >= 0 && !isNaN(year)) {
          const adResult = bsToAD(year, monthIdx + 1, day);
          if (adResult instanceof Date) {
            const y = adResult.getFullYear();
            const m = String(adResult.getMonth() + 1).padStart(2, "0");
            const d = String(adResult.getDate()).padStart(2, "0");
            set("purchase_date_ad", `${y}-${m}-${d}`);
          }
        }
      }
    } catch { /* ignore */ }
    converting.current = false;
  };

  const parsedADDate = form.purchase_date_ad ? new Date(form.purchase_date_ad) : undefined;
  const validADDate = parsedADDate && !isNaN(parsedADDate.getTime()) ? parsedADDate : undefined;

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
        total_storage_gb: (Number(form.total_storage_tb) || 0) * 1024,
        used_storage_gb: usedUnit === "TB" ? (Number(form.used_storage) || 0) * 1024 : (Number(form.used_storage) || 0),
        remaining_storage_gb: remainingUnit === "TB" ? (Number(form.remaining_storage) || 0) * 1024 : (Number(form.remaining_storage) || 0),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editDevice ? "Edit Device" : "Add Storage Device"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Device Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              <span>Device Information</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Device Type</Label>
                <Select value={form.device_type} onValueChange={(v) => set("device_type", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARD_DRIVE">Hard Drive</SelectItem>
                    <SelectItem value="SSD">SSD</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Device Name</Label>
                <Input className="h-10" value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder="e.g. WD 2TB" />
              </div>
            </div>

            {form.device_type === "PC" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Drive Letter</Label>
                <Input className="h-10 w-24" value={form.pc_drive_letter} onChange={(e) => set("pc_drive_letter", e.target.value)} placeholder="e.g. D" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Storage (TB)</Label>
                <Input className="h-10" type="number" step="0.5" value={form.total_storage_tb} onChange={(e) => set("total_storage_tb", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Used ({usedUnit})</span>
                  <button type="button" className="text-[10px] font-medium text-blue-500 hover:underline" onClick={() => {
                    const val = Number(form.used_storage) || 0;
                    if (usedUnit === "TB") {
                      set("used_storage", String(val * 1024));
                      setUsedUnit("GB");
                    } else {
                      set("used_storage", String(val / 1024));
                      setUsedUnit("TB");
                    }
                  }}>Switch to {usedUnit === "TB" ? "GB" : "TB"}</button>
                </Label>
                <Input className="h-10" type="number" step={usedUnit === "TB" ? "0.1" : "1"} value={form.used_storage} onChange={(e) => set("used_storage", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Remaining ({remainingUnit})</span>
                  <button type="button" className="text-[10px] font-medium text-blue-500 hover:underline" onClick={() => {
                    const val = Number(form.remaining_storage) || 0;
                    if (remainingUnit === "TB") {
                      set("remaining_storage", String(val * 1024));
                      setRemainingUnit("GB");
                    } else {
                      set("remaining_storage", String(val / 1024));
                      setRemainingUnit("TB");
                    }
                  }}>Switch to {remainingUnit === "TB" ? "GB" : "TB"}</button>
                </Label>
                <Input className="h-10" type="number" step={remainingUnit === "TB" ? "0.1" : "1"} value={form.remaining_storage} onChange={(e) => set("remaining_storage", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Health %</Label>
                <Input className="h-10" type="number" value={form.health_percent} onChange={(e) => set("health_percent", e.target.value)} min="0" max="100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Safety Status</Label>
                <Select value={form.safety_status} onValueChange={(v) => set("safety_status", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAFE">SAFE</SelectItem>
                    <SelectItem value="RISKY">RISKY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Speed Rating (1-5)</Label>
                <Select value={form.speed_rating} onValueChange={(v) => set("speed_rating", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Purchase Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>Purchase Details</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Purchase Date (AD)</Label>
                <div className="flex gap-1.5">
                  <Input className="h-10 flex-1" value={form.purchase_date_ad} onChange={(e) => handleADChange(e.target.value)} placeholder="YYYY-MM-DD" />
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[300]" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={validADDate}
                        onSelect={(date) => { handleADDatePick(date); }}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Purchase Date (BS)</Label>
                <Input className="h-10" value={form.purchase_date_bs} onChange={(e) => handleBSChange(e.target.value)} placeholder="DD Month YYYY" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Price (NPR)</Label>
                <Input className="h-10" type="number" value={form.price_npr} onChange={(e) => set("price_npr", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Purchased From</Label>
                <Input className="h-10" value={form.purchased_from} onChange={(e) => set("purchased_from", e.target.value)} />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium">
            {saving ? "Saving..." : editDevice ? "Update Device" : "Add Device"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
