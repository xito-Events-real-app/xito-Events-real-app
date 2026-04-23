import { XitoGlobalVenue, VenueBooking } from "@/lib/xito-global-venues-api";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Phone, MapPin, Instagram, Facebook, Music2, Youtube, Globe, Mail } from "lucide-react";
import { VenueBookingsPopover } from "./VenueBookingsPopover";

interface VenueCardProps {
  venue: XitoGlobalVenue;
  bookings: VenueBooking[];
  onClick: () => void;
}

export function VenueCard({ venue, bookings, onClick }: VenueCardProps) {
  const ownerName = venue.owner1_name || venue.owner2_name || "";
  const ownerPhone = venue.owner1_contact || venue.owner1_whatsapp || venue.owner2_contact || "";

  const links: { href: string; icon: any; color: string }[] = [];
  if (venue.google_map) links.push({ href: venue.google_map, icon: MapPin, color: "text-red-500" });
  if (venue.instagram) links.push({ href: venue.instagram, icon: Instagram, color: "text-pink-500" });
  if (venue.facebook) links.push({ href: venue.facebook, icon: Facebook, color: "text-blue-600" });
  if (venue.tiktok) links.push({ href: venue.tiktok, icon: Music2, color: "text-foreground" });
  if (venue.youtube) links.push({ href: venue.youtube, icon: Youtube, color: "text-red-600" });
  if (venue.website) links.push({ href: venue.website, icon: Globe, color: "text-blue-500" });
  if (venue.gmail) links.push({ href: `mailto:${venue.gmail}`, icon: Mail, color: "text-amber-500" });

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{venue.venue_name}</h3>
          <div className="text-xs text-muted-foreground truncate">
            {[venue.city, venue.area].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 font-normal">
          {venue.venue_type || "Other"}
        </Badge>
      </div>

      {(ownerName || ownerPhone) && (
        <div className="text-sm mb-2">
          {ownerName && <div className="text-foreground">{ownerName}</div>}
          {ownerPhone && (
            <a
              href={`tel:${ownerPhone}`}
              onClick={e => e.stopPropagation()}
              className="text-xs text-primary inline-flex items-center gap-1"
            >
              <Phone className="h-3 w-3" />
              {ownerPhone}
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <StarRating value={venue.rating || 0} size="sm" />
        <VenueBookingsPopover count={bookings.length} bookings={bookings} />
      </div>

      {links.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t">
          {links.map((l, i) => {
            const Icon = l.icon;
            return (
              <a
                key={i}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className={`p-1.5 rounded hover:bg-muted ${l.color}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      )}
    </Card>
  );
}