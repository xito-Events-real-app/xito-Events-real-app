import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUpDown, FileText, Link2, Upload, Trash2, ExternalLink, Download, Clock, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { XitoTransferPhotoViewer } from "./XitoTransferPhotoViewer";

const URL_REGEX = /^(https?:\/\/[^\s]+)$/i;
const isImageMime = (mime: string) => mime.startsWith("image/");

export function XitoTransferContent({ onClose }: { onClose?: () => void }) {
  const [transfers, setTransfers] = useState<XitoTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = async () => {
    const val = inputValue.trim();
    if (!val) return;
    try {
      setUploading(true);
      if (URL_REGEX.test(val)) {
        await addUrl(val, "");
        toast({ title: "Link saved" });
      } else {
        const firstLine = val.split("\n")[0].slice(0, 60);
        await addNote(firstLine, val);
        toast({ title: "Note saved" });
      }
      setInputValue("");
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File must be less than 20MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      await uploadFile(file);
      toast({ title: "File uploaded" });
    } catch {
      toast({ title: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDelete = async (t: XitoTransfer) => {
    try {
      await deleteTransfer(t.id, t.file_url || undefined);
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const grouped = groupByDate(transfers);
  const todayGroup = grouped.find(g => g.label === "Today");
  const todayTextsAndLinks = todayGroup?.items.filter(t => t.transfer_type !== "file") || [];
  const allPhotos = transfers.filter(t => t.transfer_type === "file" && isImageMime(t.mime_type));
  const nonPhotoFiles = transfers.filter(t => t.transfer_type === "file" && !isImageMime(t.mime_type));

  const openPhotoViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">XITO TRANSFER</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">
            XX to open
          </Badge>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Unified input area */}
      <div
        className={`px-5 py-4 border-b transition-colors ${isDragging ? "bg-orange-50 border-orange-300" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className={`relative rounded-xl border-2 border-dashed transition-colors ${isDragging ? "border-orange-400 bg-orange-50/50" : "border-slate-200 hover:border-slate-300"}`}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note, paste a link, or drop a file here..."
            className="w-full min-h-[80px] p-4 bg-transparent text-slate-800 placeholder:text-slate-400 text-sm resize-none focus:outline-none rounded-xl"
            disabled={uploading}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1"
            >
              <Upload className="h-3.5 w-3.5" /> Attach file
            </button>
            {inputValue.trim() && (
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                {uploading ? "Saving..." : URL_REGEX.test(inputValue.trim()) ? "Save Link ↵" : "Save Note ↵"}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        {uploading && (
          <div className="mt-2 text-xs text-orange-500 animate-pulse">Processing...</div>
        )}

        {/* Today's texts & links inline */}
        {todayTextsAndLinks.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {todayTextsAndLinks.map(t => (
              <TodayInlineItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh]">
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-8">Loading...</p>
        ) : (
          <>
            {/* Photo thumbnails */}
            {allPhotos.length > 0 && (
              <div className="px-5 py-4 border-b">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Photos</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {allPhotos.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => openPhotoViewer(i)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 hover:ring-2 hover:ring-orange-400 transition-all"
                    >
                      <img src={t.file_url} alt={t.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                        className="absolute top-1 right-1 h-5 w-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                      <Badge
                        variant="outline"
                        className={`absolute bottom-1 left-1 text-[8px] px-1 py-0 bg-white/90 ${daysRemaining(t.expires_at) <= 1 ? "text-red-500 border-red-300" : "text-slate-500 border-slate-300"}`}
                      >
                        {daysRemaining(t.expires_at)}d
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Non-photo files */}
            {nonPhotoFiles.length > 0 && (
              <div className="px-5 py-4 border-b">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Files</h3>
                <div className="space-y-1.5">
                  {nonPhotoFiles.map(t => (
                    <FileItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped by date (non-today texts/links + all history) */}
            {grouped.filter(g => g.label !== "Today").map(group => {
              const textsAndLinks = group.items.filter(t => t.transfer_type !== "file");
              if (textsAndLinks.length === 0) return null;
              return (
                <div key={group.label} className="px-5 py-4 border-b last:border-b-0">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</h3>
                  <div className="space-y-1.5">
                    {textsAndLinks.map(t => (
                      <TransferItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
                    ))}
                  </div>
                </div>
              );
            })}

            {transfers.length === 0 && !loading && (
              <p className="text-slate-400 text-sm text-center py-12">
                Drop a file, paste a link, or write something above.
              </p>
            )}
          </>
        )}
      </div>

      {/* Photo viewer */}
      {viewerOpen && allPhotos.length > 0 && (
        <XitoTransferPhotoViewer
          photos={allPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

function TodayInlineItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const isUrl = t.transfer_type === "url";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 group">
      {isUrl ? <Link2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        {isUrl ? (
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline truncate block">
            {t.url}
          </a>
        ) : (
          <p className="text-sm text-slate-700 truncate">{t.content || t.title}</p>
        )}
      </div>
      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(t.created_at)}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TransferItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const isUrl = t.transfer_type === "url";
  const days = daysRemaining(t.expires_at);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
      {isUrl ? <Link2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        {isUrl ? (
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline truncate block">
            {t.url}
          </a>
        ) : (
          <p className="text-sm text-slate-700 truncate">{t.content || t.title}</p>
        )}
      </div>
      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${days <= 1 ? "border-red-300 text-red-400" : "border-slate-200 text-slate-400"}`}>
        <Clock className="h-2.5 w-2.5 mr-0.5" />{days}d
      </Badge>
      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(t.created_at)}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FileItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const days = daysRemaining(t.expires_at);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer"
      onClick={() => window.open(t.file_url, "_blank")}
    >
      <Upload className="h-3.5 w-3.5 text-purple-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{t.file_name || t.title}</p>
        <p className="text-[10px] text-slate-400">{formatFileSize(t.file_size_bytes)}</p>
      </div>
      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${days <= 1 ? "border-red-300 text-red-400" : "border-slate-200 text-slate-400"}`}>
        <Clock className="h-2.5 w-2.5 mr-0.5" />{days}d
      </Badge>
      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(t.created_at)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
