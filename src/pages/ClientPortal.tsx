import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Monitor, Smartphone, Heart } from "lucide-react";
import PortalBottomNav, { PortalTab } from "@/components/client-portal/PortalBottomNav";
import PortalDashboard from "@/components/client-portal/PortalDashboard";
import PortalMyPhotos from "@/components/client-portal/PortalMyPhotos";
import PortalMyVideos from "@/components/client-portal/PortalMyVideos";
import PortalMyPayment from "@/components/client-portal/PortalMyPayment";

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

interface Assignment {
  event: string;
  eventYear: string;
  eventMonth: string;
  photographerBride: string;
  photographerGroom: string;
  extraPhotographer: string;
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Load all data
  useEffect(() => {
    if (!decodedId) return;
    setIsLoading(true);

    Promise.all([
      supabase.from('clients_cache').select('client_name, events, event_year, event_month, event_day, event_date_ad').eq('registered_date_time_ad', decodedId).maybeSingle(),
      supabase.from('event_details_cache').select('event_name, event_date_ad, venue_name, venue_city, venue_area, event_start_time, event_end_time').eq('registered_date_time_ad', decodedId).order('event_index'),
      supabase.from('freelancer_assignments').select('event, event_year, event_month, photographer_bride, photographer_groom, extra_photographer').eq('registered_date_time_ad', decodedId),
    ]).then(([clientRes, eventsRes, assignRes]) => {
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
        })));
      }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(220,25%,6%)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[hsl(220,25%,6%)] flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="h-10 w-10 text-rose-400/30 mx-auto mb-3" />
          <p className="text-white/60 font-medium">Portal not found</p>
          <p className="text-xs text-white/30 mt-1">This link may be invalid or expired</p>
        </div>
      </div>
    );
  }

  const portalContent = (
    <div className="min-h-screen bg-[hsl(220,25%,6%)] text-white">
      {/* Top header with view toggle */}
      <div className="sticky top-0 z-40 bg-[hsl(220,25%,6%)]/95 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400" />
          <span className="text-xs tracking-widest uppercase text-white/40 font-medium">WTN</span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
          <button
            onClick={() => setIsDesktop(false)}
            className={`p-1.5 rounded-full transition-colors ${!isDesktop ? 'bg-primary text-white' : 'text-white/40'}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsDesktop(true)}
            className={`p-1.5 rounded-full transition-colors ${isDesktop ? 'bg-primary text-white' : 'text-white/40'}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <PortalDashboard clientName={client.clientName} events={eventDetails} />
      )}
      {activeTab === 'photos' && (
        <PortalMyPhotos
          clientName={client.clientName}
          assignments={assignments}
          onShowBottomNav={handleShowBottomNav}
        />
      )}
      {activeTab === 'videos' && (
        <PortalMyVideos
          clientName={client.clientName}
          eventYear={majorityYear}
          eventMonth={majorityMonth}
        />
      )}
      {activeTab === 'payment' && <PortalMyPayment />}

      {/* Bottom Nav */}
      {showBottomNav && (
        <PortalBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );

  // Desktop wrapper
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,4%)] flex items-start justify-center pt-8 pb-8">
        <div className="w-[420px] min-h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
          {portalContent}
        </div>
      </div>
    );
  }

  return portalContent;
};

export default ClientPortal;
