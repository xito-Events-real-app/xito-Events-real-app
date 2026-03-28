import { Folder, FolderOpen, Image, Video, FileText, CreditCard, Users, Aperture, File, FileImage, FileVideo, FileAudio, Cloud, ExternalLink } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/xito-drive-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  name: string;
  itemCount?: number;
  type: "month-year" | "client" | "category" | "event" | "freelancer" | "leaf" | "file";
  categoryName?: string;
  fileSize?: number;
  pcloudFolderId?: number;
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

export function XitoDriveFolderCard({ name, itemCount, type, categoryName, fileSize, pcloudFolderId, onClick }: Props) {
  const isMobile = useIsMobile();
  const gradient = categoryName ? CATEGORY_COLORS[categoryName] : null;
  const isFile = type === "file";
  const Icon = isFile
    ? getFileIcon(name)
    : categoryName
      ? (categoryIcons[categoryName] || Folder)
      : Folder;

  const handleOpenInPCloud = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pcloudFolderId) return;
    // Use web URL — on mobile, pCloud's universal/app links will open the app automatically
    const webUrl = `https://my.pcloud.com/#page=filemanager&folder=${pcloudFolderId}`;
    window.open(webUrl, "_blank");
  };

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

        {/* Open in pCloud link */}
        {pcloudFolderId && !isFile && (
          <div
            onClick={handleOpenInPCloud}
            className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors cursor-pointer"
          >
            <Cloud className="h-2.5 w-2.5" />
            <span>Open in pCloud</span>
            <ExternalLink className="h-2 w-2" />
          </div>
        )}
      </div>
    </button>
  );
}
