import { useMemo } from "react";
import { XitoGlobalVenue, VenueBookingsMap } from "@/lib/xito-global-venues-api";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Globe,
  Mail,
} from "lucide-react";
import { VenueBookingsPopover } from "./VenueBookingsPopover";

interface VenueTableProps {
  venues: XitoGlobalVenue[];
  bookings: VenueBookingsMap;
  onEdit: (v: XitoGlobalVenue) => void;
}

export function VenueTable({ venues, bookings, onEdit }: VenueTableProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Venue</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Location</th>
              <th className="px-4 py-3 text-left font-semibold">Owner</th>
              <th className="px-4 py-3 text-left font-semibold">Rating</th>
              <th className="px-4 py-3 text-left font-semibold">Bookings</th>
              <th className="px-4 py-3 text-left font-semibold">Links</th>
              <th className="px-4 py-3 text-right font-semibold w-16">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {venues.map(v => (
              <VenueRow
                key={v.id}
                venue={v}
                bookings={bookings[v.venue_name.toLowerCase()] || []}
                onEdit={() => onEdit(v)}
              />
            ))}
            {venues.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No venues match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VenueRow({
  venue,
  bookings,
  onEdit,
}: {
  venue: XitoGlobalVenue;
  bookings: ReturnType<typeof Array.prototype.slice> & any;
  onEdit: () => void;
}) {
  const ownerName = venue.owner1_name || venue.owner2_name || "";
  const ownerPhone = venue.owner1_contact || venue.owner1_whatsapp || venue.owner2_contact || "";
  const links = useMemo(() => {
    const arr: { href: string; icon: any; label: string; color: string }[] = [];
    if (venue.google_map) arr.push({ href: venue.google_map, icon: MapPin, label: "Map", color: "text-red-500" });
    if (venue.instagram) arr.push({ href: venue.instagram, icon: Instagram, label: "Instagram", color: "text-pink-500" });
    if (venue.facebook) arr.push({ href: venue.facebook, icon: Facebook, label: "Facebook", color: "text-blue-600" });
    if (venue.tiktok) arr.push({ href: venue.tiktok, icon: Music2, label: "TikTok", color: "text-foreground" });
    if (venue.youtube) arr.push({ href: venue.youtube, icon: Youtube, label: "YouTube", color: "text-red-600" });
    if (venue.website) arr.push({ href: venue.website, icon: Globe, label: "Website", color: "text-blue-500" });
    if (venue.gmail) arr.push({ href: `mailto:${venue.gmail}`, icon: Mail, label: "Email", color: "text-amber-500" });
    return arr;
  }, [venue]);

  return (
    <tr
      className="hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={onEdit}
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-foreground">{venue.venue_name}</div>
        {venue.location_briefing && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {venue.location_briefing}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="font-normal">{venue.venue_type || "Other"}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{venue.city || "—"}</div>
        <div className="text-xs text-muted-foreground">{venue.area || ""}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{ownerName || "—"}</div>
        {ownerPhone && (
          <a
            href={`tel:${ownerPhone}`}
            onClick={e => e.stopPropagation()}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            <Phone className="h-3 w-3" />
            {ownerPhone}
          </a>
        )}
      </td>
      <td className="px-4 py-3">
        <StarRating value={venue.rating || 0} size="sm" />
      </td>
      <td className="px-4 py-3">
        <VenueBookingsPopover count={bookings.length} bookings={bookings} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {links.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {links.map((l, i) => {
            const Icon = l.icon;
            return (
              <a
                key={i}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                title={l.label}
                className={`p-1 rounded hover:bg-muted transition-colors ${l.color}`}
                onClick={e => e.stopPropagation()}
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}