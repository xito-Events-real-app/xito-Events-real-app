import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, RotateCcw, HardDrive, Monitor, Database, Clipboard, Eye, EyeOff, X, MessageCircle, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePotentialDeletes } from "@/hooks/usePotentialDeletes";
import type { PotentialDelete as PotentialDeleteRecord } from "@/hooks/usePotentialDeletes";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { supabase } from "@/integrations/supabase/client";

const RESPONSIBILITIES = ["Benzo", "Nikit", "Saugat", "Barun", "Arjun"];
const DEVICE_TYPE_MAP: Record<string, { label: string; icon: any; filter: string }> = {
  PC: { label: "PC", icon: Monitor, filter: "PC" },
  HARD_DRIVE: { label: "Hard Drive", icon: HardDrive, filter: "HARD_DRIVE" },
  SSD: { label: "SSD", icon: Database, filter: "SSD" },
};

type ViewTab = "ALL" | "PENDING" | "READY" | "DONT_DELETE" | "PERM_DELETED";

function ApprovalButtons({ record, onApprove }: { record: PotentialDeleteRecord; onApprove: (id: string, approval: string, approver: string) => void }) {
  const [selectingApprover, setSelectingApprover] = useState(false);
  const [pendingApproval, setPendingApproval] = useState("");

  const handleClick = (approval: string) => {
    setPendingApproval(approval);
    setSelectingApprover(true);
  };

  if (selectingApprover) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-zinc-400">Who is approving?</div>
        <div className="flex flex-wrap gap-1">
          {RESPONSIBILITIES.map(name => (
            <button
              key={name}
              onClick={() => { onApprove(record.id, pendingApproval, name); setSelectingApprover(false); }}
              className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-300">
        Can we delete it, <span className="text-orange-400">{record.responsibility}</span>?
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => handleClick("YES")} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700 hover:bg-emerald-800/80 transition-all">
          <CheckCircle2 className="h-3.5 w-3.5" /> YES
        </button>
        <button onClick={() => handleClick("NO")} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-red-900/60 text-red-300 border border-red-700 hover:bg-red-800/80 transition-all">
          <XCircle className="h-3.5 w-3.5" /> NO
        </button>
        <button onClick={() => handleClick("GIVE_ME_SOME_TIME")} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/80 transition-all">
          <Clock className="h-3.5 w-3.5" /> WAIT
        </button>
      </div>
    </div>
  );
}

function CommentSection({ record, onAddComment }: { record: PotentialDeleteRecord; onAddComment: (id: string, text: string, author: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const comments = record.comments ? record.comments.split("|||").filter(Boolean) : [];

  return (
    <div className="border-t border-zinc-800 pt-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <MessageCircle className="h-3.5 w-3.5" />
        {comments.length > 0 ? `${comments.length} comments` : "Add comment"}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {comments.map((c, i) => (
            <div key={i} className="text-xs text-zinc-400 bg-zinc-800/50 rounded px-2 py-1">{c}</div>
          ))}
          <div className="flex gap-1">
            <select value={author} onChange={e => setAuthor(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 px-1 py-1 w-20">
              <option value="">Who?</option>
              {RESPONSIBILITIES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Comment..." className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-7 flex-1" />
            <Button size="sm" className="h-7 px-2 bg-zinc-700 hover:bg-zinc-600" disabled={!text || !author} onClick={() => { onAddComment(record.id, text, author); setText(""); }}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmDeletionCard({ record, onConfirm }: { record: PotentialDeleteRecord; onConfirm: (id: string) => void }) {
  return (
    <div className="space-y-2 bg-emerald-950/30 rounded-lg p-2 border border-emerald-800/50">
      <div className="text-sm text-emerald-200">
        <span className="font-bold text-emerald-300">Saugat</span>, did you delete{" "}
        <span className="font-bold text-white uppercase">{record.client_name || "this"}</span> from{" "}
        <span className="font-bold text-red-300">{record.device_name}</span> after{" "}
        <span className="font-bold text-orange-300">{record.approved_by}</span>'s approval?
      </div>
      <Button size="sm" onClick={() => onConfirm(record.id)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold">
        <CheckCircle2 className="h-4 w-4 mr-1" /> YES, I DELETED IT
      </Button>
    </div>
  );
}

export default function PotentialDelete() {
  const navigate = useNavigate();
  const { records, isLoading, add, softDelete, restore, hardDelete, updateApproval, confirmDeletion, addComment } = usePotentialDeletes();
  const { devices } = useStorageDevices();

  const [showUpload, setShowUpload] = useState(false);
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [deviceType, setDeviceType] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [notes, setNotes] = useState("");
  const [sizeGb, setSizeGb] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [viewTab, setViewTab] = useState<ViewTab>("READY");
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [filterDevice, setFilterDevice] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<PotentialDeleteRecord | null>(null);

  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Client search
  useEffect(() => {
    if (clientSearch.length < 2) { setClientSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("clients_cache")
        .select("client_name")
        .ilike("client_name", `%${clientSearch}%`)
        .limit(8);
      const names = (data || []).map((d: any) => d.client_name).filter(Boolean);
      setClientSuggestions([...new Set(names)] as string[]);
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Global paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (showUpload) return;
      const items = e.clipboardData?.items;
      if (!items) { toast({ title: "Nothing has been copied", variant: "destructive" }); return; }
      let imageFile: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) { imageFile = items[i].getAsFile(); break; }
      }
      if (!imageFile) { toast({ title: "Nothing has been copied", description: "No image found in clipboard", variant: "destructive" }); return; }
      setPastedFile(imageFile);
      setPreviewUrl(URL.createObjectURL(imageFile));
      setShowUpload(true);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showUpload]);

  // Deduplicated devices
  const filteredDevices = useMemo(() => {
    if (!deviceType) return [];
    const devs = devices.filter(d => d.device_type === deviceType);
    const seen = new Set<string>();
    return devs.filter(d => {
      if (seen.has(d.device_name)) return false;
      seen.add(d.device_name);
      return true;
    });
  }, [devices, deviceType]);

  const resetForm = () => {
    setPastedFile(null); setPreviewUrl(""); setDeviceType(""); setDeviceName("");
    setClientName(""); setClientSearch(""); setResponsibility(""); setNotes(""); setSizeGb(""); setShowUpload(false);
  };

  const handleSave = async () => {
    if (!pastedFile || !deviceType || !deviceName || !responsibility) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await add(pastedFile, { device_type: deviceType, device_name: deviceName, client_name: clientName || clientSearch, responsibility, notes });
      resetForm();
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Categorized records
  const activeRecords = records.filter(r => !r.deleted && !r.permanently_deleted_at);
  const pendingRecords = activeRecords.filter(r => !r.delete_approval || r.delete_approval === "" || r.delete_approval === "GIVE_ME_SOME_TIME");
  const readyRecords = activeRecords.filter(r => r.delete_approval === "YES");
  const dontDeleteRecords = activeRecords.filter(r => r.delete_approval === "NO");
  const permDeletedRecords = records.filter(r => r.permanently_deleted_at);

  const statsByPerson = useMemo(() => {
    const map: Record<string, number> = {};
    RESPONSIBILITIES.forEach(r => map[r] = 0);
    activeRecords.forEach(r => { if (r.responsibility) map[r.responsibility] = (map[r.responsibility] || 0) + 1; });
    return map;
  }, [activeRecords]);

  // Filtered view
  const displayRecords = useMemo(() => {
    let list: PotentialDeleteRecord[] = [];
    switch (viewTab) {
      case "ALL": list = activeRecords; break;
      case "PENDING": list = pendingRecords; break;
      case "READY": list = readyRecords; break;
      case "DONT_DELETE": list = dontDeleteRecords; break;
      case "PERM_DELETED": list = permDeletedRecords; break;
    }
    if (filterPerson) list = list.filter(r => r.responsibility === filterPerson);
    if (filterDevice) list = list.filter(r => r.device_name === filterDevice);
    return list;
  }, [activeRecords, pendingRecords, readyRecords, dontDeleteRecords, permDeletedRecords, viewTab, filterPerson, filterDevice]);

  const uniqueDevices = useMemo(() => [...new Set(activeRecords.map(r => r.device_name).filter(Boolean))], [activeRecords]);

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getDaysRemaining = (ts: string) => {
    const deleted = new Date(ts).getTime();
    const expiry = deleted + 7 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  };

  const getCardBorder = (record: PotentialDeleteRecord) => {
    if (record.permanently_deleted_at) return "border-l-4 border-l-zinc-600 opacity-60";
    if (record.delete_approval === "YES") return "border-l-4 border-l-emerald-500 shadow-emerald-900/30 shadow-lg";
    if (record.delete_approval === "NO") return "border-l-4 border-l-red-500";
    if (record.delete_approval === "GIVE_ME_SOME_TIME") return "border-l-4 border-l-amber-500";
    return "border-zinc-800";
  };

  const VIEW_TABS: { key: ViewTab; label: string; count: number; color: string }[] = [
    { key: "READY", label: "🟢 READY TO DELETE", count: readyRecords.length, color: "text-emerald-400 border-emerald-500" },
    { key: "PENDING", label: "⏳ PENDING", count: pendingRecords.length, color: "text-amber-400 border-amber-500" },
    { key: "DONT_DELETE", label: "🔴 DON'T DELETE", count: dontDeleteRecords.length, color: "text-red-400 border-red-500" },
    { key: "PERM_DELETED", label: "🗑 DELETED", count: permDeletedRecords.length, color: "text-zinc-400 border-zinc-500" },
    { key: "ALL", label: "ALL", count: activeRecords.length, color: "text-zinc-300 border-zinc-400" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-red-500">POTENTIAL DELETE</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="text-3xl font-bold text-red-500">{activeRecords.length}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Active</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="text-3xl font-bold text-emerald-400">{readyRecords.length}</div>
            <div className="text-xs text-zinc-500 mt-1">Ready to Delete</div>
          </div>
          {RESPONSIBILITIES.map(name => (
            <button
              key={name}
              onClick={() => setFilterPerson(filterPerson === name ? null : name)}
              className={`bg-zinc-900 rounded-xl p-4 border text-left transition-all ${
                filterPerson === name ? "border-red-500 ring-1 ring-red-500/50" : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <div className="text-2xl font-bold text-orange-400">{statsByPerson[name] || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">{name}</div>
            </button>
          ))}
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap gap-2">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-b-2 ${
                viewTab === tab.key ? `${tab.color} bg-zinc-800` : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Device filter chips */}
        {uniqueDevices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uniqueDevices.map(dev => (
              <button
                key={dev}
                onClick={() => setFilterDevice(filterDevice === dev ? null : dev)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterDevice === dev ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {dev}
              </button>
            ))}
            {(filterPerson || filterDevice) && (
              <button onClick={() => { setFilterPerson(null); setFilterDevice(null); }} className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Paste hint */}
        <div className="flex items-center justify-center py-4 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clipboard className="h-5 w-5" />
            <span className="text-sm">Press <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-xs">Ctrl+V</kbd> to paste a screenshot</span>
          </div>
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : displayRecords.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            {viewTab === "READY" ? "No files ready to delete yet" : "No screenshots in this view"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayRecords.map(record => (
              <div
                key={record.id}
                className={`group bg-zinc-900 rounded-xl border overflow-hidden hover:shadow-lg transition-all ${getCardBorder(record)}`}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-zinc-800 overflow-hidden cursor-pointer" onClick={() => setViewImage(record)}>
                  {record.image_url ? (
                    <img src={record.image_url} alt="screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">Image removed</div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  {record.client_name && (
                    <div className="text-sm font-bold text-zinc-100 truncate uppercase">{record.client_name}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="bg-red-900/60 text-red-300 border-red-800 text-[10px]">{record.device_name}</Badge>
                    <Badge className="bg-orange-900/60 text-orange-300 border-orange-800 text-[10px]">👤 {record.responsibility}</Badge>
                    {record.delete_approval === "YES" && <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-800 text-[10px]">✅ Approved by {record.approved_by}</Badge>}
                    {record.delete_approval === "NO" && <Badge className="bg-red-900/60 text-red-300 border-red-800 text-[10px]">❌ Don't Delete</Badge>}
                    {record.delete_approval === "GIVE_ME_SOME_TIME" && <Badge className="bg-amber-900/60 text-amber-300 border-amber-800 text-[10px]">⏳ Waiting</Badge>}
                  </div>
                  {record.notes && <div className="text-xs text-zinc-500 truncate">{record.notes}</div>}

                  {/* Approval / Confirmation Section */}
                  {!record.permanently_deleted_at && !record.delete_approval && (
                    <ApprovalButtons record={record} onApprove={updateApproval} />
                  )}
                  {!record.permanently_deleted_at && record.delete_approval === "GIVE_ME_SOME_TIME" && (
                    <ApprovalButtons record={record} onApprove={updateApproval} />
                  )}
                  {!record.permanently_deleted_at && record.delete_approval === "YES" && (
                    <ConfirmDeletionCard record={record} onConfirm={confirmDeletion} />
                  )}

                  {/* Permanently deleted countdown */}
                  {record.permanently_deleted_at && (
                    <div className="text-xs text-zinc-500">
                      {getDaysRemaining(record.permanently_deleted_at) > 0
                        ? `Image will be removed in ${getDaysRemaining(record.permanently_deleted_at)} days`
                        : "Image scheduled for removal"}
                    </div>
                  )}

                  {/* Comment Section */}
                  <CommentSection record={record} onAddComment={addComment} />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-zinc-600">{formatTime(record.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Viewer */}
      {viewImage && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center" onClick={() => setViewImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-zinc-400 hover:text-white hover:bg-zinc-800 z-10" onClick={() => setViewImage(null)}>
            <X className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {viewImage.client_name && <span className="text-white font-bold uppercase">{viewImage.client_name}</span>}
              <Badge className="bg-red-900/60 text-red-300 border-red-800">{viewImage.device_name}</Badge>
              <Badge className="bg-orange-900/60 text-orange-300 border-orange-800">👤 {viewImage.responsibility}</Badge>
            </div>
            {viewImage.notes && <span className="text-zinc-500 text-sm">{viewImage.notes}</span>}
          </div>
          <img src={viewImage.image_url} alt="screenshot" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-500">Save Screenshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                <img src={previewUrl} alt="preview" className="w-full max-h-48 object-contain" />
              </div>
            )}

            {/* Device Type */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Device Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DEVICE_TYPE_MAP).map(([key, { label, icon: Icon }]) => (
                  <button
                    key={key}
                    onClick={() => { setDeviceType(key); setDeviceName(""); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      deviceType === key ? "border-red-500 bg-red-950/40 text-red-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Device Name */}
            {deviceType && (
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Device Name *</label>
                <Select value={deviceName} onValueChange={setDeviceName}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select device..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {filteredDevices.map(d => (
                      <SelectItem key={d.id} value={d.device_name} className="text-zinc-200 focus:bg-zinc-700">
                        {d.device_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client Name */}
            <div className="space-y-2 relative" ref={searchRef}>
              <label className="text-sm text-zinc-400">Client Name</label>
              <Input
                placeholder="Search client or type anything..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setClientName(""); }}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
              {showSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                  {clientSuggestions.map(name => (
                    <button
                      key={name}
                      onClick={() => { setClientName(name); setClientSearch(name); setShowSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Responsibility */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Responsibility *</label>
              <div className="grid grid-cols-5 gap-1.5">
                {RESPONSIBILITIES.map(name => (
                  <button
                    key={name}
                    onClick={() => setResponsibility(name)}
                    className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                      responsibility === name ? "border-orange-500 bg-orange-950/40 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Notes</label>
              <Textarea
                placeholder="Optional notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={resetForm} className="flex-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-500 text-white">
                {saving ? "Saving..." : "Save Screenshot"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
