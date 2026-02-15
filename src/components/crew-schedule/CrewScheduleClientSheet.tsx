import { X, Phone, ExternalLink, MapPin, Instagram } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails, formatInstagramLink } from "@/lib/client-contact-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactDetails?: ClientContactDetails | null;
  eventDetails?: EventDetail[];
  clientName?: string;
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

export default function CrewScheduleClientSheet({ open, onOpenChange, contactDetails, eventDetails, clientName }: Props) {
  const firstEvent = eventDetails?.[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border-t border-white/10 rounded-t-2xl p-0 overflow-hidden">
        <SheetTitle className="sr-only">Client Details</SheetTitle>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
          <h2 className="text-sm font-bold text-white truncate">{clientName || "Client Details"}</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-full bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="overflow-y-auto h-full pb-20 px-4 pt-3 space-y-3">
          <PersonSection
            title="Bride" borderColor="border-rose-400"
            name={contactDetails?.brideFullName} contact={contactDetails?.brideContactNumber}
            whatsapp={contactDetails?.brideWhatsappNumber}
            backup={contactDetails?.brideBackupNumber} backupRelation={contactDetails?.brideBackupRelation}
            backup2={contactDetails?.brideBackupNumber2} backupRelation2={contactDetails?.brideBackupRelation2}
            instagram={contactDetails?.brideInstagram}
            city={contactDetails?.brideHomeCity} area={contactDetails?.brideHomeArea}
            landmark={contactDetails?.brideHomeLandmark} mapLink={contactDetails?.brideHomeMap}
          />
          <PersonSection
            title="Groom" borderColor="border-sky-400"
            name={contactDetails?.groomFullName} contact={contactDetails?.groomContactNumber}
            whatsapp={contactDetails?.groomWhatsappNumber}
            backup={contactDetails?.groomBackupNumber} backupRelation={contactDetails?.groomBackupRelation}
            backup2={contactDetails?.groomBackupNumber2} backupRelation2={contactDetails?.groomBackupRelation2}
            instagram={contactDetails?.groomInstagram}
            city={contactDetails?.groomHomeCity} area={contactDetails?.groomHomeArea}
            landmark={contactDetails?.groomHomeLandmark} mapLink={contactDetails?.groomHomeMap}
          />

          {/* Event Demands */}
          {firstEvent?.eventDemands && firstEvent.eventDemands.length > 0 && (
            <div className="space-y-1">
              <SectionHeader title="Event Demands" borderColor="border-cyan-400" />
              <div className="flex flex-wrap gap-1 px-2">
                {firstEvent.eventDemands.map((d, i) => (
                  <span key={i} className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Event References */}
          {firstEvent?.eventReferences && firstEvent.eventReferences.length > 0 && (
            <div className="space-y-1">
              <SectionHeader title="References" borderColor="border-pink-400" />
              <div className="flex flex-wrap gap-1 px-2">
                {firstEvent.eventReferences.map((r, i) => (
                  <span key={i} className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Venue & Parlour for each event */}
          {eventDetails?.map((ev, i) => (
            <div key={i} className="space-y-1">
              {(ev.venueName || ev.venueType) && (
                <div className="space-y-0.5">
                  <SectionHeader title={`Venue — ${ev.eventName}`} borderColor="border-amber-400" />
                  <InfoRow label="Type" value={ev.venueType} />
                  <InfoRow label="Name" value={ev.venueName} />
                  <InfoRow label="Location" value={[ev.venueCity, ev.venueArea].filter(Boolean).join(", ")} />
                  <InfoRow label="Time" value={[ev.eventStartTime, ev.eventEndTime].filter(Boolean).join(" - ")} />
                  <MapRow value={ev.venueMap} />
                </div>
              )}
              {(ev.parlourName || ev.parlourType) && (
                <div className="space-y-0.5">
                  <SectionHeader title={`Parlour — ${ev.eventName}`} borderColor="border-purple-400" />
                  <InfoRow label="Type" value={ev.parlourType} />
                  <InfoRow label="Name" value={ev.parlourName} />
                  <InfoRow label="Location" value={[ev.parlourCity, ev.parlourArea].filter(Boolean).join(", ")} />
                  <InfoRow label="Time" value={[ev.parlourStartTime, ev.parlourEndTime].filter(Boolean).join(" - ")} />
                  <MapRow value={ev.parlourMap} />
                </div>
              )}
            </div>
          ))}

          {!contactDetails && (!eventDetails || eventDetails.length === 0) && (
            <p className="text-[10px] text-white/30 text-center py-4">No details available for this client</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
