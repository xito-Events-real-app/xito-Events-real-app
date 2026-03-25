import { EditedFile, formatFileSize, getEditedFileUrl } from "@/lib/edited-files-api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  file: EditedFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewDialog({ file, open, onOpenChange }: Props) {
  const url = getEditedFileUrl(file.storage_path);
  const isPhoto = file.file_type === 'photo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-card">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.file_name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size_bytes)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </a>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex items-center justify-center bg-black/95 overflow-auto p-2">
            {isPhoto ? (
              <img
                src={url}
                alt={file.file_name}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            ) : (
              <video
                src={url}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] rounded"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
