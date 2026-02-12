import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { quickAddFreelancer, FreelancerField } from "@/lib/freelancer-assignment-api";
import { Loader2, UserPlus } from "lucide-react";

interface QuickAddFreelancerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleField: FreelancerField;
  roleLabel: string;
  onSuccess: (name: string) => void;
}

export function QuickAddFreelancerDialog({ open, onOpenChange, roleField, roleLabel, onSuccess }: QuickAddFreelancerDialogProps) {
  const [name, setName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!contactNo.trim()) { toast.error("Contact number is required"); return; }
    setSaving(true);
    try {
      await quickAddFreelancer(name.trim(), contactNo.trim(), roleField);
      toast.success(`${name.trim()} added as ${roleLabel}`);
      onSuccess(name.trim());
      setName("");
      setContactNo("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to add freelancer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Quick Add Freelancer
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Adding as: <span className="font-semibold">{roleLabel}</span></p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="fl-name">Name *</Label>
            <Input id="fl-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
          </div>
          <div>
            <Label htmlFor="fl-contact">Contact Number *</Label>
            <Input id="fl-contact" value={contactNo} onChange={e => setContactNo(e.target.value)} placeholder="98XXXXXXXX" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
