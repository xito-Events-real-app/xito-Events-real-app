import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Package, Camera, Video, Award, BookOpen, HardDrive } from "lucide-react";

interface EventInfo {
  name: string;
  month: string;
  day: string;
}

interface DeliverablesProps {
  events: EventInfo[];
}

interface ItemState {
  enabled: boolean;
  quantity: number;
  names: string[];
  albumName?: string;
}

type DeliverableKey = string; // "eventName::section::type"

function makeKey(event: string, section: string, type: string) {
  return `${event}::${section}::${type}`;
}

function buildDefaults(events: EventInfo[]): Record<DeliverableKey, ItemState> {
  const state: Record<DeliverableKey, ItemState> = {};

  for (const ev of events) {
    // Photos
    state[makeKey(ev.name, 'photos', 'all_photos')] = { enabled: true, quantity: 1, names: [] };
    state[makeKey(ev.name, 'photos', 'selected_photos')] = { enabled: false, quantity: 1, names: [] };
    state[makeKey(ev.name, 'photos', 'insta_post')] = { enabled: false, quantity: 1, names: [''] };
    // Videos
    state[makeKey(ev.name, 'videos', 'full_video')] = { enabled: true, quantity: 1, names: [] };
    state[makeKey(ev.name, 'videos', 'highlights')] = { enabled: true, quantity: 1, names: [`${ev.name} HIGHLIGHTS`] };
    state[makeKey(ev.name, 'videos', 'reel')] = { enabled: false, quantity: 1, names: [''] };
    state[makeKey(ev.name, 'videos', 'video_insta_post')] = { enabled: false, quantity: 1, names: [''] };
  }

  // Overall
  state[makeKey('OVERALL', 'overall', 'overall_highlights')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('OVERALL', 'overall', 'overall_reel')] = { enabled: false, quantity: 1, names: [''] };

  // Album
  state[makeKey('ALBUM', 'album', 'bride_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'groom_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'other_album')] = { enabled: false, quantity: 1, names: [''], albumName: '' };

  // Physical
  state[makeKey('PHYSICAL', 'physical', 'pendrive')] = { enabled: false, quantity: 0, names: [] };
  state[makeKey('PHYSICAL', 'physical', 'frame')] = { enabled: false, quantity: 0, names: [] };

  return state;
}

