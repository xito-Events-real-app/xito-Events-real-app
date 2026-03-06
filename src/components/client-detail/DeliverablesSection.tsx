import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Package, Camera, Video, Award, BookOpen, HardDrive, Frame } from "lucide-react";
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

// Types that support multi-item naming
const MULTI_ITEM_TYPES = ['insta_post', 'highlights', 'reel', 'overall_highlights', 'overall_reel', 'bride_album', 'groom_album', 'other_album'];

// Default deliverables per event
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

const TYPE_LABELS: Record<string, string> = {
  all_photos: 'All Photos',
  selected_photos: 'Selected Photos',
  insta_post: 'Insta Posts',
  full_video: 'Full Video',
  highlights: 'Highlights',
  reel: 'Reel',
  video_insta_post: 'Insta Posts',
  overall_highlights: 'Overall Highlights',
  overall_reel: 'Overall Reel',
  bride_album: 'Bride Side Album',
  groom_album: 'Groom Side Album',
  other_album: 'Other Album',
  pendrive: 'Pendrive',
  frame: 'Frame',
};

interface DeliverablesProps {
  registeredDateTimeAD: string;
}

export default function DeliverablesSection({ registeredDateTimeAD }: DeliverablesProps) {
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  // Load events + deliverables
  useEffect(() => {
    if (!registeredDateTimeAD || loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        // Load events
        const { data: eventRows } = await supabase
          .from('event_details_cache')
          .select('event_name, event_month, event_day')
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .order('event_index');

        const eventList: EventInfo[] = (eventRows || [])
          .filter(e => e.event_name?.trim())
          .map(e => ({ eventName: e.event_name!, eventMonth: e.event_month || '', eventDay: e.event_day || '' }));
        setEvents(eventList);

        // Load existing deliverables
        const { data: existing } = await supabase
          .from('client_deliverables')
          .select('*')
          .eq('registered_date_time_ad', registeredDateTimeAD);

        const rows = (existing || []) as DeliverableRow[];

        // Auto-create defaults for events that don't have rows yet
        const inserts: any[] = [];
        for (const ev of eventList) {
          for (const d of EVENT_PHOTO_DEFAULTS) {
            if (!rows.find(r => r.event_name === ev.eventName && r.deliverable_type === d.type && r.section === 'photos')) {
              const defaultNames = d.type === 'highlights' ? `${ev.eventName} HIGHLIGHTS` : '';
              inserts.push({
                registered_date_time_ad: registeredDateTimeAD,
                event_name: ev.eventName,
                section: 'photos',
                deliverable_type: d.type,
                enabled: d.enabled,
                quantity: d.type === 'highlights' && d.enabled ? 1 : 1,
                item_names: defaultNames,
              });
            }
          }
          for (const d of EVENT_VIDEO_DEFAULTS) {
            if (!rows.find(r => r.event_name === ev.eventName && r.deliverable_type === d.type && r.section === 'videos')) {
              const defaultNames = d.type === 'highlights' ? `${ev.eventName} HIGHLIGHTS` : '';
              inserts.push({
                registered_date_time_ad: registeredDateTimeAD,
                event_name: ev.eventName,
                section: 'videos',
                deliverable_type: d.type,
                enabled: d.enabled,
                quantity: d.type === 'highlights' ? 1 : 1,
                item_names: defaultNames,
              });
            }
          }
        }

        // Overall defaults
        for (const d of OVERALL_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'OVERALL' && r.deliverable_type === d.type)) {
            inserts.push({ registered_date_time_ad: registeredDateTimeAD, event_name: 'OVERALL', section: 'overall', deliverable_type: d.type, enabled: d.enabled, quantity: 1, item_names: '' });
          }
        }
        // Album defaults
        for (const d of ALBUM_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'ALBUM' && r.deliverable_type === d.type)) {
            inserts.push({ registered_date_time_ad: registeredDateTimeAD, event_name: 'ALBUM', section: 'album', deliverable_type: d.type, enabled: d.enabled, quantity: 1, item_names: '', album_name: '' });
          }
        }
        // Physical defaults
        for (const d of PHYSICAL_DEFAULTS) {
          if (!rows.find(r => r.event_name === 'PENDRIVE_FRAME' && r.deliverable_type === d.type)) {
            inserts.push({ registered_date_time_ad: registeredDateTimeAD, event_name: 'PENDRIVE_FRAME', section: 'pendrive_frame', deliverable_type: d.type, enabled: d.enabled, quantity: 0, item_names: '' });
          }
        }

        if (inserts.length > 0) {
          const { data: inserted } = await supabase.from('client_deliverables').insert(inserts).select();
          setDeliverables([...rows, ...(inserted || []) as DeliverableRow[]]);
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
    // Optimistic local update
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
    return <div className="flex items-center justify-center py-20 text-white/50">Loading deliverables...</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Deliverables</h2>
      </div>

      {/* Per-event sections */}
      {events.map(ev => (
        <EventDeliverableCard
          key={ev.eventName}
          event={ev}
          getRow={getRow}
          updateRow={updateRow}
        />
      ))}

      {/* Overall section */}
      <SpecialSectionCard
        title="OVERALL"
        icon={<Award className="h-4 w-4" />}
        bgClass="bg-purple-900/50 border-purple-700/30"
      >
        <div className="space-y-3">
          <MultiItemToggle row={getRow('OVERALL', 'overall', 'overall_highlights')} label="Overall Highlights" updateRow={updateRow} />
          <MultiItemToggle row={getRow('OVERALL', 'overall', 'overall_reel')} label="Overall Reel" updateRow={updateRow} />
        </div>
      </SpecialSectionCard>

      {/* Album section */}
      <SpecialSectionCard
        title="ALBUM"
        icon={<BookOpen className="h-4 w-4" />}
        bgClass="bg-amber-900/40 border-amber-700/30"
      >
        <div className="space-y-3">
          <MultiItemToggle row={getRow('ALBUM', 'album', 'bride_album')} label="Bride Side Album" updateRow={updateRow} />
          <MultiItemToggle row={getRow('ALBUM', 'album', 'groom_album')} label="Groom Side Album" updateRow={updateRow} />
          <AlbumToggle row={getRow('ALBUM', 'album', 'other_album')} updateRow={updateRow} />
        </div>
      </SpecialSectionCard>

      {/* Pendrive & Frame */}
      <SpecialSectionCard
        title="PENDRIVE & FRAME"
        icon={<HardDrive className="h-4 w-4" />}
        bgClass="bg-slate-800/80 border-slate-600/30"
      >
        <div className="space-y-3">
          <QuantityOnlyToggle row={getRow('PENDRIVE_FRAME', 'pendrive_frame', 'pendrive')} label="Pendrive" updateRow={updateRow} />
          <QuantityOnlyToggle row={getRow('PENDRIVE_FRAME', 'pendrive_frame', 'frame')} label="Frame" updateRow={updateRow} />
        </div>
      </SpecialSectionCard>
    </div>
  );
}

