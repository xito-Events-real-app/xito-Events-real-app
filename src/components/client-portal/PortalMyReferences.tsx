import { useState, useEffect, useCallback } from "react";
import { Sparkles, Instagram, Youtube, Globe, Music2, Pin, Plus, Trash2, ExternalLink, ChevronDown, Link2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPortalReferences, addPortalReference, deletePortalReference, PortalReference } from "@/lib/client-portal-references-api";

type Platform = 'instagram' | 'youtube' | 'pinterest' | 'tiktok' | 'website' | 'other';

const platforms: { id: Platform; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'pinterest', label: 'Pinterest', icon: Pin, color: 'text-red-600' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-gray-800' },
  { id: 'website', label: 'Website', icon: Globe, color: 'text-blue-500' },
  { id: 'other', label: 'Other', icon: Link2, color: 'text-gray-500' },
];

interface PortalMyReferencesProps {
  registeredDateTimeAD: string;
  events: { eventName: string }[];
}

const PortalMyReferences = ({ registeredDateTimeAD, events }: PortalMyReferencesProps) => {
  const [refs, setRefs] = useState<PortalReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState(''); // '' = General
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddDemand, setShowAddDemand] = useState(false);

  // Add link form
  const [linkPlatform, setLinkPlatform] = useState<Platform>('instagram');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Add demand form
  const [demandText, setDemandText] = useState('');

  const tabs = [{ key: '', label: 'General' }, ...events.map(e => ({ key: e.eventName, label: e.eventName }))];

  const loadRefs = useCallback(async () => {
    try {
      const data = await getPortalReferences(registeredDateTimeAD);
      setRefs(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [registeredDateTimeAD]);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  const filteredLinks = refs.filter(r => r.event_name === activeEvent && r.entry_type === 'link');
  const filteredDemands = refs.filter(r => r.event_name === activeEvent && r.entry_type === 'demand');

  const handleAddLink = async () => {
    if (!linkUrl.trim()) { toast.error('Please enter a URL'); return; }
    try {
      const newRef = await addPortalReference({
        registered_date_time_ad: registeredDateTimeAD,
        event_name: activeEvent,
        entry_type: 'link',
        platform: linkPlatform,
        link_url: linkUrl.trim(),
        link_title: linkTitle.trim(),
        description: '',
      });
      setRefs(prev => [newRef, ...prev]);
      setLinkUrl(''); setLinkTitle(''); setShowAddLink(false);
      toast.success('Reference added!');
    } catch { toast.error('Failed to add'); }
  };

  const handleAddDemand = async () => {
    if (!demandText.trim()) { toast.error('Please write something'); return; }
    try {
      const newRef = await addPortalReference({
        registered_date_time_ad: registeredDateTimeAD,
        event_name: activeEvent,
        entry_type: 'demand',
        platform: '',
        link_url: '',
        link_title: '',
        description: demandText.trim(),
      });
      setRefs(prev => [newRef, ...prev]);
      setDemandText(''); setShowAddDemand(false);
      toast.success('Note added!');
    } catch { toast.error('Failed to add'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePortalReference(id);
      setRefs(prev => prev.filter(r => r.id !== id));
      toast.success('Removed');
    } catch { toast.error('Failed to remove'); }
  };

  const getPlatformInfo = (p: string) => platforms.find(pl => pl.id === p) || platforms[5];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-[hsl(350,80%,65%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(350,60%,95%)] via-transparent to-transparent" />
        <div className="relative text-center pt-8 pb-5 px-4">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[hsl(350,80%,65%)]" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-gray-400 font-medium">Your Vision</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My References & Ideas</h1>
          <p className="text-xs text-gray-400 mt-1">Share your inspiration so our crew can capture it perfectly</p>
        </div>
      </div>

      {/* Event Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveEvent(tab.key); setShowAddLink(false); setShowAddDemand(false); }}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                activeEvent === tab.key
                  ? "bg-[hsl(350,80%,65%)] text-white shadow-md shadow-[hsl(350,80%,65%/0.3)]"
                  : "bg-gray-100 text-gray-500 active:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 pl-1">
          {activeEvent === '' ? 'These apply to your entire wedding' : `Specific to "${activeEvent}"`}
        </p>
      </div>

      {/* References Section */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Reference Links</h2>
          <button
            onClick={() => { setShowAddLink(!showAddLink); setShowAddDemand(false); }}
            className="flex items-center gap-1 text-[11px] font-medium text-[hsl(350,80%,65%)] active:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Link
          </button>
        </div>

        {/* Add Link Form */}
        {showAddLink && (
          <div className="rounded-xl border border-[hsl(350,80%,65%/0.2)] bg-gradient-to-br from-[hsl(350,60%,97%)] to-white p-4 mb-3 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {platforms.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setLinkPlatform(p.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                      linkPlatform === p.id
                        ? "border-[hsl(350,80%,65%)] bg-[hsl(350,80%,65%/0.08)] text-[hsl(350,70%,50%)]"
                        : "border-gray-200 text-gray-400"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", linkPlatform === p.id ? p.color : '')} />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <input
              type="url"
              placeholder="Paste link here..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[hsl(350,80%,65%/0.4)]"
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={linkTitle}
              onChange={e => setLinkTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[hsl(350,80%,65%/0.4)]"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAddLink(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-400">Cancel</button>
              <button onClick={handleAddLink} className="flex-1 rounded-lg bg-[hsl(350,80%,65%)] text-white py-2 text-xs font-semibold active:opacity-80">Save</button>
            </div>
          </div>
        )}

        {/* Links List */}
        {filteredLinks.length === 0 && !showAddLink && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-6 text-center">
            <Link2 className="h-6 w-6 text-gray-200 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">No reference links yet</p>
          </div>
        )}
        <div className="space-y-2">
          {filteredLinks.map(link => {
            const pInfo = getPlatformInfo(link.platform);
            const Icon = pInfo.icon;
            return (
              <div key={link.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 group">
                <Icon className={cn("h-4 w-4 flex-shrink-0", pInfo.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{link.link_title || link.link_url}</p>
                  {link.link_title && <p className="text-[10px] text-gray-400 truncate">{link.link_url}</p>}
                </div>
                <a
                  href={link.link_url.startsWith('http') ? link.link_url : `https://${link.link_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-300 hover:text-[hsl(350,80%,65%)] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => handleDelete(link.id)} className="p-1.5 text-gray-200 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demands Section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">My Demands & Notes</h2>
          <button
            onClick={() => { setShowAddDemand(!showAddDemand); setShowAddLink(false); }}
            className="flex items-center gap-1 text-[11px] font-medium text-[hsl(350,80%,65%)] active:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Note
          </button>
        </div>

        {/* Add Demand Form */}
        {showAddDemand && (
          <div className="rounded-xl border border-[hsl(350,80%,65%/0.2)] bg-gradient-to-br from-[hsl(350,60%,97%)] to-white p-4 mb-3 space-y-3">
            <textarea
              placeholder="Describe your ideas, demands, or special requests..."
              value={demandText}
              onChange={e => setDemandText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[hsl(350,80%,65%/0.4)] resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAddDemand(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-400">Cancel</button>
              <button onClick={handleAddDemand} className="flex-1 rounded-lg bg-[hsl(350,80%,65%)] text-white py-2 text-xs font-semibold active:opacity-80">Save</button>
            </div>
          </div>
        )}

        {/* Demands List */}
        {filteredDemands.length === 0 && !showAddDemand && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-6 text-center">
            <MessageSquare className="h-6 w-6 text-gray-200 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">No demands or notes yet</p>
          </div>
        )}
        <div className="space-y-2">
          {filteredDemands.map(d => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3">
              <MessageSquare className="h-4 w-4 text-[hsl(350,80%,65%/0.5)] mt-0.5 flex-shrink-0" />
              <p className="flex-1 text-sm text-gray-700 whitespace-pre-wrap">{d.description}</p>
              <button onClick={() => handleDelete(d.id)} className="p-1.5 text-gray-200 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortalMyReferences;
