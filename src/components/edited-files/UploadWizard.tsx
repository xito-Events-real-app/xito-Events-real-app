import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { suggestFolderName, suggestSideFolder, buildDisplayPath } from "@/lib/edited-files-api";
import { useUploadContext } from "./EditedFilesUploadContext";
import { toast } from "@/hooks/use-toast";
import { Camera, Video, Upload, ChevronRight, Search, Edit2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadStarted: () => void;
}

interface BookedClient {
  registered_date_time_ad: string;
  client_name: string;
}

interface EventDetail {
  event_name: string;
  event_date_ad: string;
}

interface PhotographerOption {
  name: string;
  field: string;
  label: string;
}

export function UploadWizard({ open, onOpenChange, onUploadStarted }: Props) {
  const { addJobs } = useUploadContext();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<BookedClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<BookedClient | null>(null);
  const [fileType, setFileType] = useState<'photo' | 'video' | null>(null);
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [folderName, setFolderName] = useState('');
  const [photographers, setPhotographers] = useState<PhotographerOption[]>([]);
  const [selectedPhotographer, setSelectedPhotographer] = useState<PhotographerOption | null>(null);
  const [sideFolder, setSideFolder] = useState('');
  const [finalPath, setFinalPath] = useState('');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load booked clients
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('clients_cache')
        .select('registered_date_time_ad, client_name')
        .eq('sheet_source', 'booked')
        .order('client_name');
      setClients((data || []).filter(c => c.client_name) as BookedClient[]);
    })();
  }, [open]);

  // Load events when client selected
  useEffect(() => {
    if (!selectedClient) return;
    (async () => {
      const { data } = await supabase
        .from('event_details_cache')
        .select('event_name, event_date_ad')
        .eq('registered_date_time_ad', selectedClient.registered_date_time_ad);
      setEvents((data || []).filter(e => e.event_name) as EventDetail[]);
    })();
  }, [selectedClient]);

  // Load photographers when event selected
  useEffect(() => {
    if (!selectedClient || !selectedEvent) return;
    (async () => {
      const { data } = await supabase
        .from('freelancer_assignments')
        .select('*')
        .eq('registered_date_time_ad', selectedClient.registered_date_time_ad)
        .eq('event', selectedEvent.event_name);
      if (data && data.length > 0) {
        const row = data[0];
        const opts: PhotographerOption[] = [];
        const fields = [
          { field: 'photographer_bride', label: 'Bride Side' },
          { field: 'photographer_groom', label: 'Groom Side' },
          { field: 'extra_photographer', label: 'Extra Photographer' },
        ];
        for (const f of fields) {
          const val = (row as any)[f.field];
          if (val && val.trim()) {
            opts.push({ name: val.trim(), field: f.field, label: `${val.trim()} (${f.label})` });
          }
        }
        setPhotographers(opts);
      }
    })();
  }, [selectedClient, selectedEvent]);

  // Build path when selections change
  useEffect(() => {
    if (!selectedClient || !fileType) return;
    const path = buildDisplayPath(
      selectedClient.client_name || '',
      fileType,
      fileType === 'photo' ? folderName : undefined,
      fileType === 'photo' ? sideFolder : undefined
    );
    setFinalPath(path);
  }, [selectedClient, fileType, folderName, sideFolder]);

  const reset = () => {
    setStep(1);
    setSelectedClient(null);
    setFileType(null);
    setSelectedEvent(null);
    setFolderName('');
    setSelectedPhotographer(null);
    setSideFolder('');
    setFinalPath('');
    setClientSearch('');
    setIsEditingPath(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || !selectedClient || !fileType) return;
    const fileArray = Array.from(files);
    addJobs(fileArray, {
      registered_date_time_ad: selectedClient.registered_date_time_ad,
      client_name: selectedClient.client_name || '',
      file_type: fileType,
      event_name: selectedEvent?.event_name || '',
      folder_event_name: folderName,
      side_folder: sideFolder,
      photographer_name: selectedPhotographer?.name || '',
    });
    toast({ title: `${fileArray.length} file(s) queued for upload` });
    onUploadStarted();
    handleClose();
  };

  const filteredClients = clients.filter(c =>
    (c.client_name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const totalSteps = fileType === 'video' ? 4 : 6;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Files — Step {step}/{totalSteps}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Client */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="text-xs">Select Client</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredClients.map(c => (
                <button
                  key={c.registered_date_time_ad}
                  onClick={() => { setSelectedClient(c); setStep(2); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  {c.client_name}
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Photo or Video */}
        {step === 2 && (
          <div className="space-y-3">
            <Label className="text-xs">File Type for {selectedClient?.client_name}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setFileType('photo'); setStep(3); }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Camera className="h-10 w-10 text-amber-500" />
                <span className="font-semibold">Photos</span>
              </button>
              <button
                onClick={() => { setFileType('video'); setStep(3); }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Video className="h-10 w-10 text-red-500" />
                <span className="font-semibold">Videos</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3 for Video: Confirm path & upload */}
        {step === 3 && fileType === 'video' && (
          <div className="space-y-4">
            <Label className="text-xs">Upload Path</Label>
            <div className="p-3 rounded-lg bg-muted/50 border text-sm font-mono flex items-center gap-2">
              {isEditingPath ? (
                <Input value={finalPath} onChange={e => setFinalPath(e.target.value)} className="font-mono text-sm" />
              ) : (
                <>
                  <span className="flex-1">{finalPath} \</span>
                  <button onClick={() => setIsEditingPath(true)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/mp4"
                className="hidden"
                onChange={e => handleFilesSelected(e.target.files)}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                <Upload className="h-4 w-4" /> Select MP4 Files
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 for Photo: Select event */}
        {step === 3 && fileType === 'photo' && (
          <div className="space-y-3">
            <Label className="text-xs">Select Event</Label>
            <div className="space-y-1">
              {events.map(ev => (
                <button
                  key={ev.event_name}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setFolderName(suggestFolderName(ev.event_name || ''));
                    setStep(4);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between"
                >
                  <span>{ev.event_name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No events found</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4 for Photo: Folder name */}
        {step === 4 && fileType === 'photo' && (
          <div className="space-y-3">
            <Label className="text-xs">Folder Name (suggestion from "{selectedEvent?.event_name}")</Label>
            <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Wedding" />
            <Button onClick={() => setStep(5)} disabled={!folderName.trim()} className="w-full">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 5 for Photo: Select photographer / side */}
        {step === 5 && fileType === 'photo' && (
          <div className="space-y-3">
            <Label className="text-xs">Select Photographer</Label>
            <div className="space-y-1">
              {photographers.map(p => (
                <button
                  key={p.field}
                  onClick={() => {
                    setSelectedPhotographer(p);
                    setSideFolder(suggestSideFolder(p.field));
                    setStep(6);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  {p.label}
                </button>
              ))}
              {photographers.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No photographers assigned</p>
              )}
              <div className="pt-2">
                <Label className="text-xs">Or enter side folder manually</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={sideFolder} onChange={e => setSideFolder(e.target.value)} placeholder="e.g. Bride Side" />
                  <Button onClick={() => setStep(6)} disabled={!sideFolder.trim()} size="sm">Go</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6 for Photo: Confirm path & upload */}
        {step === 6 && fileType === 'photo' && (
          <div className="space-y-4">
            <Label className="text-xs">Upload Path</Label>
            <div className="p-3 rounded-lg bg-muted/50 border text-sm font-mono flex items-center gap-2">
              {isEditingPath ? (
                <Input value={finalPath} onChange={e => setFinalPath(e.target.value)} className="font-mono text-sm" />
              ) : (
                <>
                  <span className="flex-1">{finalPath} \</span>
                  <button onClick={() => setIsEditingPath(true)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg"
                className="hidden"
                onChange={e => handleFilesSelected(e.target.files)}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                <Upload className="h-4 w-4" /> Select JPG Files
              </Button>
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="mt-2">
            ← Back
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
