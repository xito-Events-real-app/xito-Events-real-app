import { useState, useEffect } from "react";
import { X, Phone, ExternalLink, MapPin, Instagram, Clock, StickyNote, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails, formatInstagramLink } from "@/lib/client-contact-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { AssignmentRow } from "./types";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: { key: keyof AssignmentRow; label: string; color: string }[] = [
  { key: "photographer_bride", label: "PB", color: "bg-rose-500/30 text-rose-300" },
  { key: "photographer_groom", label: "PG", color: "bg-sky-500/30 text-sky-300" },
  { key: "videographer_bride", label: "VB", color: "bg-rose-500/30 text-rose-300" },
  { key: "videographer_groom", label: "VG", color: "bg-sky-500/30 text-sky-300" },
  { key: "extra_photographer", label: "EP", color: "bg-amber-500/30 text-amber-300" },
  { key: "extra_videographer", label: "EV", color: "bg-amber-500/30 text-amber-300" },
  { key: "assistant", label: "Asst", color: "bg-emerald-500/30 text-emerald-300" },
  { key: "iphone_shooter", label: "iPhone", color: "bg-purple-500/30 text-purple-300" },
  { key: "drone_operator", label: "Drone", color: "bg-cyan-500/30 text-cyan-300" },
  { key: "fpv_operator", label: "FPV", color: "bg-cyan-500/30 text-cyan-300" },
];

interface VisibilitySettings {
  show_bride_details: boolean;
  show_groom_details: boolean;
  show_venue_details: boolean;
  show_parlour_details: boolean;
  show_bride_location: boolean;
  show_groom_location: boolean;
  personal_note: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentRow;
  eventDetail?: EventDetail;
  contactDetails?: ClientContactDetails | null;
  freelancerPhones?: Map<string, string>;
  freelancerName?: string;
  isLoading?: boolean;
}

function SectionHeader({ title, borderColor }: { title: string; borderColor: string }) {
  return (
    <div className={`border-l-2 ${borderColor} pl-2`}>
      <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{title}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-0.5 px-2">
      <span className="text-white/40 text-[10px]">{label}</span>
      <span className="text-white/80 text-[11px] text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function PhoneRow({ label, value, isWhatsApp }: { label: string; value?: string; isWhatsApp?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-0.5 px-2">
      <span className="text-white/40 text-[10px]">{label}</span>
      {isWhatsApp ? (
        <button onClick={() => openWhatsApp(value)} className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
          {value}
        </button>
      ) : (
        <a href={`tel:${value.replace(/[^\d+]/g, '')}`} className="text-sky-400 text-[11px] font-medium flex items-center gap-1">
          <Phone className="w-3 h-3" /> {value}
        </a>
      )}
    </div>
  );
}

function MapRow({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-end px-2 py-0.5">
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-[10px] flex items-center gap-0.5">
        <MapPin className="w-3 h-3" /> Open Map <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </div>
  );
}

function InstaRow({ handle }: { handle?: string }) {
  if (!handle) return null;
  return (
    <div className="flex justify-between items-center py-0.5 px-2">
      <span className="text-white/40 text-[10px]">Instagram</span>
      <a href={formatInstagramLink(handle)} target="_blank" rel="noopener noreferrer" className="text-pink-400 text-[11px] flex items-center gap-1">
        <Instagram className="w-3 h-3" /> @{handle.replace(/^@/, '')}
      </a>
    </div>
  );
}

function PersonSection({ title, borderColor, name, contact, whatsapp, backup, backupRelation, backup2, backupRelation2, instagram, city, area, landmark, mapLink }: {
  title: string; borderColor: string; name?: string; contact?: string; whatsapp?: string;
  backup?: string; backupRelation?: string; backup2?: string; backupRelation2?: string;
  instagram?: string; city?: string; area?: string; landmark?: string; mapLink?: string;
}) {
  if (!name && !contact && !whatsapp) return null;
  return (
    <div className="space-y-0.5">
      <SectionHeader title={title} borderColor={borderColor} />
      <InfoRow label="Full Name" value={name} />
      <PhoneRow label="Contact" value={contact} />
      <PhoneRow label="WhatsApp" value={whatsapp} isWhatsApp />
      {backup && <PhoneRow label={`Backup (${backupRelation || '—'})`} value={backup} />}
      {backup2 && <PhoneRow label={`Backup 2 (${backupRelation2 || '—'})`} value={backup2} />}
      <InstaRow handle={instagram} />
      <InfoRow label="Location" value={[city, area].filter(Boolean).join(", ")} />
      <InfoRow label="Landmark" value={landmark} />
      <MapRow value={mapLink} />
    </div>
  );
}