// ── Event Card ──
function EventDeliverableCard({ event, getRow, updateRow }: {
  event: EventInfo;
  getRow: (eventName: string, section: string, type: string) => DeliverableRow | undefined;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Event header */}
      <div className="bg-red-900/70 px-4 py-3 text-center">
        <span className="text-white font-black text-base uppercase tracking-wide">
          {event.eventMonth} {event.eventDay} — {event.eventName}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 bg-slate-900/80">
        {/* Photos column */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Photos</span>
          </div>
          <div className="space-y-3">
            <SimpleToggle row={getRow(event.eventName, 'photos', 'all_photos')} label="All Photos" updateRow={updateRow} />
            <SimpleToggle row={getRow(event.eventName, 'photos', 'selected_photos')} label="Selected Photos" updateRow={updateRow} />
            <MultiItemToggle row={getRow(event.eventName, 'photos', 'insta_post')} label="Insta Posts" updateRow={updateRow} />
          </div>
        </div>

        {/* Videos column */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Videos</span>
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

// ── Simple on/off toggle (no quantity/names) ──
function SimpleToggle({ row, label, updateRow }: {
  row: DeliverableRow | undefined;
  label: string;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/80">{label}</span>
      <Switch checked={row.enabled} onCheckedChange={v => updateRow(row.id, { enabled: v })} />
    </div>
  );
}

// ── Multi-item toggle (quantity + names) ──
function MultiItemToggle({ row, label, updateRow }: {
  row: DeliverableRow | undefined;
  label: string;
  updateRow: (id: string, updates: Partial<DeliverableRow>) => Promise<void>;
}) {
  if (!row) return null;

  const names = row.item_names ? row.item_names.split(',') : [];
  // Ensure names array matches quantity
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80">{label}</span>
        <div className="flex items-center gap-3">
          {row.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs text-white/70 min-w-[18px] text-center">{row.quantity}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(1)}>
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
              <span className="text-[11px] text-white/40 min-w-[60px]">{label} {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleNameChange(idx, e.target.value)}
                placeholder="Name..."
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Album with album_name field for "Other" ──
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80">Other Album</span>
        <div className="flex items-center gap-3">
          {row.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs text-white/70 min-w-[18px] text-center">{row.quantity}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(1)}>
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
            <span className="text-[11px] text-amber-400/80 min-w-[60px]">Album Name</span>
            <Input
              value={row.album_name || ''}
              onChange={e => updateRow(row.id, { album_name: e.target.value })}
              placeholder="Album name..."
              className="h-7 text-xs bg-white/5 border-amber-500/20 text-white placeholder:text-white/30"
            />
          </div>
          {Array.from({ length: row.quantity }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 min-w-[60px]">Type {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleNameChange(idx, e.target.value)}
                placeholder="Album type..."
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quantity-only toggle (pendrive/frame) ──
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/80">{label}</span>
      <div className="flex items-center gap-3">
        {row.enabled && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-white/70 min-w-[18px] text-center">{row.quantity}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleQuantityChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Switch checked={row.enabled} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
}

// ── Special section wrapper ──
function SpecialSectionCard({ title, icon, bgClass, children }: {
  title: string;
  icon: React.ReactNode;
  bgClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${bgClass}`}>
      <div className="bg-red-900/70 px-4 py-3 text-center">
        <span className="text-white font-black text-base uppercase tracking-wide flex items-center justify-center gap-2">
          {icon} {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
