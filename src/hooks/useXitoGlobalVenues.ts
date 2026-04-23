import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllVenues,
  getVenueBookingsWithClients,
  XitoGlobalVenue,
  VenueBookingsMap,
} from "@/lib/xito-global-venues-api";

export type VenueSort = "name-asc" | "most-booked" | "recent" | "highest-rated";

export interface UseXitoGlobalVenuesOptions {
  search?: string;
  type?: string | null;
  city?: string | null;
  minRating?: number | null;
  sort?: VenueSort;
}

export function useXitoGlobalVenues(options: UseXitoGlobalVenuesOptions = {}) {
  const { search = "", type = null, city = null, minRating = null, sort = "name-asc" } = options;

  const [venues, setVenues] = useState<XitoGlobalVenue[]>([]);
  const [bookings, setBookings] = useState<VenueBookingsMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [v, b] = await Promise.all([getAllVenues(), getVenueBookingsWithClients()]);
      setVenues(v);
      setBookings(b);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const bookingCount = useCallback(
    (v: XitoGlobalVenue) => (bookings[v.venue_name.toLowerCase()] || []).length,
    [bookings]
  );

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    venues.forEach(v => {
      const t = v.venue_type || "Other";
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }, [venues]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    venues.forEach(v => {
      if (v.city) set.add(v.city);
    });
    return Array.from(set).sort();
  }, [venues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = venues.filter(v => {
      if (type && (v.venue_type || "Other") !== type) return false;
      if (city && v.city !== city) return false;
      if (minRating != null && (v.rating || 0) < minRating) return false;
      if (q) {
        const hay = [
          v.venue_name,
          v.city,
          v.area,
          v.owner1_name,
          v.owner2_name,
          v.owner1_contact,
          v.owner2_contact,
          v.owner1_whatsapp,
          v.owner2_whatsapp,
          v.company_contact,
          v.company_whatsapp,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list];
    switch (sort) {
      case "most-booked":
        list.sort((a, b) => bookingCount(b) - bookingCount(a));
        break;
      case "recent":
        list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        break;
      case "highest-rated":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "name-asc":
      default:
        list.sort((a, b) => a.venue_name.localeCompare(b.venue_name));
    }
    return list;
  }, [venues, search, type, city, minRating, sort, bookingCount]);

  const totalBookings = useMemo(
    () => Object.values(bookings).reduce((acc, arr) => acc + arr.length, 0),
    [bookings]
  );

  return {
    venues,
    filtered,
    bookings,
    bookingCount,
    typeCounts,
    cities,
    totalBookings,
    loading,
    refreshing,
    refresh,
    setVenues,
  };
}