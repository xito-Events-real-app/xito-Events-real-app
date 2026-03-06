import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Package, Camera, Video, Award, BookOpen, HardDrive } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DeliverableRow {
  id: string;
  registered_date_time_ad: string;
  event_name: string;
  section: string;
  deliverable_type: string;
  enabled: boolean;
  quantity: number;
  item_names: string;
  album_name: string;
}

interface EventInfo {
  eventName: string;
  eventMonth: string;
  eventDay: string;
}

const EVENT_PHOTO_DEFAULTS: { type: string; enabled: boolean }[] = [
  { type: 'all_photos', enabled: true },
  { type: 'selected_photos', enabled: false },
  { type: 'insta_post', enabled: false },
];

const EVENT_VIDEO_DEFAULTS: { type: string; enabled: boolean }[] = [
  { type: 'full_video', enabled: true },
  { type: 'highlights', enabled: true },
  { type: 'reel', enabled: false },
  { type: 'video_insta_post', enabled: false },
];

const OVERALL_DEFAULTS: { type: string; enabled: boolean }[] = [
  { type: 'overall_highlights', enabled: false },
  { type: 'overall_reel', enabled: false },
];

const ALBUM_DEFAULTS: { type: string; enabled: boolean }[] = [
  { type: 'bride_album', enabled: false },
  { type: 'groom_album', enabled: false },
  { type: 'other_album', enabled: false },
];

const PHYSICAL_DEFAULTS: { type: string; enabled: boolean }[] = [
  { type: 'pendrive', enabled: false },
  { type: 'frame', enabled: false },
];

interface DeliverablesProps {
  registeredDateTimeAD: string;
}

