import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUpDown, FileText, Link2, Upload, Trash2, Clock, X, Plus } from "lucide-react";
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
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <ArrowUpDown className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">XITO TRANSFER</h2>
            <p className="text-xs text-slate-400 mt-0.5">Drop files, paste links, or write notes — auto-expires in 7 days</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Input area */}
      <div
        className={`px-6 py-5 border-b border-slate-100 transition-colors ${isDragging ? "bg-orange-50" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className={`relative rounded-2xl border-2 border-dashed transition-all ${isDragging ? "border-orange-400 bg-orange-50/60 scale-[1.01]" : "border-slate-200 hover:border-slate-300"}`}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note, paste a link, or drop a file here..."
            className="w-full min-h-[100px] p-5 bg-transparent text-slate-800 placeholder:text-slate-400 text-base resize-none focus:outline-none rounded-2xl"
            disabled={uploading}
          />
          <div className="flex items-center justify-between px-5 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 gap-2 text-slate-500 hover:text-orange-600 hover:border-orange-300 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Upload File
            </Button>
            {inputValue.trim() && (
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                size="sm"
                className="h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-lg gap-1.5"
              >
                {uploading ? "Saving..." : URL_REGEX.test(inputValue.trim()) ? "Save Link" : "Save Note"}
              </Button>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-orange-500">
            <div className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        )}

        {/* Today's texts & links inline */}
        {todayTextsAndLinks.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today</p>
            {todayTextsAndLinks.map(t => (
              <TodayInlineItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Photo grid */}
            {allPhotos.length > 0 && (
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                  Photos ({allPhotos.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {allPhotos.map((t, i) => (
                    <div key={t.id} className="group relative">
                      <button
                        onClick={() => openPhotoViewer(i)}
                        className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 hover:ring-2 hover:ring-orange-400 transition-all shadow-sm hover:shadow-md"
                      >
                        <img
                          src={t.file_url}
                          alt={t.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Badge
                        variant="outline"
                        className={`absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0 bg-white/90 backdrop-blur-sm ${daysRemaining(t.expires_at) <= 1 ? "text-red-500 border-red-300" : "text-slate-500 border-slate-300"}`}
                      >
                        {daysRemaining(t.expires_at)}d left
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-photo files */}
            {nonPhotoFiles.length > 0 && (
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                  Files ({nonPhotoFiles.length})
                </h3>
                <div className="space-y-2">
                  {nonPhotoFiles.map(t => (
                    <FileItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped by date (non-today texts/links) */}
            {grouped.filter(g => g.label !== "Today").map(group => {
              const textsAndLinks = group.items.filter(t => t.transfer_type !== "file");
              if (textsAndLinks.length === 0) return null;
              return (
                <div key={group.label} className="px-6 py-5 border-b border-slate-50 last:border-b-0">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{group.label}</h3>
                  <div className="space-y-2">
                    {textsAndLinks.map(t => (
                      <TransferItem key={t.id} transfer={t} onDelete={() => handleDelete(t)} />
                    ))}
                  </div>
                </div>
              );
            })}

            {transfers.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <ArrowUpDown className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-base text-slate-400 text-center">
                  Drop a file, paste a link, or write something above
                </p>
                <p className="text-sm text-slate-300 mt-1">Everything auto-deletes after 7 days</p>
              </div>
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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-slate-100/80 transition-colors">
      {isUrl ? <Link2 className="h-4 w-4 text-green-500 shrink-0" /> : <FileText className="h-4 w-4 text-blue-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        {isUrl ? (
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline truncate block font-medium">
            {t.url}
          </a>
        ) : (
          <p className="text-sm text-slate-700 truncate font-medium">{t.content || t.title}</p>
        )}
      </div>
      <span className="text-xs text-slate-400 shrink-0">{timeAgo(t.created_at)}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function TransferItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const isUrl = t.transfer_type === "url";
  const days = daysRemaining(t.expires_at);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
      {isUrl ? <Link2 className="h-4 w-4 text-green-500 shrink-0" /> : <FileText className="h-4 w-4 text-blue-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        {isUrl ? (
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline truncate block font-medium">
            {t.url}
          </a>
        ) : (
          <p className="text-sm text-slate-700 truncate font-medium">{t.content || t.title}</p>
        )}
      </div>
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${days <= 1 ? "border-red-300 text-red-400" : "border-slate-200 text-slate-400"}`}>
        <Clock className="h-3 w-3 mr-1" />{days}d
      </Badge>
      <span className="text-xs text-slate-400 shrink-0">{timeAgo(t.created_at)}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function FileItem({ transfer: t, onDelete }: { transfer: XitoTransfer; onDelete: () => void }) {
  const days = daysRemaining(t.expires_at);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer border border-slate-100"
      onClick={() => window.open(t.file_url, "_blank")}
    >
      <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
        <Upload className="h-4 w-4 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate font-medium">{t.file_name || t.title}</p>
        <p className="text-xs text-slate-400">{formatFileSize(t.file_size_bytes)}</p>
      </div>
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${days <= 1 ? "border-red-300 text-red-400" : "border-slate-200 text-slate-400"}`}>
        <Clock className="h-3 w-3 mr-1" />{days}d
      </Badge>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
