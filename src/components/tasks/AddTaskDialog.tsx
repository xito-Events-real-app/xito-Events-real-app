import { useState } from "react";
import { format } from "date-fns";
import NepaliDate from "nepali-date-converter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { addDailyTask } from "@/lib/daily-task-api";
import type { DailyTaskSetupData } from "@/lib/daily-task-api";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setupData: DailyTaskSetupData;
  onTaskAdded: () => void;
}

function convertToBS(dateAD: string): string {
  try {
    const d = new Date(dateAD);
    const np = new NepaliDate(d);
    return np.format("YYYY-MM-DD");
  } catch { return ""; }
}

export function AddTaskDialog({ open, onOpenChange, setupData, onTaskAdded }: AddTaskDialogProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dateAD: todayStr, dateBS: convertToBS(todayStr),
    taskName: "", description: "", deadline: "",
    handler: "", backupHandler: "",
    contactNo: "", whatsappNo: "",
    urgency: 3, status: "Pending",
  });

  const updateField = (field: string, value: string | number) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "dateAD" && typeof value === "string") updated.dateBS = convertToBS(value);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.taskName.trim()) { toast.error("Task name is required"); return; }
    if (!form.handler) { toast.error("Handler is required"); return; }
    setSaving(true);
    try {
      await addDailyTask(form);
      toast.success("Task added successfully");
      setForm({
        dateAD: todayStr, dateBS: convertToBS(todayStr),
        taskName: "", description: "", deadline: "",
        handler: "", backupHandler: "",
        contactNo: "", whatsappNo: "",
        urgency: 3, status: "Pending",
      });
      onTaskAdded();
    } catch (err) {
      console.error("Failed to add task:", err);
      toast.error("Failed to add task");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date (AD)</Label>
              <Input type="date" value={form.dateAD} onChange={e => updateField("dateAD", e.target.value)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Date (BS)</Label>
              <Input value={form.dateBS} readOnly className="text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Task Name *</Label>
            <Input value={form.taskName} onChange={e => updateField("taskName", e.target.value)} placeholder="Enter task name" className="text-sm" />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Task details..." className="text-sm min-h-[80px]" />
          </div>

          <div>
            <Label className="text-xs">Deadline</Label>
            <Input type="datetime-local" value={form.deadline} onChange={e => updateField("deadline", e.target.value)} className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Handler *</Label>
              <Select value={form.handler} onValueChange={v => updateField("handler", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {setupData.handlers.map(h => (<SelectItem key={h} value={h} className="text-sm">{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Backup Handler</Label>
              <Select value={form.backupHandler} onValueChange={v => updateField("backupHandler", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {setupData.handlers.map(h => (<SelectItem key={h} value={h} className="text-sm">{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contact Number</Label>
              <Input value={form.contactNo} onChange={e => updateField("contactNo", e.target.value)} placeholder="Phone number" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp Number</Label>
              <Input value={form.whatsappNo} onChange={e => updateField("whatsappNo", e.target.value)} placeholder="WhatsApp number" className="text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Urgency: {form.urgency}/5</Label>
            <div className="mt-2 px-1">
              <Slider value={[form.urgency]} onValueChange={v => updateField("urgency", v[0])} min={1} max={5} step={1} className="w-full" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Low</span><span>Medium</span><span>Critical</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 mt-2">
            {saving ? "Adding..." : "Add Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