export default function DeliverablesSection({ registeredDateTimeAD }: DeliverablesProps) {
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!registeredDateTimeAD || loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data: eventRows } = await supabase
          .from('event_details_cache')
          .select('event_name, event_month, event_day')
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .order('event_index');

        const eventList: EventInfo[] = (eventRows || [])
          .filter(e => e.event_name?.trim())
          .map(e => ({ eventName: e.event_name!, eventMonth: e.event_month || '', eventDay: e.event_day || '' }));
        setEvents(eventList);

        const { data: existing } = await supabase
          .from('client_deliverables')
          .select('*')
          .eq('registered_date_time_ad', registeredDateTimeAD);

        const rows = (existing || []) as DeliverableRow[];
        const inserts: any[] = [];

        const makeInsert = (eventName: string, section: string, type: string, enabled: boolean, itemNames = '') => ({
          registered_date_time_ad: registeredDateTimeAD,
          event_name: eventName,
          section,
          deliverable_type: type,
          enabled,
          quantity: enabled ? 1 : 1,
          item_names: itemNames,
          album_name: '',
        });

        for (const ev of eventList) {
          for (const d of EVENT_PHOTO_DEFAULTS) {
            if (!rows.find(r => r.event_name === ev.eventName && r.deliverable_type === d.type && r.section === 'photos')) {
              inserts.push(makeInsert(ev.eventName, 'photos', d.type, d.enabled));
            }
          }
          for (const d of EVENT_VIDEO_DEFAULTS) {
            if (!rows.find(r => r.event_name === ev.eventName && r.deliverable_type === d.type && r.section === 'videos')) {
              const defaultName = d.type === 'highlights' ? `${ev.eventName} HIGHLIGHTS` : '';
              inserts.push(makeInsert(ev.eventName, 'videos', d.type, d.enabled, defaultName));
            }
          }
        }

        for (const d of OVERALL_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'OVERALL' && r.deliverable_type === d.type)) {
            inserts.push(makeInsert('OVERALL', 'overall', d.type, d.enabled));
          }
        }
        for (const d of ALBUM_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'ALBUM' && r.deliverable_type === d.type)) {
            inserts.push(makeInsert('ALBUM', 'album', d.type, d.enabled));
          }
        }
        for (const d of PHYSICAL_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'PENDRIVE_FRAME' && r.deliverable_type === d.type)) {
            inserts.push({ ...makeInsert('PENDRIVE_FRAME', 'pendrive_frame', d.type, d.enabled), quantity: 0 });
          }
        }

        if (inserts.length > 0) {
          const { data: inserted, error } = await supabase.from('client_deliverables').insert(inserts).select();
          if (error) {
            console.error('Failed to insert deliverables:', error);
            toast({ title: "Error", description: `Failed to create deliverables: ${error.message}`, variant: "destructive" });
            setDeliverables(rows);
          } else {
            setDeliverables([...rows, ...(inserted || []) as DeliverableRow[]]);
          }
        } else {
          setDeliverables(rows);
        }
      } catch (err) {
        console.error('Failed to load deliverables:', err);
        toast({ title: "Error", description: "Failed to load deliverables", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [registeredDateTimeAD]);

  const updateRow = useCallback(async (id: string, updates: Partial<DeliverableRow>) => {
    setDeliverables(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const { error } = await supabase
      .from('client_deliverables')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('Failed to update deliverable:', error);
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  }, []);

  const getRow = useCallback((eventName: string, section: string, type: string) => {
    return deliverables.find(r => r.event_name === eventName && r.section === section && r.deliverable_type === type);
  }, [deliverables]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading deliverables...</div>;
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Deliverables</h2>
      </div>

      {events.map(ev => (
        <EventDeliverableCard key={ev.eventName} event={ev} getRow={getRow} updateRow={updateRow} />
      ))}

      <SectionCard title="OVERALL" icon={<Award className="h-4 w-4" />}>
        <div className="space-y-3">
          <MultiItemToggle row={getRow('OVERALL', 'overall', 'overall_highlights')} label="Overall Highlights" updateRow={updateRow} />
          <MultiItemToggle row={getRow('OVERALL', 'overall', 'overall_reel')} label="Overall Reel" updateRow={updateRow} />
        </div>
      </SectionCard>

      <SectionCard title="ALBUM" icon={<BookOpen className="h-4 w-4" />}>
        <div className="space-y-3">
          <MultiItemToggle row={getRow('ALBUM', 'album', 'bride_album')} label="Bride Side Album" updateRow={updateRow} />
          <MultiItemToggle row={getRow('ALBUM', 'album', 'groom_album')} label="Groom Side Album" updateRow={updateRow} />
          <AlbumToggle row={getRow('ALBUM', 'album', 'other_album')} updateRow={updateRow} />
        </div>
      </SectionCard>

      <SectionCard title="PENDRIVE & FRAME" icon={<HardDrive className="h-4 w-4" />}>
        <div className="space-y-3">
          <QuantityOnlyToggle row={getRow('PENDRIVE_FRAME', 'pendrive_frame', 'pendrive')} label="Pendrive" updateRow={updateRow} />
          <QuantityOnlyToggle row={getRow('PENDRIVE_FRAME', 'pendrive_frame', 'frame')} label="Frame" updateRow={updateRow} />
        </div>
      </SectionCard>
    </div>
  );
}

function EventDeliverableCard({ event, getRow, updateRow }: {
  event: EventInfo;
  getRow: (eventName: string, section: string, type: string) => DeliverableRow | undefined;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-destructive/90 px-4 py-3 text-center">
        <span className="text-destructive-foreground font-black text-sm uppercase tracking-wide">
          {event.eventMonth} {event.eventDay} — {event.eventName}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Photos</span>
          </div>
          <div className="space-y-3">
            <SimpleToggle row={getRow(event.eventName, 'photos', 'all_photos')} label="All Photos" updateRow={updateRow} />
            <SimpleToggle row={getRow(event.eventName, 'photos', 'selected_photos')} label="Selected Photos" updateRow={updateRow} />
            <MultiItemToggle row={getRow(event.eventName, 'photos', 'insta_post')} label="Insta Posts" updateRow={updateRow} />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-4 w-4 text-accent-foreground" />
            <span className="text-xs font-bold text-accent-foreground uppercase tracking-wider">Videos</span>
          </div>
          <div className="space-y-3">
            <SimpleToggle row={getRow(event.eventName, 'videos', 'full_video')} label="Full Video" updateRow={updateRow} />
            <MultiItemToggle row={getRow(event.eventName, 'videos', 'highlights')} label="Highlights" updateRow={updateRow} />
            <MultiItemToggle row={getRow(event.eventName, 'videos', 'reel')} label="Reel" updateRow={updateRow} />
            <MultiItemToggle row={getRow(event.eventName, 'videos', 'video_insta_post')} label="Insta Posts" updateRow={updateRow} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleToggle({ row, label, updateRow }: {
  row: DeliverableRow | undefined;
  label: string;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={row.enabled} onCheckedChange={v => updateRow(row.id, { enabled: v })} />
    </div>
  );
}

function MultiItemToggle({ row, label, updateRow }: {
  row: DeliverableRow | undefined;
  label: string;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;

  const names = row.item_names ? row.item_names.split(',') : [];
  while (names.length < row.quantity) names.push('');

  const handleToggle = (v: boolean) => {
    updateRow(row.id, { enabled: v, quantity: v ? Math.max(row.quantity, 1) : row.quantity });
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, row.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    updateRow(row.id, { quantity: newQty, item_names: newNames.join(',') });
  };

  const handleNameChange = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    updateRow(row.id, { item_names: newNames.join(',') });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-3">
          {row.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{row.quantity}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Switch checked={row.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {row.enabled && row.quantity > 0 && (
        <div className="pl-4 space-y-1.5">
          {Array.from({ length: row.quantity }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground min-w-[60px]">{label} {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleNameChange(idx, e.target.value)}
                placeholder="Name..."
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumToggle({ row, updateRow }: {
  row: DeliverableRow | undefined;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;

  const names = row.item_names ? row.item_names.split(',') : [];
  while (names.length < row.quantity) names.push('');

  const handleToggle = (v: boolean) => {
    updateRow(row.id, { enabled: v, quantity: v ? Math.max(row.quantity, 1) : row.quantity });
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, row.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    updateRow(row.id, { quantity: newQty, item_names: newNames.join(',') });
  };

  const handleNameChange = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    updateRow(row.id, { item_names: newNames.join(',') });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm font-medium text-foreground">Other Album</span>
        <div className="flex items-center gap-3">
          {row.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{row.quantity}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Switch checked={row.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {row.enabled && (
        <div className="pl-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-primary min-w-[60px] font-semibold">Album Name</span>
            <Input
              value={row.album_name || ''}
              onChange={e => updateRow(row.id, { album_name: e.target.value })}
              placeholder="Album name..."
              className="h-7 text-xs"
            />
          </div>
          {Array.from({ length: row.quantity }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground min-w-[60px]">Type {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleNameChange(idx, e.target.value)}
                placeholder="Album type..."
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuantityOnlyToggle({ row, label, updateRow }: {
  row: DeliverableRow | undefined;
  label: string;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;

  const handleToggle = (v: boolean) => {
    updateRow(row.id, { enabled: v, quantity: v ? Math.max(row.quantity, 1) : row.quantity });
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(0, row.quantity + delta);
    updateRow(row.id, { quantity: newQty, enabled: newQty > 0 });
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {row.enabled && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{row.quantity}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Switch checked={row.enabled} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-destructive/90 px-4 py-3 text-center">
        <span className="text-destructive-foreground font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2">
          {icon} {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