export default function DeliverablesSection({ events }: DeliverablesProps) {
  const [state, setState] = useState<Record<DeliverableKey, ItemState>>(() => buildDefaults(events));

  const get = (event: string, section: string, type: string): ItemState => {
    return state[makeKey(event, section, type)] || { enabled: false, quantity: 1, names: [] };
  };

  const update = (event: string, section: string, type: string, updates: Partial<ItemState>) => {
    const key = makeKey(event, section, type);
    setState(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No events found for this client.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Deliverables</h2>
      </div>

      {events.map(ev => (
        <EventCard key={ev.name} event={ev} get={get} update={update} />
      ))}

      <SectionCard title="OVERALL" icon={<Award className="h-4 w-4" />}>
        <div className="space-y-3">
          <MultiItemRow label="Overall Highlights" item={get('OVERALL', 'overall', 'overall_highlights')} onChange={u => update('OVERALL', 'overall', 'overall_highlights', u)} />
          <MultiItemRow label="Overall Reel" item={get('OVERALL', 'overall', 'overall_reel')} onChange={u => update('OVERALL', 'overall', 'overall_reel', u)} />
        </div>
      </SectionCard>

      <SectionCard title="ALBUM" icon={<BookOpen className="h-4 w-4" />}>
        <div className="space-y-3">
          <MultiItemRow label="Bride Side Album" item={get('ALBUM', 'album', 'bride_album')} onChange={u => update('ALBUM', 'album', 'bride_album', u)} />
          <MultiItemRow label="Groom Side Album" item={get('ALBUM', 'album', 'groom_album')} onChange={u => update('ALBUM', 'album', 'groom_album', u)} />
          <AlbumRow item={get('ALBUM', 'album', 'other_album')} onChange={u => update('ALBUM', 'album', 'other_album', u)} />
        </div>
      </SectionCard>

      <SectionCard title="PENDRIVE & FRAME" icon={<HardDrive className="h-4 w-4" />}>
        <div className="space-y-3">
          <QuantityRow label="Pendrive" item={get('PHYSICAL', 'physical', 'pendrive')} onChange={u => update('PHYSICAL', 'physical', 'pendrive', u)} />
          <QuantityRow label="Frame" item={get('PHYSICAL', 'physical', 'frame')} onChange={u => update('PHYSICAL', 'physical', 'frame', u)} />
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Event Card ─── */
function EventCard({ event, get, update }: {
  event: EventInfo;
  get: (e: string, s: string, t: string) => ItemState;
  update: (e: string, s: string, t: string, u: Partial<ItemState>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-center gap-3">
        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          {event.month} {event.day}
        </span>
        <span className="text-white font-bold text-sm uppercase tracking-wide">
          {event.name}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Photos */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Photos</span>
          </div>
          <div className="space-y-3">
            <SimpleRow label="All Photos" item={get(event.name, 'photos', 'all_photos')} onChange={u => update(event.name, 'photos', 'all_photos', u)} />
            <SimpleRow label="Selected Photos" item={get(event.name, 'photos', 'selected_photos')} onChange={u => update(event.name, 'photos', 'selected_photos', u)} />
            <MultiItemRow label="Insta Posts" item={get(event.name, 'photos', 'insta_post')} onChange={u => update(event.name, 'photos', 'insta_post', u)} />
          </div>
        </div>

        {/* Videos */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-4 w-4 text-accent-foreground" />
            <span className="text-xs font-bold text-accent-foreground uppercase tracking-wider">Videos</span>
          </div>
          <div className="space-y-3">
            <SimpleRow label="Full Video" item={get(event.name, 'videos', 'full_video')} onChange={u => update(event.name, 'videos', 'full_video', u)} />
            <MultiItemRow label="Highlights" item={get(event.name, 'videos', 'highlights')} onChange={u => update(event.name, 'videos', 'highlights', u)} />
            <MultiItemRow label="Reel" item={get(event.name, 'videos', 'reel')} onChange={u => update(event.name, 'videos', 'reel', u)} />
            <MultiItemRow label="Insta Posts" item={get(event.name, 'videos', 'video_insta_post')} onChange={u => update(event.name, 'videos', 'video_insta_post', u)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Simple Toggle Row ─── */
function SimpleRow({ label, item, onChange }: {
  label: string;
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={item.enabled} onCheckedChange={v => onChange({ enabled: v })} />
    </div>
  );
}

/* ─── Multi-Item Toggle with +/- and naming ─── */
function MultiItemRow({ label, item, onChange }: {
  label: string;
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
}) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');

  const handleToggle = (v: boolean) => {
    onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  };

  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    onChange({ quantity: newQty, names: newNames });
  };

  const handleName = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    onChange({ names: newNames });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-3">
          {item.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{item.quantity}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Switch checked={item.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>
      {item.enabled && item.quantity > 0 && (
        <div className="pl-4 space-y-1.5">
          {Array.from({ length: item.quantity }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground min-w-[60px]">{label} {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleName(idx, e.target.value)}
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

/* ─── Album Row (name first, then types) ─── */
function AlbumRow({ item, onChange }: {
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
}) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');

  const handleToggle = (v: boolean) => {
    onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  };

  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    onChange({ quantity: newQty, names: newNames });
  };

  const handleName = (idx: number, val: string) => {
    const newNames = [...names];
    newNames[idx] = val;
    onChange({ names: newNames });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm font-medium text-foreground">Other Album</span>
        <div className="flex items-center gap-3">
          {item.enabled && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{item.quantity}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Switch checked={item.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>
      {item.enabled && (
        <div className="pl-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-primary min-w-[60px] font-semibold">Album Name</span>
            <Input
              value={item.albumName || ''}
              onChange={e => onChange({ albumName: e.target.value })}
              placeholder="Album name..."
              className="h-7 text-xs"
            />
          </div>
          {Array.from({ length: item.quantity }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground min-w-[60px]">Type {idx + 1}</span>
              <Input
                value={names[idx] || ''}
                onChange={e => handleName(idx, e.target.value)}
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

/* ─── Quantity Only Row ─── */
function QuantityRow({ label, item, onChange }: {
  label: string;
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
}) {
  const handleToggle = (v: boolean) => {
    onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  };

  const handleQty = (delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    onChange({ quantity: newQty, enabled: newQty > 0 });
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {item.enabled && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs font-semibold text-foreground min-w-[18px] text-center">{item.quantity}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQty(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Switch checked={item.enabled} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
}

/* ─── Section Card ─── */
function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-center">
        <span className="text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2">
          {icon} {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
