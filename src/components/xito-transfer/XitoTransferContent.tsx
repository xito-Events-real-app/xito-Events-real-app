import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUpDown, FileText, Link2, Upload, Trash2, ExternalLink, Download, Clock, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  XitoTransfer,
  fetchTransfers,
  addNote,
  addUrl,
  uploadFile,
  deleteTransfer,
  groupByDate,
  daysRemaining,
  formatFileSize,
  timeAgo,
} from "@/lib/xito-transfer-api";

type AddMode = "note" | "file" | "url" | null;

export function XitoTransferContent({ onClose }: { onClose?: () => void }) {
  const [transfers, setTransfers] = useState<XitoTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlDesc, setUrlDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchTransfers();
      setTransfers(data);
    } catch {
      toast({ title: "Error loading transfers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("xito-transfers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "xito_transfers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleAddNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    try {
      setUploading(true);
      await addNote(noteTitle || "Untitled Note", noteContent);
      setNoteTitle(""); setNoteContent(""); setAddMode(null);
      toast({ title: "Note saved" });
    } catch { toast({ title: "Failed to save note", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleAddUrl = async () => {
    if (!urlValue.trim()) return;
    try {
      setUploading(true);
      await addUrl(urlValue, urlDesc);
      setUrlValue(""); setUrlDesc(""); setAddMode(null);
      toast({ title: "URL saved" });
    } catch { toast({ title: "Failed to save URL", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File must be less than 20MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      await uploadFile(file);
      setAddMode(null);
      toast({ title: "File uploaded" });
    } catch { toast({ title: "Failed to upload file", variant: "destructive" }); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDelete = async (t: XitoTransfer) => {
    try {
      await deleteTransfer(t.id, t.file_url || undefined);
      toast({ title: "Deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const grouped = groupByDate(transfers);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20 bg-gradient-to-r from-orange-500/20 to-red-600/20">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-bold text-white">XITO TRANSFER</h2>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-600">
            XX to open
          </Badge>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-400">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-700/50">
        <Button size="sm" variant={addMode === "note" ? "default" : "outline"}
          className={addMode === "note" ? "bg-orange-600 hover:bg-orange-700" : "border-slate-600 text-slate-300"}
          onClick={() => setAddMode(addMode === "note" ? null : "note")}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Note
        </Button>
        <Button size="sm" variant={addMode === "file" ? "default" : "outline"}
          className={addMode === "file" ? "bg-orange-600 hover:bg-orange-700" : "border-slate-600 text-slate-300"}
          onClick={() => { setAddMode(addMode === "file" ? null : "file"); }}>
          <Upload className="h-3.5 w-3.5 mr-1" /> File
        </Button>
        <Button size="sm" variant={addMode === "url" ? "default" : "outline"}
          className={addMode === "url" ? "bg-orange-600 hover:bg-orange-700" : "border-slate-600 text-slate-300"}
          onClick={() => setAddMode(addMode === "url" ? null : "url")}>
          <Link2 className="h-3.5 w-3.5 mr-1" /> URL
        </Button>
      </div>

      {/* Add forms */}
      {addMode === "note" && (
        <div className="px-4 py-3 space-y-2 border-b border-slate-700/50 bg-slate-800/50">
          <Input placeholder="Title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white text-sm" />
          <Textarea placeholder="Write your note..." value={noteContent} onChange={e => setNoteContent(e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white text-sm min-h-[80px]" />
          <Button size="sm" onClick={handleAddNote} disabled={uploading} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-3.5 w-3.5 mr-1" /> Save Note
          </Button>
        </div>
      )}

      {addMode === "file" && (
        <div className="px-4 py-3 space-y-2 border-b border-slate-700/50 bg-slate-800/50">
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="text-sm text-slate-300" />
          <p className="text-xs text-slate-500">Max 20MB</p>
          {uploading && <p className="text-xs text-orange-400">Uploading...</p>}
        </div>
      )}

      {addMode === "url" && (
        <div className="px-4 py-3 space-y-2 border-b border-slate-700/50 bg-slate-800/50">
          <Input placeholder="https://..." value={urlValue} onChange={e => setUrlValue(e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white text-sm" />
          <Input placeholder="Description (optional)" value={urlDesc} onChange={e => setUrlDesc(e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white text-sm" />
          <Button size="sm" onClick={handleAddUrl} disabled={uploading} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-3.5 w-3.5 mr-1" /> Save URL
          </Button>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 max-h-[50vh]">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-8">Loading...</p>
        ) : grouped.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No transfers yet. Add a note, file, or URL above.</p>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">{group.label}</h3>
              <div className="space-y-1.5">
                {group.items.map(t => (
                  <TransferItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TransferItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const days = daysRemaining(t.expires_at);
  const icon = t.transfer_type === "note" ? <FileText className="h-4 w-4 text-blue-400" />
    : t.transfer_type === "url" ? <Link2 className="h-4 w-4 text-green-400" />
    : <Upload className="h-4 w-4 text-purple-400" />;

  const handleClick = () => {
    if (t.transfer_type === "url" && t.url) {
      window.open(t.url, "_blank");
    } else if (t.transfer_type === "file" && t.file_url) {
      window.open(t.file_url, "_blank");
    }
  };

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
        <p className="text-sm font-medium text-white truncate">{t.title}</p>
        {t.transfer_type === "note" && t.content && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.content}</p>
        )}
        {t.transfer_type === "url" && (
          <p className="text-xs text-green-400/80 truncate mt-0.5 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> {t.url}
          </p>
        )}
        {t.transfer_type === "file" && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Download className="h-3 w-3" /> {formatFileSize(t.file_size_bytes)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-500">{timeAgo(t.created_at)}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${days <= 1 ? "border-red-500/50 text-red-400" : "border-slate-600 text-slate-500"}`}>
            <Clock className="h-2.5 w-2.5 mr-0.5" /> {days}d left
          </Badge>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
