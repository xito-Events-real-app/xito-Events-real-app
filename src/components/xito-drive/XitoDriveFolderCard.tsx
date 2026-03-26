import { Folder, FolderOpen, Image, Video, FileText, CreditCard, Users, Aperture, File, FileImage, FileVideo, FileAudio } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/xito-drive-utils";

interface Props {
  name: string;
  itemCount?: number;
  type: "month-year" | "client" | "category" | "event" | "freelancer" | "leaf" | "file";
  categoryName?: string;
  fileSize?: number;
  onClick: () => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  Photos: Image,
  Videos: Video,
  Quotation: FileText,
  Payments: CreditCard,
  "Project Managers": Users,
  "Lightroom Catalog": Aperture,
};

function getFileIcon(name: string): React.ElementType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic", "raw", "cr2", "nef", "arw"].includes(ext)) return FileImage;
  if (["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "mxf"].includes(ext)) return FileVideo;
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(ext)) return FileAudio;
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function XitoDriveFolderCard({ name, itemCount, type, categoryName, fileSize, onClick }: Props) {
  const gradient = categoryName ? CATEGORY_COLORS[categoryName] : null;
  const isFile = type === "file";
  const Icon = isFile
    ? getFileIcon(name)
    : categoryName
      ? (categoryIcons[categoryName] || Folder)
      : Folder;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 cursor-pointer w-full min-h-[120px] justify-center text-center"
    >
      <div className={`relative p-3 rounded-lg ${
        isFile ? 'bg-muted' : gradient ? `bg-gradient-to-br ${gradient}` : 'bg-muted'
      } transition-transform group-hover:scale-110`}>
        {type === "month-year" ? (
          <FolderOpen className={`h-8 w-8 ${gradient ? 'text-white' : 'text-amber-500'}`} />
        ) : (
          <Icon className={`h-8 w-8 ${isFile ? 'text-sky-500' : gradient ? 'text-white' : 'text-amber-500'}`} />
        )}
      </div>
      <div className="space-y-0.5 min-w-0 w-full">
        <p className="text-xs font-medium leading-tight truncate" title={name}>{name}</p>
        {isFile && fileSize !== undefined ? (
          <p className="text-[10px] text-muted-foreground">{formatFileSize(fileSize)}</p>
        ) : itemCount !== undefined ? (
          <p className="text-[10px] text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        ) : null}
      </div>
    </button>
  );
}
