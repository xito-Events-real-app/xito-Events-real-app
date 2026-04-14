import { useState, useEffect } from "react";
import { ExternalLink, Copy, Send, Check, MessageCircle, Smartphone, Monitor, Loader2, Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClientPortalUrl, generatePortalWhatsAppMessage } from "@/lib/client-contact-api";
import { supabase } from "@/integrations/supabase/client";
import { getE2FileUrls } from "@/lib/idrive-e2-api";
import { toast } from "@/hooks/use-toast";
import XitoImageViewer from "@/components/client-detail/XitoImageViewer";

interface ClientLinkSectionProps {
  registeredDateTimeAD: string;
  clientName: string;
  contactNo: string;
  whatsappNo: string;
  brideFullName?: string;
  brideWhatsapp?: string;
  groomFullName?: string;
  groomWhatsapp?: string;
}

interface GroupedAlbum {
  albumType: string;
  albumName: string;
  photos: { key: string; url: string }[];
}

const ClientLinkSection = ({
  registeredDateTimeAD,
  clientName,
  contactNo,
  whatsappNo,
}: ClientLinkSectionProps) => {
  const [copied, setCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'phone' | 'desktop'>('phone');
  const [contactData, setContactData] = useState<{
    brideFullName: string; brideWhatsapp: string;
    groomFullName: string; groomWhatsapp: string;
  } | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Album selections state
  const [albumGroups, setAlbumGroups] = useState<GroupedAlbum[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ key: string; url: string }[]>([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const portalUrl = getClientPortalUrl(registeredDateTimeAD, clientName);
  const message = generatePortalWhatsAppMessage(registeredDateTimeAD, clientName);

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  // Load album selections
  useEffect(() => {
    let stale = false;
    (async () => {
      setLoadingAlbums(true);
      try {
        const { data } = await supabase
          .from('client_album_selections')
          .select('album_type, album_name, photo_key')
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .order('album_type')
          .order('selected_at', { ascending: true });

        if (stale || !data || data.length === 0) {
          if (!stale) setAlbumGroups([]);
          return;
        }

        // Group by album_type
        const groupMap: Record<string, { albumName: string; keys: string[] }> = {};
        for (const row of data) {
          if (!groupMap[row.album_type]) {
            groupMap[row.album_type] = { albumName: row.album_name || row.album_type, keys: [] };
          }
          groupMap[row.album_type].keys.push(row.photo_key);
        }

        // Batch fetch signed URLs
        const allKeys = data.map(d => d.photo_key);
        const urlMap = await getE2FileUrls(allKeys);

        if (stale) return;

        const groups: GroupedAlbum[] = Object.entries(groupMap).map(([type, info]) => ({
          albumType: type,
          albumName: info.albumName,
          photos: info.keys.map(k => ({ key: k, url: urlMap[k] || '' })).filter(p => p.url),
        }));

        setAlbumGroups(groups);
      } catch (err) {
        console.error('Error loading album selections:', err);
      } finally {
        if (!stale) setLoadingAlbums(false);
      }
    })();
    return () => { stale = true; };
  }, [registeredDateTimeAD]);

  // Fetch contact details when send dialog opens
  useEffect(() => {
    if (!showSendDialog || contactData) return;
    setLoadingContacts(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('contact_details_cache')
          .select('bride_full_name, bride_whatsapp_number, groom_full_name, groom_whatsapp_number')
          .eq('registered_date_time_ad', registeredDateTimeAD)
          .single();
        setContactData({
          brideFullName: data?.bride_full_name || '',
          brideWhatsapp: data?.bride_whatsapp_number || '',
          groomFullName: data?.groom_full_name || '',
          groomWhatsapp: data?.groom_whatsapp_number || '',
        });
      } finally {
        setLoadingContacts(false);
      }
    })();
  }, [showSendDialog, registeredDateTimeAD, contactData]);

  const recipients = [
    { label: `${clientName} (Contact)`, phone: contactNo },
    { label: `${clientName} (WhatsApp)`, phone: whatsappNo },
    { label: `${contactData?.brideFullName || 'Bride'} (WhatsApp)`, phone: contactData?.brideWhatsapp || '' },
    { label: `${contactData?.groomFullName || 'Groom'} (WhatsApp)`, phone: contactData?.groomWhatsapp || '' },
  ].filter(r => r.phone);

  const sendToWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setShowSendDialog(false);
  };

  const openViewer = (group: GroupedAlbum, photoIndex: number) => {
    setViewerImages(group.photos.map(p => ({
      key: p.key,
      url: p.url,
    })));
    setViewerStartIndex(photoIndex);
    setViewerOpen(true);
  };

  const totalSelections = albumGroups.reduce((sum, g) => sum + g.photos.length, 0);

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <ExternalLink className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Client Portal</h3>
              <p className="text-xs text-white/40">Live preview — exactly what client sees</p>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
              <button
                onClick={() => setViewMode('phone')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'phone' ? 'bg-primary text-white' : 'text-white/40'}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'desktop' ? 'bg-primary text-white' : 'text-white/40'}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              onClick={() => setShowSendDialog(true)}
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Photos Gallery */}
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Selected Photos</h3>
            {totalSelections > 0 && (
              <span className="text-xs text-white/40 ml-auto">{totalSelections} total</span>
            )}
          </div>

          {loadingAlbums ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              <span className="ml-2 text-sm text-white/40">Loading selections...</span>
            </div>
          ) : albumGroups.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">No photos selected yet</p>
          ) : (
            <div className="space-y-4">
              {albumGroups.map((group) => (
                <div key={group.albumType}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                      {group.albumName}
                    </h4>
                    <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                      {group.photos.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {group.photos.map((photo, idx) => (
                      <button
                        key={photo.key}
                        onClick={() => openViewer(group, idx)}
                        className="aspect-square rounded-md overflow-hidden bg-white/5 hover:ring-2 hover:ring-primary/50 transition-all"
                      >
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      <div className="flex justify-center">
        <div
          className={`relative transition-all duration-300 ${
            viewMode === 'phone'
              ? 'w-[375px] h-[700px] rounded-[2.5rem] border-[6px] border-white/20 shadow-2xl'
              : 'w-full h-[700px] rounded-xl border border-white/10 shadow-xl'
          }`}
          style={viewMode === 'phone' ? {
            background: 'linear-gradient(145deg, hsl(220,25%,15%), hsl(220,25%,8%))',
          } : undefined}
        >
          {viewMode === 'phone' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-black rounded-b-2xl z-10" />
          )}
          <iframe
            src={portalUrl}
            className={`w-full h-full bg-[hsl(220,25%,6%)] ${
              viewMode === 'phone' ? 'rounded-[2rem]' : 'rounded-xl'
            }`}
            title="Client Portal Preview"
          />
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-sm bg-[hsl(220,25%,12%)] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              Send Link To
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                <span className="ml-2 text-sm text-white/40">Loading contacts...</span>
              </div>
            ) : recipients.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No contact numbers available</p>
            ) : (
              recipients.map((r, i) => (
                <button
                  key={i}
                  onClick={() => sendToWhatsApp(r.phone)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.label}</p>
                    <p className="text-xs text-white/40">{r.phone}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Xito Image Viewer */}
      {viewerOpen && (
        <XitoImageViewer
          images={viewerImages}
          startIndex={viewerStartIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default ClientLinkSection;
