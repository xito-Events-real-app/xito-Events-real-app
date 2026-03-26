import { Folder, FolderOpen, Image, Video, FileText, CreditCard, Users, Aperture } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/xito-drive-utils";

interface Props {
  name: string;
  itemCount?: number;
  type: "month-year" | "client" | "category" | "event" | "freelancer" | "leaf";
  categoryName?: string;
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

export function XitoDriveFolderCard({ name, itemCount, type, categoryName, onClick }: Props) {
  const gradient = categoryName ? CATEGORY_COLORS[categoryName] : null;
  const Icon = categoryName ? (categoryIcons[categoryName] || Folder) : Folder;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 cursor-pointer w-full min-h-[120px] justify-center text-center"
    >
      <div className={`relative p-3 rounded-lg ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-muted'} transition-transform group-hover:scale-110`}>
        {type === "month-year" ? (
          <FolderOpen className={`h-8 w-8 ${gradient ? 'text-white' : 'text-amber-500'}`} />
        ) : (
          <Icon className={`h-8 w-8 ${gradient ? 'text-white' : 'text-amber-500'}`} />
        )}
      </div>
      <div className="space-y-0.5 min-w-0 w-full">
        <p className="text-xs font-medium leading-tight truncate">{name}</p>
        {itemCount !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        )}
      </div>
    </button>
  );
}
