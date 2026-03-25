import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PCloudItem, formatPCloudSize, isPCloudImage, isPCloudVideo } from "@/lib/pcloud-api";

interface Props {
  item: PCloudItem;
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PCloudPreviewDialog({ item, url, open, onOpenChange }: Props) {
  const isImage = isPCloudImage(item);
  const isVideo = isPCloudVideo(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-card">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{formatPCloudSize(item.size || 0)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </a>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex items-center justify-center bg-black/95 overflow-auto p-2">
            {isImage ? (
              <img
                src={url}
                alt={item.name}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            ) : isVideo ? (
              <video
                src={url}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] rounded"
              />
            ) : (
              <div className="text-muted-foreground text-sm text-center p-8">
                <p>Preview not available for this file type.</p>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Download className="h-4 w-4 mr-1" /> Download instead
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
