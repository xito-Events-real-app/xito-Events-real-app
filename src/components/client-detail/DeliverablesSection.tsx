import { useState, useRef, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Package, Camera, Video, Award, BookOpen, HardDrive, ChevronDown } from "lucide-react";
import { FreelancerAssignment } from "@/lib/freelancer-assignment-api";
import { loadDeliverables, saveDeliverable, loadAlbumTypes, saveAlbumType, DeliverableRow } from "@/lib/deliverables-api";

interface EventInfo {
  name: string;
  month: string;
  day: string;
}

interface DeliverablesProps {
  events: EventInfo[];
  assignments?: FreelancerAssignment[];
  registeredDateTimeAD?: string;
}

interface ItemState {
  enabled: boolean;
  quantity: number;
  names: string[];
  albumName?: string;
  photographerToggles?: Record<string, boolean>;
  photographerNotes?: Record<string, string>;
}

type DeliverableKey = string;

function makeKey(event: string, section: string, type: string) {
  return `${event}::${section}::${type}`;
}

function parseKey(key: string): { event: string; section: string; type: string } {
  const [event, section, type] = key.split('::');
  return { event, section, type };
}

function buildDefaults(events: EventInfo[]): Record<DeliverableKey, ItemState> {
  const state: Record<DeliverableKey, ItemState> = {};

  for (const ev of events) {
    state[makeKey(ev.name, 'photos', 'all_photos')] = { enabled: true, quantity: 1, names: [] };
    state[makeKey(ev.name, 'photos', 'selected_photos')] = { enabled: false, quantity: 1, names: [], photographerToggles: {}, photographerNotes: {} };
    state[makeKey(ev.name, 'photos', 'insta_post')] = { enabled: false, quantity: 1, names: [''] };
    state[makeKey(ev.name, 'videos', 'full_video')] = { enabled: true, quantity: 1, names: [ev.name] };
    state[makeKey(ev.name, 'videos', 'highlights')] = { enabled: true, quantity: 1, names: [ev.name], albumName: ev.name };
    state[makeKey(ev.name, 'videos', 'reel')] = { enabled: false, quantity: 1, names: [''] };
    state[makeKey(ev.name, 'videos', 'video_insta_post')] = { enabled: false, quantity: 1, names: [''] };
  }

  state[makeKey('OVERALL', 'overall', 'overall_highlights')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('OVERALL', 'overall', 'overall_reel')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'bride_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'groom_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'other_album')] = { enabled: false, quantity: 1, names: [''], albumName: '' };
  state[makeKey('PHYSICAL', 'physical', 'pendrive')] = { enabled: false, quantity: 0, names: [] };
  state[makeKey('PHYSICAL', 'physical', 'frame')] = { enabled: false, quantity: 0, names: [] };

  return state;
}

/* ─── Split helper ─── */
function splitEventName(name: string): [string, string] {
  for (const sep of [' & ', ' + ', ' and ', ' AND ']) {
    const idx = name.indexOf(sep);
    if (idx !== -1) {
      return [name.slice(0, idx).trim(), name.slice(idx + sep.length).trim()];
    }
  }
  return [name, ''];
}

/* ─── Photographer helpers ─── */
interface PhotographerInfo {
  code: string;
  name: string;
  key: string;
}

function getPhotographersForEvent(eventName: string, assignments?: FreelancerAssignment[]): PhotographerInfo[] {
  if (!assignments) return [];
  const match = assignments.find(a => a.event?.trim().toLowerCase() === eventName.trim().toLowerCase());
  if (!match) return [];

  const photographers: PhotographerInfo[] = [];
  const order: { code: string; field: keyof FreelancerAssignment }[] = [
    { code: 'PB', field: 'photographerBride' },
    { code: 'PG', field: 'photographerGroom' },
    { code: 'EP', field: 'extraPhotographer' },
  ];

  for (const { code, field } of order) {
    const val = match[field] as string;
    if (val && val.trim()) {
      photographers.push({ code, name: val.trim(), key: `${code}::${val.trim()}` });
    }
  }
  return photographers;
}