export default function CrewScheduleEventSheet({ open, onOpenChange, assignment, eventDetail, contactDetails, freelancerPhones, freelancerName, isLoading }: Props) {
  const day = assignment.event_day || "";
  const month = parseInt(assignment.event_month || "0");
  const year = assignment.event_year || "";
  const monthName = nepaliMonthsEnglish[month - 1] || "";

  const [visibility, setVisibility] = useState<VisibilitySettings | null>(null);

  // Fetch visibility settings for this freelancer + event
  useEffect(() => {
    if (!open || !freelancerName || !assignment.registered_date_time_ad) {
      setVisibility(null);
      return;
    }

    const fetchVisibility = async () => {
      const { data } = await supabase
        .from('freelancer_event_settings')
        .select('show_bride_details, show_groom_details, show_venue_details, show_parlour_details, show_bride_location, show_groom_location, personal_note')
        .eq('registered_date_time_ad', assignment.registered_date_time_ad)
        .eq('event_name', assignment.event || '')
        .eq('freelancer_name', freelancerName)
        .maybeSingle();

      if (data) {
        setVisibility(data as VisibilitySettings);
      } else {
        setVisibility({ show_bride_details: true, show_groom_details: true, show_venue_details: true, show_parlour_details: true, show_bride_location: true, show_groom_location: true, personal_note: '' });
      }
    };
    fetchVisibility();
  }, [open, freelancerName, assignment.registered_date_time_ad, assignment.event]);

  const showBride = visibility?.show_bride_details === true;
  const showBrideLocation = visibility?.show_bride_location === true;
  const showGroom = visibility?.show_groom_details === true;
  const showGroomLocation = visibility?.show_groom_location === true;
  const showVenue = visibility?.show_venue_details === true;
  const showParlour = visibility?.show_parlour_details === true;
  const personalNote = visibility?.personal_note?.trim() || '';

  const crewEntries = ROLE_LABELS
    .map(r => ({ ...r, name: (assignment[r.key] as string)?.trim() || "" }))
    .filter(r => r.name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95dvh] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border-t border-white/10 rounded-t-2xl p-0 flex flex-col will-change-transform">
        <SheetTitle className="sr-only">Event Details</SheetTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{assignment.event || "Event Details"}</h2>
            <p className="text-[10px] text-white/50">
              {day} {monthName} {year}
              {assignment.client_name && <span className="text-violet-300"> — {assignment.client_name}</span>}
            </p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-full bg-white/10 shrink-0 ml-2">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 px-4 pt-3 space-y-3">
          {isLoading && !eventDetail && !contactDetails ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="text-[11px] text-white/40">Loading event details...</p>
            </div>
          ) : (
          <>
          {/* Personal Note */}
          {personalNote && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Personal Note</span>
              </div>
              <p className="text-white/80 text-[11px] leading-relaxed whitespace-pre-wrap">{personalNote}</p>
            </div>
          )}

          {/* Crew */}
          {crewEntries.length > 0 && (
            <div className="space-y-1">
              <SectionHeader title="Crew" borderColor="border-cyan-400" />
              <div className="space-y-0.5 px-2">
                {crewEntries.map(({ label, color, name }) => {
                  const phone = freelancerPhones?.get(name.toLowerCase());
                  return (
                    <div key={label} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
                        <span className="text-white/80 text-[11px]">{name}</span>
                      </div>
                      {phone && (
                        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="p-1">
                          <Phone className="w-3.5 h-3.5 text-sky-400" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bride */}
          {showBride && (
            <PersonSection
              title="Bride" borderColor="border-rose-400"
              name={contactDetails?.brideFullName} contact={contactDetails?.brideContactNumber}
              whatsapp={contactDetails?.brideWhatsappNumber}
              backup={contactDetails?.brideBackupNumber} backupRelation={contactDetails?.brideBackupRelation}
              backup2={contactDetails?.brideBackupNumber2} backupRelation2={contactDetails?.brideBackupRelation2}
              instagram={contactDetails?.brideInstagram}
              city={showBrideLocation ? contactDetails?.brideHomeCity : undefined}
              area={showBrideLocation ? contactDetails?.brideHomeArea : undefined}
              landmark={showBrideLocation ? contactDetails?.brideHomeLandmark : undefined}
              mapLink={showBrideLocation ? contactDetails?.brideHomeMap : undefined}
            />
          )}

          {/* Bride Location Only (when phone is hidden but location is visible) */}
          {!showBride && showBrideLocation && (contactDetails?.brideHomeCity || contactDetails?.brideHomeArea) && (
            <PersonSection
              title="Bride Location" borderColor="border-rose-400"
              city={contactDetails?.brideHomeCity} area={contactDetails?.brideHomeArea}
              landmark={contactDetails?.brideHomeLandmark} mapLink={contactDetails?.brideHomeMap}
            />
          )}

          {/* Groom */}
          {showGroom && (
            <PersonSection
              title="Groom" borderColor="border-sky-400"
              name={contactDetails?.groomFullName} contact={contactDetails?.groomContactNumber}
              whatsapp={contactDetails?.groomWhatsappNumber}
              backup={contactDetails?.groomBackupNumber} backupRelation={contactDetails?.groomBackupRelation}
              backup2={contactDetails?.groomBackupNumber2} backupRelation2={contactDetails?.groomBackupRelation2}
              instagram={contactDetails?.groomInstagram}
              city={showGroomLocation ? contactDetails?.groomHomeCity : undefined}
              area={showGroomLocation ? contactDetails?.groomHomeArea : undefined}
              landmark={showGroomLocation ? contactDetails?.groomHomeLandmark : undefined}
              mapLink={showGroomLocation ? contactDetails?.groomHomeMap : undefined}
            />
          )}

          {/* Groom Location Only (when phone is hidden but location is visible) */}
          {!showGroom && showGroomLocation && (contactDetails?.groomHomeCity || contactDetails?.groomHomeArea) && (
            <PersonSection
              title="Groom Location" borderColor="border-sky-400"
              city={contactDetails?.groomHomeCity} area={contactDetails?.groomHomeArea}
              landmark={contactDetails?.groomHomeLandmark} mapLink={contactDetails?.groomHomeMap}
            />
          )}

          {/* Venue */}
          {showVenue && eventDetail && (eventDetail.venueName || eventDetail.venueType) && (
            <div className="space-y-0.5">
              <SectionHeader title="Venue" borderColor="border-amber-400" />
              <InfoRow label="Type" value={eventDetail.venueType} />
              <InfoRow label="Name" value={eventDetail.venueName} />
              <InfoRow label="Location" value={[eventDetail.venueCity, eventDetail.venueArea].filter(Boolean).join(", ")} />
              {(eventDetail.eventStartTime || eventDetail.eventEndTime) && (
                <div className="flex items-center gap-1 py-0.5 px-2">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span className="text-white/70 text-[11px]">{[eventDetail.eventStartTime, eventDetail.eventEndTime].filter(Boolean).join(" - ")}</span>
                </div>
              )}
              <MapRow value={eventDetail.venueMap} />
            </div>
          )}

          {/* Parlour */}
          {showParlour && eventDetail && (eventDetail.parlourName || eventDetail.parlourType) && (
            <div className="space-y-0.5">
              <SectionHeader title="Parlour" borderColor="border-purple-400" />
              <InfoRow label="Type" value={eventDetail.parlourType} />
              <InfoRow label="Name" value={eventDetail.parlourName} />
              <InfoRow label="Location" value={[eventDetail.parlourCity, eventDetail.parlourArea].filter(Boolean).join(", ")} />
              {(eventDetail.parlourStartTime || eventDetail.parlourEndTime) && (
                <div className="flex items-center gap-1 py-0.5 px-2">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span className="text-white/70 text-[11px]">{[eventDetail.parlourStartTime, eventDetail.parlourEndTime].filter(Boolean).join(" - ")}</span>
                </div>
              )}
              <MapRow value={eventDetail.parlourMap} />
            </div>
          )}

          {/* Demands */}
          {eventDetail?.eventDemands && eventDetail.eventDemands.length > 0 && (
            <div className="space-y-1">
              <SectionHeader title="Demands" borderColor="border-cyan-400" />
              <div className="flex flex-wrap gap-1 px-2">
                {eventDetail.eventDemands.map((d, i) => (
                  <span key={i} className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {eventDetail?.eventReferences && eventDetail.eventReferences.length > 0 && (
            <div className="space-y-1">
              <SectionHeader title="References" borderColor="border-pink-400" />
              <div className="flex flex-wrap gap-1 px-2">
                {eventDetail.eventReferences.map((r, i) => (
                  <span key={i} className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Guest Count */}
          {eventDetail?.guestCount && (
            <div className="px-2 py-1">
              <span className="text-white/40 text-[10px]">Guest Count: </span>
              <span className="text-white/80 text-[11px] font-medium">{eventDetail.guestCount}</span>
            </div>
          )}

          {!contactDetails && !eventDetail && (
            <p className="text-[10px] text-white/30 text-center py-4">No details available</p>
          )}
          </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
