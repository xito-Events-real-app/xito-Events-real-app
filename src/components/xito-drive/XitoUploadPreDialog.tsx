import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Calendar, User, ImageIcon, Upload, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (meta: { shotBy: string; eventName: string; eventDate: string; expectedCount: number }) => void;
  fileCount: number;
  folderPath: string;
  /** Auto-fill hints from breadcrumb */
  defaultEventName?: string;
  defaultPhotographer?: string;
  defaultDate?: string;
}

export function XitoUploadPreDialog({ open, onClose, onConfirm, fileCount, folderPath, defaultEventName, defaultPhotographer, defaultDate }: Props) {
  const [shotBy, setShotBy] = useState(defaultPhotographer || "");
  const [eventName, setEventName] = useState(defaultEventName || "");
  const [eventDate, setEventDate] = useState(defaultDate || "");
  const [expectedCount, setExpectedCount] = useState(fileCount);

  const handleConfirm = () => {
    onConfirm({ shotBy, eventName, eventDate, expectedCount: expectedCount || fileCount });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Upload to XITO Drive
          </DialogTitle>
        </DialogHeader>

        {/* File summary card */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{fileCount}</p>
              <p className="text-xs text-muted-foreground">files selected for upload</p>
            </div>
            <Sparkles className="h-5 w-5 text-primary/40 ml-auto" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 truncate font-mono bg-muted/50 rounded px-2 py-1">{folderPath}</p>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Shot By (Photographer)
            </label>
            <Input
              value={shotBy}
              onChange={(e) => setShotBy(e.target.value)}
              placeholder="e.g. Nikit"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Event Name
              </label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Wedding"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Event Date
              </label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Expected Total Photos
            </label>
            <Input
              type="number"
              value={expectedCount || ""}
              onChange={(e) => setExpectedCount(parseInt(e.target.value) || 0)}
              placeholder={String(fileCount)}
              className="h-9"
            />
            {expectedCount > 0 && expectedCount !== fileCount && (
              <p className="text-[11px] text-amber-400">
                You selected {fileCount} files but expect {expectedCount} total. {expectedCount > fileCount ? `${expectedCount - fileCount} more needed after this batch.` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
            <Upload className="h-4 w-4" />
            Start Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
