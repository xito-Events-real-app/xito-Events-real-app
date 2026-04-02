import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Youtube, Upload, Plus, ImageIcon, ListVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useYouTubeUploadContext } from "@/contexts/YouTubeUploadContext";

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

interface Playlist {
  id: string;
  title: string;
}

export function YouTubeUploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { startUpload } = useYouTubeUploadContext();
  const [trackerRows, setTrackerRows] = useState<TrackerRow[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEditType, setSelectedEditType] = useState("");
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Load tracker rows & playlists on open
  useEffect(() => {
    if (!open) {
      setDefaultsApplied(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("video_edit_tracker")
        .select("id, client_name, event_name, edit_type, video_edit_status, registered_date_time_ad, sub_event_name, updated_at")
        .eq("deleted", false);
      setTrackerRows(data || []);
    })();
    loadPlaylists();
  }, [open]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const { data } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "listPlaylists" },
      });
      if (data?.playlists) setPlaylists(data.playlists);
    } catch {
      console.warn("Failed to load playlists");
    } finally {
      setLoadingPlaylists(false);
    }
  };

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

  // Apply smart defaults on first load
  useEffect(() => {
    if (defaultsApplied || sortedClients.length === 0 || !open) return;
    setDefaultsApplied(true);

    const topClient = sortedClients[0];
    setSelectedClient(topClient.name);

    // Find the most recently exported event for this client
    const clientRows = trackerRows.filter(r => r.client_name === topClient.name);
    const exportedRows = clientRows.filter(r => r.video_edit_status?.toUpperCase() === 'EXPORTED');
    const bestRow = exportedRows.length > 0
      ? exportedRows.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0]
      : clientRows[0];

    if (bestRow?.event_name) setSelectedEvent(bestRow.event_name);

    // Default to Highlights
    const eventRows = clientRows.filter(r => r.event_name === bestRow?.event_name);
    const hasHighlights = eventRows.some(r => r.edit_type === "Highlights");
    setSelectedEditType(hasHighlights ? "Highlights" : (eventRows[0]?.edit_type || "Highlights"));
  }, [sortedClients, trackerRows, defaultsApplied, open]);

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

  // Auto-generate title in ALL CAPS
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
      const eventLabel = selectedEvent === "OVERALL" ? "WEDDING" : selectedEvent;

      let generatedTitle = "";
      if (bride && groom) {
        generatedTitle = `${bride} & ${groom} ${eventLabel} ${selectedEditType} || WEDDING TALES NEPAL`;
      } else if (groom) {
        generatedTitle = `${groom} ${eventLabel} ${selectedEditType} || WEDDING TALES NEPAL`;
      }
      setTitle(generatedTitle.toUpperCase());

      // Auto-suggest playlist
      const playlistSuggestion = bride && groom
        ? `${bride} & ${groom} WEDDING STORY`
        : `${groom} WEDDING STORY`;
      setNewPlaylistName(playlistSuggestion.toUpperCase());

      // Find matching playlist
      const matchingPlaylist = playlists.find(p =>
        p.title.toUpperCase().includes(bride.toUpperCase()) &&
        p.title.toUpperCase().includes(groom.toUpperCase())
      );
      if (matchingPlaylist) {
        setSelectedPlaylistId(matchingPlaylist.id);
        setShowNewPlaylist(false);
      } else {
        setSelectedPlaylistId("__new__");
        setShowNewPlaylist(true);
      }
    })();
  }, [selectedClient, selectedEvent, selectedEditType, trackerRows, playlists]);

  // Handle thumbnail preview
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const matchingTrackerRow = useMemo(() => {
    return trackerRows.find(
      r => r.client_name === selectedClient && r.event_name === selectedEvent && r.edit_type === selectedEditType
    );
  }, [trackerRows, selectedClient, selectedEvent, selectedEditType]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setCreatingPlaylist(true);
    try {
      const { data } = await supabase.functions.invoke("youtube-upload", {
        body: { action: "createPlaylist", playlistTitle: newPlaylistName.trim() },
      });
      if (data?.playlistId) {
        const newPl = { id: data.playlistId, title: newPlaylistName.trim() };
        setPlaylists(prev => [newPl, ...prev]);
        setSelectedPlaylistId(data.playlistId);
        setShowNewPlaylist(false);
        toast.success("Playlist created!");
      }
    } catch (err: any) {
      toast.error("Failed to create playlist: " + err.message);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !title) {
      toast.error("Please fill all fields and select a video file");
      return;
    }

    let playlistId = selectedPlaylistId;

    // Auto-create playlist if __new__
    if (playlistId === "__new__" && newPlaylistName.trim()) {
      try {
        const { data } = await supabase.functions.invoke("youtube-upload", {
          body: { action: "createPlaylist", playlistTitle: newPlaylistName.trim() },
        });
        if (data?.playlistId) {
          playlistId = data.playlistId;
          setPlaylists(prev => [{ id: data.playlistId, title: newPlaylistName.trim() }, ...prev]);
          setSelectedPlaylistId(data.playlistId);
          setShowNewPlaylist(false);
        }
      } catch {
        toast.error("Failed to create playlist, uploading without playlist");
        playlistId = "";
      }
    }

    try {
      await startUpload({
        file: videoFile,
        title,
        clientName: selectedClient,
        eventName: selectedEvent,
        editType: selectedEditType,
        playlistId: playlistId === "__new__" ? "" : playlistId,
        playlistTitle: newPlaylistName,
        thumbnailFile,
        trackerRowId: matchingTrackerRow?.id || "",
        privacy: "private",
      });
      toast.success("Upload started! Track progress in the bottom-right panel.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    }
  };

  // Sorted playlists with matching ones first
  const sortedPlaylists = useMemo(() => {
    if (!selectedClient) return playlists;
    const clientFirst = selectedClient.split(" ")[0]?.toUpperCase() || "";
    return [...playlists].sort((a, b) => {
      const aMatch = a.title.toUpperCase().includes(clientFirst) ? 0 : 1;
      const bMatch = b.title.toUpperCase().includes(clientFirst) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [playlists, selectedClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border-gray-200 text-gray-900 [&>button]:text-gray-500">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Youtube className="w-6 h-6 text-red-600" />
            Upload to YouTube
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Select client, event, and video — uploads go directly to your channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Client</Label>
            <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setSelectedEvent(""); setSelectedEditType(""); }}>
              <SelectTrigger className="h-9 bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent className="max-h-60 bg-white border-gray-200">
                {sortedClients.map(c => (
                  <SelectItem key={c.name} value={c.name} className="text-gray-900 hover:bg-red-50">
                    <span className={c.bestOrder === 1 ? "font-bold text-red-600" : ""}>{c.name}</span>
                    {c.bestOrder === 1 && <span className="ml-2 text-[10px] text-red-600">EXPORTED</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event + Edit Type row */}
          <div className="grid grid-cols-2 gap-3">
            {selectedClient && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Event</Label>
                <Select value={selectedEvent} onValueChange={(v) => { setSelectedEvent(v); setSelectedEditType(""); }}>
                  <SelectTrigger className="h-9 bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Event..." /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {clientEvents.map(e => <SelectItem key={e} value={e} className="text-gray-900 hover:bg-red-50">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedEvent && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Edit Type</Label>
                <Select value={selectedEditType} onValueChange={setSelectedEditType}>
                  <SelectTrigger className="h-9 bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Type..." /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {editTypes.map(t => <SelectItem key={t} value={t} className="text-gray-900 hover:bg-red-50">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Video Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-300">Video Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VIDEO TITLE"
              className="bg-[#1a1a1a] border-gray-700 text-white uppercase font-semibold"
            />
          </div>

          {/* Playlist section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <ListVideo className="h-3.5 w-3.5" /> Playlist
            </Label>
            <Select value={selectedPlaylistId} onValueChange={(v) => {
              setSelectedPlaylistId(v);
              setShowNewPlaylist(v === "__new__");
            }}>
              <SelectTrigger className="h-9 bg-[#1a1a1a] border-gray-700 text-white">
                <SelectValue placeholder={loadingPlaylists ? "Loading..." : "Select playlist..."} />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-[#1a1a1a] border-gray-700">
                <SelectItem value="__none__" className="text-gray-400 hover:bg-red-500/10">No playlist</SelectItem>
                <SelectItem value="__new__" className="text-red-400 hover:bg-red-500/10">
                  <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Create new playlist</span>
                </SelectItem>
                {sortedPlaylists.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-white hover:bg-red-500/10">{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showNewPlaylist && (
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="PLAYLIST NAME"
                  className="bg-[#1a1a1a] border-gray-700 text-white uppercase font-semibold flex-1"
                />
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist || !newPlaylistName.trim()}
                >
                  {creatingPlaylist ? "Creating..." : "Create"}
                </Button>
              </div>
            )}
          </div>

          {/* Video File */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-300">Video File</Label>
            <Input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,.mp4,.mov,.avi"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="h-auto py-2 bg-[#1a1a1a] border-gray-700 text-white file:text-white file:bg-red-600 file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer"
            />
            {videoFile && (
              <p className="text-xs text-gray-400">
                {videoFile.name} — {(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB
              </p>
            )}
          </div>

          {/* Thumbnail */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Thumbnail (optional)
            </Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="h-auto py-2 bg-[#1a1a1a] border-gray-700 text-white file:text-white file:bg-gray-700 file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer"
            />
            {thumbnailPreview && (
              <div className="mt-1.5">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-20 rounded-lg border border-gray-700 object-cover" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <Button
            className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-base py-5"
            onClick={handleUpload}
            disabled={!videoFile || !title}
          >
            <Upload className="w-5 h-5" />
            Upload to YouTube
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
