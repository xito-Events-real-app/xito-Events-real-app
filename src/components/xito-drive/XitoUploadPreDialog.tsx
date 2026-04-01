import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Calendar, User, ImageIcon, Upload, Sparkles, Clock, FolderOpen } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileCount: number;
  folderPath: string;
  shotBy: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  daysAgo: number | null;
}

export function XitoUploadPreDialog({ open, onClose, onConfirm, fileCount, folderPath, shotBy, eventName, clientName, eventDate, daysAgo }: Props) {
  const totalSizeMB = 0; // We don't know size before upload

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 border-border/50 bg-card overflow-hidden">
        {/* Hero header */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 pb-4">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              Upload to XITO Drive
            </DialogTitle>
          </DialogHeader>

          {/* File count badge */}
          <div className="mt-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{fileCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">photos ready to upload</p>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="px-5 pb-5 space-y-3">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            {clientName && (
              <InfoChip icon={<User className="h-3.5 w-3.5" />} label="Client" value={clientName} />
            )}
            {eventName && (
              <InfoChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Event" value={eventName} />
            )}
            {shotBy && (
              <InfoChip icon={<Camera className="h-3.5 w-3.5" />} label="Shot by" value={shotBy} />
            )}
            {eventDate && (
              <InfoChip
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Date"
                value={eventDate}
                sub={daysAgo !== null ? `${daysAgo}d ago` : undefined}
              />
            )}
          </div>

          {/* Folder path */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono">{folderPath}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-xs">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 h-9 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Start Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoChip({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 bg-muted/40 rounded-lg px-3 py-2 min-w-0">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-xs font-medium text-foreground truncate mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
