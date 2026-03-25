import { useState, useEffect } from "react";
import { getLinksForClient, deleteLink, EditedFileLink } from "@/lib/edited-files-api";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Youtube, HardDrive, Cloud, Link2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AddLinkDialog } from "./AddLinkDialog";

const ICON_MAP: Record<string, { icon: typeof Link2; color: string }> = {
  youtube: { icon: Youtube, color: 'text-red-500' },
  gdrive: { icon: HardDrive, color: 'text-blue-500' },
  pcloud: { icon: Cloud, color: 'text-green-500' },
  other: { icon: Link2, color: 'text-muted-foreground' },
};

interface Props {
  registeredDateTimeAD: string;
  clientName: string;
}

export function ClientLinksSection({ registeredDateTimeAD, clientName }: Props) {
  const [links, setLinks] = useState<EditedFileLink[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const loadLinks = async () => {
    const data = await getLinksForClient(registeredDateTimeAD);
    setLinks(data);
  };

  useEffect(() => { loadLinks(); }, [registeredDateTimeAD]);

  const handleDelete = async (id: string) => {
    await deleteLink(id);
    toast({ title: "Link removed" });
    loadLinks();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Links</h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">No links added yet</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => {
            const { icon: Icon, color } = ICON_MAP[link.link_type] || ICON_MAP.other;
            return (
              <div key={link.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.link_title || link.link_url}</p>
                  {link.notes && <p className="text-xs text-muted-foreground truncate">{link.notes}</p>}
                </div>
                <a href={link.link_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </a>
                <button onClick={() => handleDelete(link.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AddLinkDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        registeredDateTimeAD={registeredDateTimeAD}
        clientName={clientName}
        onAdded={loadLinks}
      />
    </div>
  );
}
