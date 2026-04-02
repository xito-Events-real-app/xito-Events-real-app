import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Youtube, Upload, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STAGE_ORDER: Record<string, number> = {
  EXPORTED: 1,
  EDIT_LAB: 2,
  EDIT_ON_PROGRESS: 3,
  COLOR_QUEUE: 4,
  COLOR_LAB: 5,
  COLOR_ON_PROGRESS: 6,
  EXPORT_QUEUE: 7,
  CLIENT_REVIEW: 8,
  RE_EDIT_ON_PROGRESS: 9,
  QUEUE: 10,
  FINALIZED: 11,
};

interface TrackerRow {
  id: string;
  client_name: string;
  event_name: string;
  edit_type: string;
  video_edit_status: string;
  registered_date_time_ad: string;
  sub_event_name: string;
  updated_at: string;
}

export function YouTubeUploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [trackerRows, setTrackerRows] = useState<TrackerRow[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEditType, setSelectedEditType] = useState("");
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // Load tracker rows
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("video_edit_tracker")
        .select("id, client_name, event_name, edit_type, video_edit_status, registered_date_time_ad, sub_event_name, updated_at")
        .eq("deleted", false);
      setTrackerRows(data || []);
    })();
  }, [open]);

  // Sorted unique clients
  const sortedClients = useMemo(() => {
    const clientMap = new Map<string, { name: string; bestOrder: number; latestUpdate: string }>();
    for (const r of trackerRows) {
      const order = STAGE_ORDER[r.video_edit_status?.toUpperCase()] || 5;
      const existing = clientMap.get(r.client_name);
      if (!existing || order < existing.bestOrder || (order === existing.bestOrder && r.updated_at > existing.latestUpdate)) {
        clientMap.set(r.client_name, { name: r.client_name, bestOrder: order, latestUpdate: r.updated_at || "" });
      }
    }
    return Array.from(clientMap.values())
      .filter(c => c.name)
      .sort((a, b) => a.bestOrder - b.bestOrder || b.latestUpdate.localeCompare(a.latestUpdate));
  }, [trackerRows]);

  const clientEvents = useMemo(() => {
    if (!selectedClient) return [];
    const events = new Set<string>();
    for (const r of trackerRows) {
      if (r.client_name === selectedClient && r.event_name) events.add(r.event_name);
    }
    return Array.from(events);
  }, [trackerRows, selectedClient]);

  const editTypes = useMemo(() => {
    if (!selectedClient || !selectedEvent) return [];
    const types = new Set<string>();
    for (const r of trackerRows) {
      if (r.client_name === selectedClient && r.event_name === selectedEvent && r.edit_type) {
        types.add(r.edit_type);
      }
    }
    return Array.from(types);
  }, [trackerRows, selectedClient, selectedEvent]);

  // Auto-generate title
  useEffect(() => {
    if (!selectedClient || !selectedEvent || !selectedEditType) return;
    (async () => {
      const regRow = trackerRows.find(r => r.client_name === selectedClient);
      if (!regRow) return;
      const { data: contact } = await supabase
        .from("contact_details_cache")
        .select("bride_full_name, groom_full_name")
        .eq("registered_date_time_ad", regRow.registered_date_time_ad)
        .maybeSingle();

      const bride = (contact?.bride_full_name || "").split(" ")[0] || "";
      const groom = (contact?.groom_full_name || "").split(" ")[0] || selectedClient.split(" ")[0] || "";
      const eventLabel = selectedEvent === "OVERALL" ? "Overall" : selectedEvent;

      if (bride && groom) {
        setTitle(`${bride} & ${groom} ${eventLabel} ${selectedEditType}`);
      } else if (groom) {
        setTitle(`${groom} ${eventLabel} ${selectedEditType}`);
      }
    })();
  }, [selectedClient, selectedEvent, selectedEditType, trackerRows]);

  const handleUpload = async () => {
    if (!videoFile || !title) {
      toast.error("Please fill all fields and select a video file");
      return;
    }

    setUploading(true);
    setProgress(0);
    setDone(false);

    try {
      const { data: initData, error: initError } = await supabase.functions.invoke("youtube-upload", {
        body: {
          title,
          description: `${title} | Xito Production`,
          tags: ["wedding", "nepal", "xito"],
          privacy: "private",
        },
      });

      if (initError || !initData?.upload_uri) {
        throw new Error(initData?.error || initError?.message || "Failed to init upload");
      }

      const uploadUri = initData.upload_uri;

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUri);
      xhr.setRequestHeader("Content-Type", videoFile.type || "video/mp4");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      const uploadResult = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(videoFile);
      });

      const videoId = uploadResult.id;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const matchRow = trackerRows.find(
        r => r.client_name === selectedClient && r.event_name === selectedEvent && r.edit_type === selectedEditType
      );
      if (matchRow) {
        await supabase
          .from("video_edit_tracker")
          .update({ youtube_link: youtubeUrl, updated_at: new Date().toISOString() })
          .eq("id", matchRow.id);
      }

      setDone(true);
      toast.success("Video uploaded to YouTube!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            Upload to YouTube
          </DialogTitle>
          <DialogDescription>Select a client, event, and video file — uploads go directly to your channel</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Client</Label>
            <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setSelectedEvent(""); setSelectedEditType(""); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {sortedClients.map(c => (
                  <SelectItem key={c.name} value={c.name}>
                    <span className={c.bestOrder === 1 ? "font-bold text-amber-600" : ""}>{c.name}</span>
                    {c.bestOrder === 1 && <span className="ml-2 text-[10px] text-amber-500">EXPORTED</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClient && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Event</Label>
              <Select value={selectedEvent} onValueChange={(v) => { setSelectedEvent(v); setSelectedEditType(""); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  {clientEvents.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEvent && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Edit Type</Label>
              <Select value={selectedEditType} onValueChange={setSelectedEditType}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select edit type..." /></SelectTrigger>
                <SelectContent>
                  {editTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Video Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Anjali & Shakti Wedding Full Video" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Video File</Label>
            <Input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,.mp4,.mov,.avi"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="h-auto py-2"
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground">
                {videoFile.name} — {(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{progress}% uploaded</p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Upload complete!
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleUpload}
            disabled={uploading || !videoFile || !title}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload to YouTube"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
