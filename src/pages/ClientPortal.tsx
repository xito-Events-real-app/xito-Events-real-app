import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Monitor, Smartphone, Heart } from "lucide-react";
import PortalBottomNav, { PortalTab } from "@/components/client-portal/PortalBottomNav";
import PortalDashboard from "@/components/client-portal/PortalDashboard";
import PortalMyPhotos from "@/components/client-portal/PortalMyPhotos";
import PortalMyVideos from "@/components/client-portal/PortalMyVideos";
import PortalMyPayment from "@/components/client-portal/PortalMyPayment";
import PortalMyDetails from "@/components/client-portal/PortalMyDetails";
import PortalMyAlbum from "@/components/client-portal/PortalMyAlbum";
import { AlbumSelection, getAlbumSelections, getAlbumDefsFromDeliverables, AlbumDef } from "@/lib/album-selection-api";

interface ClientData {
  clientName: string;
  events: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
}

interface EventDetail {
  eventName: string;
  eventDateAD: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  eventStartTime: string;
  eventEndTime: string;
}

interface FullAssignment {
  event: string;
  eventYear: string;
  eventMonth: string;
  photographerBride: string;
  photographerGroom: string;
  extraPhotographer: string;
  videographerBride: string;
  videographerGroom: string;
  extraVideographer: string;
  assistant: string;
  iphoneShooter: string;
  droneOperator: string;
  fpvOperator: string;
}

interface ContactData {
  brideFullName: string;
  brideContactNumber: string;
  brideWhatsappNumber: string;
  brideBackupNumber: string;
  brideBackupRelation: string;
  brideInstagram: string;
  brideHomeCity: string;
  brideHomeArea: string;
  groomFullName: string;
  groomContactNumber: string;
  groomWhatsappNumber: string;
  groomBackupNumber: string;
  groomBackupRelation: string;
  groomInstagram: string;
  groomHomeCity: string;
  groomHomeArea: string;
}