/* ─── DB row <-> ItemState converters ─── */
function rowToState(row: DeliverableRow): ItemState {
  return {
    enabled: row.enabled,
    quantity: row.quantity,
    names: row.item_names ? row.item_names.split('|||') : [],
    albumName: row.album_name || undefined,
    photographerToggles: row.photographer_toggles ? (() => { try { return JSON.parse(row.photographer_toggles); } catch { return {}; } })() : {},
    photographerNotes: row.photographer_notes ? (() => { try { return JSON.parse(row.photographer_notes); } catch { return {}; } })() : {},
  };
}

function stateToRow(registeredDateTimeAD: string, event: string, section: string, type: string, item: ItemState): DeliverableRow {
  return {
    registered_date_time_ad: registeredDateTimeAD,
    event_name: event,
    section,
    deliverable_type: type,
    enabled: item.enabled,
    quantity: item.quantity,
    item_names: item.names.join('|||'),
    album_name: item.albumName || '',
    photographer_toggles: item.photographerToggles ? JSON.stringify(item.photographerToggles) : '',
    photographer_notes: item.photographerNotes ? JSON.stringify(item.photographerNotes) : '',
  };
}

export default function DeliverablesSection({ events, assignments, registeredDateTimeAD }: DeliverablesProps) {
  const [state, setState] = useState<Record<DeliverableKey, ItemState>>(() => buildDefaults(events));
  const [savedAlbumTypes, setSavedAlbumTypes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingItems = useRef<Record<string, ItemState>>({});

  // Load from DB on mount
  useEffect(() => {
    if (!registeredDateTimeAD) return;

    const load = async () => {
      const [rows, types] = await Promise.all([
        loadDeliverables(registeredDateTimeAD),
        loadAlbumTypes(),
      ]);

      setSavedAlbumTypes(types.length > 0 ? types : ['Magazine', 'Photobook', 'Canvas', 'Flush Mount', 'Coffee Table']);

      if (rows.length > 0) {
        setState(prev => {
          const merged = { ...prev };
          for (const row of rows) {
            const key = makeKey(row.event_name, row.section, row.deliverable_type);
            merged[key] = rowToState(row);
          }
          return merged;
        });
      }
      setLoaded(true);
      loadedRef.current = true;
    };
    load();
  }, [registeredDateTimeAD]);

  // Flush all pending saves on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      Object.values(debounceTimers.current).forEach(t => clearTimeout(t));
      debounceTimers.current = {};

      // Flush pending items
      if (registeredDateTimeAD) {
        Object.entries(pendingItems.current).forEach(([key, item]) => {
          const { event, section, type } = parseKey(key);
          const row = stateToRow(registeredDateTimeAD, event, section, type, item);
          saveDeliverable(row);
        });
        pendingItems.current = {};
      }
    };
  }, [registeredDateTimeAD]);

  // Debounced save for a specific key
  const debounceSave = useCallback((key: string, item: ItemState, immediate = false) => {
    if (!registeredDateTimeAD || !loadedRef.current) return;

    // Track as pending
    pendingItems.current[key] = item;

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    const doSave = () => {
      const { event, section, type } = parseKey(key);
      const row = stateToRow(registeredDateTimeAD, event, section, type, item);
      saveDeliverable(row);
      delete pendingItems.current[key];
    };

    if (immediate) {
      doSave();
    } else {
      debounceTimers.current[key] = setTimeout(doSave, 500);
    }
  }, [registeredDateTimeAD]);

  const handleSaveAlbumType = async (typeName: string) => {
    const trimmed = typeName.trim();
    if (trimmed && !savedAlbumTypes.includes(trimmed)) {
      setSavedAlbumTypes(prev => [...prev, trimmed]);
      await saveAlbumType(trimmed);
    }
  };

  const get = (event: string, section: string, type: string): ItemState => {
    return state[makeKey(event, section, type)] || { enabled: false, quantity: 1, names: [] };
  };

  const update = (event: string, section: string, type: string, updates: Partial<ItemState>) => {
    const key = makeKey(event, section, type);
    setState(prev => {
      const updated = { ...prev[key], ...updates };
      const newState = { ...prev, [key]: updated };
      debounceSave(key, updated);
      return newState;
    });
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
        <EventCard key={ev.name} event={ev} get={get} update={update} assignments={assignments} />
      ))}

      <SectionCard title="OVERALL" icon={<Award className="h-4 w-4" />}>
        <div className="space-y-3">
          <MultiItemRow label="Overall Highlights" item={get('OVERALL', 'overall', 'overall_highlights')} onChange={u => update('OVERALL', 'overall', 'overall_highlights', u)} />
          <MultiItemRow label="Overall Reel" item={get('OVERALL', 'overall', 'overall_reel')} onChange={u => update('OVERALL', 'overall', 'overall_reel', u)} />
        </div>
      </SectionCard>

      <SectionCard title="ALBUM" icon={<BookOpen className="h-4 w-4" />}>
        <div className="space-y-3">
          <AlbumTypeRow label="Bride Side Album" item={get('ALBUM', 'album', 'bride_album')} onChange={u => update('ALBUM', 'album', 'bride_album', u)} savedTypes={savedAlbumTypes} onSaveType={handleSaveAlbumType} />
          <AlbumTypeRow label="Groom Side Album" item={get('ALBUM', 'album', 'groom_album')} onChange={u => update('ALBUM', 'album', 'groom_album', u)} savedTypes={savedAlbumTypes} onSaveType={handleSaveAlbumType} />
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
function EventCard({ event, get, update, assignments }: {
  event: EventInfo;
  get: (e: string, s: string, t: string) => ItemState;
  update: (e: string, s: string, t: string, u: Partial<ItemState>) => void;
  assignments?: FreelancerAssignment[];
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
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Photos</span>
          </div>
          <div className="space-y-3">
            <SimpleRow label="All Photos" item={get(event.name, 'photos', 'all_photos')} onChange={u => update(event.name, 'photos', 'all_photos', u)} />
            <SelectedPhotosRow
              item={get(event.name, 'photos', 'selected_photos')}
              onChange={u => update(event.name, 'photos', 'selected_photos', u)}
              eventName={event.name}
              assignments={assignments}
            />
            <MultiItemRow label="Insta Posts" item={get(event.name, 'photos', 'insta_post')} onChange={u => update(event.name, 'photos', 'insta_post', u)} />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-4 w-4 text-accent-foreground" />
            <span className="text-xs font-bold text-accent-foreground uppercase tracking-wider">Videos</span>
          </div>
          <div className="space-y-3">
            <FullVideoRow eventName={event.name} item={get(event.name, 'videos', 'full_video')} onChange={u => update(event.name, 'videos', 'full_video', u)} />
            <HighlightsRow eventName={event.name} item={get(event.name, 'videos', 'highlights')} onChange={u => update(event.name, 'videos', 'highlights', u)} />
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

/* ─── Full Video Row with Smart Split ─── */
function FullVideoRow({ eventName, item, onChange }: {
  eventName: string;
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

    if (item.quantity === 1 && newQty === 2) {
      const [part1, part2] = splitEventName(newNames[0] || eventName);
      newNames[0] = part1;
      newNames.push(part2);
    } else {
      while (newNames.length < newQty) newNames.push('');
      if (newQty < newNames.length) newNames.length = newQty;
    }

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
        <span className="text-sm font-medium text-foreground">Full Video</span>
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
              <span className="text-[11px] text-muted-foreground min-w-[60px]">Full Video {idx + 1}</span>
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

/* ─── Highlights Row with Smart Split ─── */
function HighlightsRow({ eventName, item, onChange }: {
  eventName: string;
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

    if (item.quantity === 1 && newQty === 2) {
      const baseName = item.albumName || eventName;
      const [part1, part2] = splitEventName(baseName);
      newNames[0] = `${part1} HIGHLIGHTS`;
      newNames.push(part2 ? `${part2} HIGHLIGHTS` : '');
    } else {
      while (newNames.length < newQty) newNames.push('');
      if (newQty < newNames.length) newNames.length = newQty;
    }

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
        <span className="text-sm font-medium text-foreground">Highlights</span>
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
              <span className="text-[11px] text-muted-foreground min-w-[60px]">Highlights {idx + 1}</span>
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

/* ─── Selected Photos Row with Photographer Sub-Switches + Notes ─── */
function SelectedPhotosRow({ item, onChange, eventName, assignments }: {
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
  eventName: string;
  assignments?: FreelancerAssignment[];
}) {
  const photographers = getPhotographersForEvent(eventName, assignments);

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      const toggles: Record<string, boolean> = {};
      if (photographers.length === 1) {
        toggles[photographers[0].key] = true;
      } else {
        for (const p of photographers) {
          toggles[p.key] = false;
        }
      }
      onChange({ enabled: true, photographerToggles: toggles });
    } else {
      onChange({ enabled: false });
    }
  };

  const handlePhotographerToggle = (key: string, val: boolean) => {
    const toggles = { ...(item.photographerToggles || {}), [key]: val };
    onChange({ photographerToggles: toggles });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm font-medium text-foreground">Selected Photos</span>
        <Switch checked={item.enabled} onCheckedChange={handleToggle} />
      </div>

      {item.enabled && (
        <div className="pl-4 space-y-3">
          {photographers.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No photographers assigned</p>
          )}
          {photographers.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
              {photographers.map(p => {
                const isOn = item.photographerToggles?.[p.key] ?? false;
                return (
                  <div
                    key={p.key}
                    className={`flex items-center gap-1.5 transition-opacity ${isOn ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {p.code}
                    </span>
                    <span className="text-xs font-medium text-foreground">{p.name}</span>
                    <Switch
                      checked={isOn}
                      onCheckedChange={v => handlePhotographerToggle(p.key, v)}
                      className="scale-75"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Per-photographer notes */}
          {photographers.filter(p => item.photographerToggles?.[p.key]).map(p => (
            <Textarea
              key={p.key}
              value={item.photographerNotes?.[p.key] || ''}
              onChange={e => {
                const notes = { ...(item.photographerNotes || {}), [p.key]: e.target.value };
                onChange({ photographerNotes: notes });
              }}
              placeholder={`${p.code} ${p.name} notes...`}
              className="min-h-[50px] text-xs"
            />
          ))}
        </div>
      )}
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

/* ─── Album Type Row (Bride/Groom Side) ─── */
function AlbumTypeRow({ label, item, onChange, savedTypes, onSaveType }: {
  label: string;
  item: ItemState;
  onChange: (u: Partial<ItemState>) => void;
  savedTypes: string[];
  onSaveType: (name: string) => void;
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

  const handleSelectType = (idx: number, typeName: string) => {
    handleName(idx, typeName);
  };

  const handleBlurSave = (val: string) => {
    if (val.trim()) onSaveType(val);
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
            <AlbumTypeInput
              key={idx}
              idx={idx}
              value={names[idx] || ''}
              savedTypes={savedTypes}
              onSelect={(val) => handleSelectType(idx, val)}
              onChange={(val) => handleName(idx, val)}
              onBlurSave={handleBlurSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Album Type Input with dropdown suggestions ─── */
function AlbumTypeInput({ idx, value, savedTypes, onSelect, onChange, onBlurSave }: {
  idx: number;
  value: string;
  savedTypes: string[];
  onSelect: (val: string) => void;
  onChange: (val: string) => void;
  onBlurSave: (val: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = savedTypes.filter(t => 
    t.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground min-w-[60px]">Type {idx + 1}</span>
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => { setTimeout(() => setShowDropdown(false), 150); onBlurSave(value); }}
            placeholder="Album type..."
            className="h-7 text-xs pr-6"
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            onMouseDown={e => { e.preventDefault(); setShowDropdown(!showDropdown); }}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-[68px] right-0 z-50 mt-0.5 max-h-32 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.map(type => (
            <button
              key={type}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
              onMouseDown={e => { e.preventDefault(); onSelect(type); setShowDropdown(false); }}
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


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
