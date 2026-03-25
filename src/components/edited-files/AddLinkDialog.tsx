import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addLink } from "@/lib/edited-files-api";
import { toast } from "@/hooks/use-toast";
import { Youtube, HardDrive, Cloud, Link2 } from "lucide-react";

const LINK_TYPES = [
  { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { value: 'gdrive', label: 'Google Drive', icon: HardDrive, color: 'text-blue-500' },
  { value: 'pcloud', label: 'pCloud', icon: Cloud, color: 'text-green-500' },
  { value: 'other', label: 'Other', icon: Link2, color: 'text-muted-foreground' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registeredDateTimeAD: string;
  clientName: string;
  onAdded: () => void;
}

export function AddLinkDialog({ open, onOpenChange, registeredDateTimeAD, clientName, onAdded }: Props) {
  const [linkType, setLinkType] = useState('youtube');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const result = await addLink({
      registered_date_time_ad: registeredDateTimeAD,
      client_name: clientName,
      link_type: linkType,
      link_url: url.trim(),
      link_title: title.trim() || url.trim(),
      notes: notes.trim(),
    });
    setSaving(false);
    if (result) {
      toast({ title: "Link added" });
      setUrl(''); setTitle(''); setNotes('');
      onOpenChange(false);
      onAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Link — {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Link Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {LINK_TYPES.map(lt => {
                const Icon = lt.icon;
                return (
                  <button
                    key={lt.value}
                    onClick={() => setLinkType(lt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                      linkType === lt.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${lt.color}`} />
                    {lt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="link-url" className="text-xs">URL</Label>
            <Input id="link-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="link-title" className="text-xs">Title (optional)</Label>
            <Input id="link-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Wedding Highlight" />
          </div>
          <div>
            <Label htmlFor="link-notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="link-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Add Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
