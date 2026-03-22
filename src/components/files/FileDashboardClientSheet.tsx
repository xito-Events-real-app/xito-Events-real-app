import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileRecord, updateFileRecord } from "@/lib/files-api";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Clock, HardDrive, Copy, FolderOpen } from "lucide-react";

interface Props {
  file: FileRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function FileDashboardClientSheet({ file, open, onOpenChange, onUpdated }: Props) {
  if (!file) return null;

  const isCopied = !!file.final_generated_path;
  const hasDoubleBackup = !!file.backup_2_path;
  const photoSize = (file.freelancer_type || "").toLowerCase().includes("photo") ? Number(file.size_gb) || 0 : 0;
  const videoSize = (file.freelancer_type || "").toLowerCase().includes("video") ? Number(file.size_gb) || 0 : 0;

  const handleMarkCopied = async () => {
    if (!file.final_generated_path) {
      toast({ title: "Set file path first", description: "Use the file table to set a path before marking as copied.", variant: "destructive" });
      return;
    }
    await updateFileRecord(file.id, { confirmed: true, synced_to_sheet: false });
    scheduleFilesPush();
    toast({ title: "Marked as copied" });
    onUpdated?.();
  };

  const handleMarkDoubleBackup = async () => {
    if (!file.backup_2_path) {
      toast({ title: "Set backup 2 path first", variant: "destructive" });
      return;
    }
    await updateFileRecord(file.id, { double_backup: true, synced_to_sheet: false });
    scheduleFilesPush();
    toast({ title: "Double backup marked" });
    onUpdated?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[hsl(220,25%,8%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]">
        <SheetHeader>
          <SheetTitle className="text-[hsl(220,15%,95%)]">{file.client_name || "Unknown Client"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] pr-2 mt-4">
          <div className="space-y-5">
            {/* Event info */}
            <div className="rounded-xl bg-[hsl(220,25%,12%)] p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Event</p>
              <p className="font-semibold">{file.event_name || "-"}</p>
              <p className="text-xs text-muted-foreground mt-2">Date</p>
              <p className="text-sm">{file.event_date_ad || "-"}</p>
              <p className="text-xs text-muted-foreground mt-2">Freelancer</p>
              <p className="text-sm">{file.freelancer_name || "-"} ({file.freelancer_type || "-"})</p>
            </div>

            {/* Size breakdown */}
            <div className="rounded-xl bg-[hsl(220,25%,12%)] p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{Number(file.size_gb) || 0} GB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Photo</p>
                <p className="text-lg font-bold">{photoSize} GB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Video</p>
                <p className="text-lg font-bold">{videoSize} GB</p>
              </div>
            </div>

            {/* Storage paths */}
            <div className="rounded-xl bg-[hsl(220,25%,12%)] p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><HardDrive className="w-4 h-4" /> Storage</h4>
              <div>
                <p className="text-xs text-muted-foreground">Primary Path</p>
                <p className="text-xs font-mono break-all">{file.final_generated_path || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Backup 2</p>
                <p className="text-xs font-mono break-all">{file.backup_2_path || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Backup 3</p>
                <p className="text-xs font-mono break-all">{file.backup_3_path || "—"}</p>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl bg-[hsl(220,25%,12%)] p-4 flex gap-3">
              <Badge variant={isCopied ? "default" : "destructive"} className="gap-1">
                {isCopied ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isCopied ? "Copied" : "Pending"}
              </Badge>
              <Badge variant={hasDoubleBackup ? "default" : "secondary"} className="gap-1">
                <Copy className="w-3 h-3" />
                {hasDoubleBackup ? "Double Backup" : "Single"}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!file.confirmed && (
                <Button onClick={handleMarkCopied} className="flex-1 bg-[hsl(145,65%,42%)] hover:bg-[hsl(145,65%,36%)] text-white">
                  <CheckCircle className="w-4 h-4 mr-1" /> Mark Copied
                </Button>
              )}
              {!file.double_backup && file.backup_2_path && (
                <Button onClick={handleMarkDoubleBackup} className="flex-1 bg-[hsl(40,95%,50%)] hover:bg-[hsl(40,95%,44%)] text-black">
                  <Copy className="w-4 h-4 mr-1" /> Mark Double Backup
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