const ClientPortal = () => {
  const { clientId } = useParams<{ clientName: string; clientId: string }>();
  const decodedId = clientId ? decodeURIComponent(clientId) : '';

  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetail[]>([]);
  const [assignments, setAssignments] = useState<FullAssignment[]>([]);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [hasFilledContact, setHasFilledContact] = useState(true);
  const [albumDefs, setAlbumDefs] = useState<AlbumDef[]>([]);
  const [albumSelections, setAlbumSelections] = useState<AlbumSelection[]>([]);

  useEffect(() => {
    if (!decodedId) return;
    setIsLoading(true);

    Promise.all([
      supabase.from('clients_cache').select('client_name, events, event_year, event_month, event_day, event_date_ad').eq('registered_date_time_ad', decodedId).maybeSingle(),
      supabase.from('event_details_cache').select('event_name, event_date_ad, venue_name, venue_city, venue_area, event_start_time, event_end_time').eq('registered_date_time_ad', decodedId).order('event_index'),
      supabase.from('freelancer_assignments').select('event, event_year, event_month, photographer_bride, photographer_groom, extra_photographer, videographer_bride, videographer_groom, extra_videographer, assistant, iphone_shooter, drone_operator, fpv_operator').eq('registered_date_time_ad', decodedId),
      supabase.from('contact_details_cache').select('bride_full_name, bride_contact_number, bride_whatsapp_number, bride_backup_number, bride_backup_relation, bride_instagram, bride_home_city, bride_home_area, groom_full_name, groom_contact_number, groom_whatsapp_number, groom_backup_number, groom_backup_relation, groom_instagram, groom_home_city, groom_home_area').eq('registered_date_time_ad', decodedId).maybeSingle(),
      getAlbumDefsFromDeliverables(decodedId),
      getAlbumSelections(decodedId),
    ]).then(([clientRes, eventsRes, assignRes, contactRes, albumDefsResult, albumSelectionsResult]) => {
      if (clientRes.data) {
        setClient({
          clientName: clientRes.data.client_name || '',
          events: clientRes.data.events || '',
          eventYear: clientRes.data.event_year || '',
          eventMonth: clientRes.data.event_month || '',
          eventDay: clientRes.data.event_day || '',
          eventDateAD: clientRes.data.event_date_ad || '',
        });
      }
      if (eventsRes.data) {
        setEventDetails(eventsRes.data.map(e => ({
          eventName: e.event_name || '',
          eventDateAD: e.event_date_ad || '',
          venueName: e.venue_name || '',
          venueCity: e.venue_city || '',
          venueArea: e.venue_area || '',
          eventStartTime: e.event_start_time || '',
          eventEndTime: e.event_end_time || '',
        })));
      }
      if (assignRes.data) {
        setAssignments(assignRes.data.map(a => ({
          event: a.event,
          eventYear: a.event_year || '',
          eventMonth: a.event_month || '',
          photographerBride: a.photographer_bride || '',
          photographerGroom: a.photographer_groom || '',
          extraPhotographer: a.extra_photographer || '',
          videographerBride: a.videographer_bride || '',
          videographerGroom: a.videographer_groom || '',
          extraVideographer: a.extra_videographer || '',
          assistant: a.assistant || '',
          iphoneShooter: a.iphone_shooter || '',
          droneOperator: a.drone_operator || '',
          fpvOperator: a.fpv_operator || '',
        })));
      }
      if (contactRes.data) {
        const c = contactRes.data;
        const cd: ContactData = {
          brideFullName: c.bride_full_name || '',
          brideContactNumber: c.bride_contact_number || '',
          brideWhatsappNumber: c.bride_whatsapp_number || '',
          brideBackupNumber: c.bride_backup_number || '',
          brideBackupRelation: c.bride_backup_relation || '',
          brideInstagram: c.bride_instagram || '',
          brideHomeCity: c.bride_home_city || '',
          brideHomeArea: c.bride_home_area || '',
          groomFullName: c.groom_full_name || '',
          groomContactNumber: c.groom_contact_number || '',
          groomWhatsappNumber: c.groom_whatsapp_number || '',
          groomBackupNumber: c.groom_backup_number || '',
          groomBackupRelation: c.groom_backup_relation || '',
          groomInstagram: c.groom_instagram || '',
          groomHomeCity: c.groom_home_city || '',
          groomHomeArea: c.groom_home_area || '',
        };
        setContactData(cd);
        const filled = !!(cd.brideFullName && cd.brideContactNumber && cd.brideWhatsappNumber && cd.groomFullName && cd.groomContactNumber && cd.groomWhatsappNumber);
        setHasFilledContact(filled);
      } else {
        setHasFilledContact(false);
      }
      setAlbumDefs(albumDefsResult);
      setAlbumSelections(albumSelectionsResult);
    }).finally(() => setIsLoading(false));
  }, [decodedId]);

  const majorityMonth = useMemo(() => {
    const months = (client?.eventMonth || '').split('\n').filter(Boolean);
    return months[0] || '';
  }, [client]);

  const majorityYear = useMemo(() => {
    const years = (client?.eventYear || '').split('\n').filter(Boolean);
    return years[0] || '';
  }, [client]);

  const handleShowBottomNav = useCallback((show: boolean) => {
    setShowBottomNav(show);
  }, []);

  const handleContactSaved = useCallback(() => {
    setHasFilledContact(true);
  }, []);

  const totalAlbumCount = albumSelections.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(350,80%,65%)] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="h-10 w-10 text-[hsl(350,80%,65%/0.3)] mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Portal not found</p>
          <p className="text-xs text-gray-400 mt-1">This link may be invalid or expired</p>
        </div>
      </div>
    );
  }

  const photoAssignments = assignments.map(a => ({
    event: a.event,
    eventYear: a.eventYear,
    eventMonth: a.eventMonth,
    photographerBride: a.photographerBride,
    photographerGroom: a.photographerGroom,
    extraPhotographer: a.extraPhotographer,
  }));

  const portalContent = (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-[hsl(350,80%,65%)]" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-gray-400 font-medium">WTN</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setIsDesktop(false)}
            className={`p-1.5 rounded-full transition-colors ${!isDesktop ? 'bg-[hsl(350,80%,65%)] text-white' : 'text-gray-400'}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsDesktop(true)}
            className={`p-1.5 rounded-full transition-colors ${isDesktop ? 'bg-[hsl(350,80%,65%)] text-white' : 'text-gray-400'}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <PortalDashboard
          clientName={client.clientName}
          brideFullName={contactData?.brideFullName}
          groomFullName={contactData?.groomFullName}
          events={eventDetails}
          assignments={assignments}
          hasFilledContact={hasFilledContact}
          onGoToDetails={() => setActiveTab('details')}
        />
      )}
      {activeTab === 'photos' && (
        <PortalMyPhotos
          clientName={client.clientName}
          assignments={photoAssignments}
          onShowBottomNav={handleShowBottomNav}
          registeredDateTimeAD={decodedId}
          albums={albumDefs}
          albumSelections={albumSelections}
          onAlbumSelectionsChange={setAlbumSelections}
        />
      )}
      {activeTab === 'album' && (
        <PortalMyAlbum
          registeredDateTimeAD={decodedId}
          albums={albumDefs}
          selections={albumSelections}
          onSelectionsChange={setAlbumSelections}
        />
      )}
      {activeTab === 'videos' && (
        <PortalMyVideos
          clientName={client.clientName}
          eventYear={majorityYear}
          eventMonth={majorityMonth}
          brideFullName={contactData?.brideFullName}
          groomFullName={contactData?.groomFullName}
        />
      )}
      {activeTab === 'payment' && <PortalMyPayment />}
      {activeTab === 'details' && (
        <PortalMyDetails
          registeredDateTimeAD={decodedId}
          initialData={contactData}
          onSaved={handleContactSaved}
        />
      )}

      {/* Bottom Nav */}
      {showBottomNav && (
        <PortalBottomNav activeTab={activeTab} onTabChange={setActiveTab} albumCount={totalAlbumCount} />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-8 pb-8">
        <div className="w-[420px] min-h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-gray-200 shadow-2xl relative">
          {portalContent}
        </div>
      </div>
    );
  }

  return portalContent;
};

export default ClientPortal;
