import { useState } from "react";
import { EditedFile, formatFileSize, getEditedFileUrl } from "@/lib/edited-files-api";
import { Download, Trash2, Play, Eye, FileImage, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePreviewDialog } from "./FilePreviewDialog";

interface Props {
  file: EditedFile;
  onDelete: (file: EditedFile) => void;
  viewMode?: 'grid' | 'list';
}

export function FilePreviewCard({ file, onDelete, viewMode = 'grid' }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const url = getEditedFileUrl(file.storage_path);
  const isPhoto = file.file_type === 'photo';
  const isVideo = file.file_type === 'video';

  if (viewMode === 'list') {
    return (
      <>
        <div className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          {/* Thumbnail */}
          <button onClick={() => setPreviewOpen(true)} className="shrink-0 relative rounded-md overflow-hidden w-16 h-16 bg-muted">
            {isPhoto ? (
              <img src={url} alt={file.file_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Play className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file_size_bytes)} · {file.upload_status}
            </p>
          </div>
          <button onClick={() => setPreviewOpen(true)} className="shrink-0 text-muted-foreground hover:text-primary">
            <Eye className="h-4 w-4" />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Download className="h-4 w-4 text-primary" />
          </a>
          <button onClick={() => onDelete(file)} className="shrink-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <FilePreviewDialog file={file} open={previewOpen} onOpenChange={setPreviewOpen} />
      </>
    );
  }

  // Grid mode
  return (
    <>
      <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
        {/* Thumbnail area */}
        <button
          onClick={() => setPreviewOpen(true)}
          className="relative w-full aspect-square bg-muted overflow-hidden"
        >
          {isPhoto ? (
            <img src={url} alt={file.file_name} className="w-full h-full object-cover" loading="lazy" />
          ) : isVideo ? (
            <div className="relative w-full h-full">
              <video
                src={url}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-10 w-10 text-white fill-white/80" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileImage className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
        </button>

        {/* File info */}
        <div className="p-2.5">
          <p className="text-xs font-medium truncate">{file.file_name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.file_size_bytes)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted">
              <Download className="h-3.5 w-3.5 text-primary" />
            </a>
            <button onClick={() => onDelete(file)} className="p-1 rounded hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      </div>
      <FilePreviewDialog file={file} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}
