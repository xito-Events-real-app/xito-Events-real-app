import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useXitoGlobalVenues, VenueSort } from "@/hooks/useXitoGlobalVenues";
import { VenueTypeSidebar } from "@/components/xito-global/VenueTypeSidebar";
import { VenueTable } from "@/components/xito-global/VenueTable";
import { VenueCard } from "@/components/xito-global/VenueCard";
import { AddEditVenueDrawer } from "@/components/xito-global/AddEditVenueDrawer";
import { XitoGlobalVenue } from "@/lib/xito-global-venues-api";

export default function XitoGlobalVenues() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState<VenueSort>("name-asc");
  const [view, setView] = useState<"table" | "grid">("table");
  const [editTarget, setEditTarget] = useState<XitoGlobalVenue | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { filtered, bookings, typeCounts, cities, totalBookings, loading, refreshing, refresh, venues } =
    useXitoGlobalVenues({ search, type, city, minRating, sort });

  const totalVenues = venues.length;

  const openAdd = () => {
    setEditTarget(null);
    setDrawerOpen(true);
  };
  const openEdit = (v: XitoGlobalVenue) => {
    setEditTarget(v);
    setDrawerOpen(true);
  };

  const sidebar = (
    <VenueTypeSidebar
      typeCounts={typeCounts}
      selectedType={type}
      onSelectType={setType}
      totalCount={totalVenues}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/xito-global")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 mr-auto">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">All Venues</h1>
              <p className="text-xs text-muted-foreground">
                {totalVenues} venues · {totalBookings} bookings tracked
              </p>
            </div>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Types</Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>

          <Button variant="outline" size="icon" onClick={refresh} disabled={refreshing} title="Refresh">
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Venue
          </Button>
        </div>

        {/* Filter bar */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, city, owner, contact..."
              className="pl-8"
            />
          </div>

          <Select
            value={city || "__all__"}
            onValueChange={v => setCity(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All cities</SelectItem>
              {cities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={minRating == null ? "__any__" : String(minRating)}
            onValueChange={v => setMinRating(v === "__any__" ? null : Number(v))}
          >
            <SelectTrigger className="w-36">
              <Star className="h-3.5 w-3.5 mr-1 text-amber-400" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Any rating</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
              <SelectItem value="4">4+ stars</SelectItem>
              <SelectItem value="3">3+ stars</SelectItem>
              <SelectItem value="2">2+ stars</SelectItem>
              <SelectItem value="1">1+ stars</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={v => setSort(v as VenueSort)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="most-booked">Most Booked</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden md:flex items-center rounded-md border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`px-2 py-1.5 ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`px-2 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filtered.length} of {totalVenues}
          </span>
        </div>
      </header>

      <div className="flex">
        {sidebar}

        <main className="flex-1 p-4 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading venues...
            </div>
          )}

          {!loading && view === "table" && (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <VenueTable venues={filtered} bookings={bookings} onEdit={openEdit} />
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {filtered.map(v => (
                  <VenueCard
                    key={v.id}
                    venue={v}
                    bookings={bookings[v.venue_name.toLowerCase()] || []}
                    onClick={() => openEdit(v)}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && view === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(v => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  bookings={bookings[v.venue_name.toLowerCase()] || []}
                  onClick={() => openEdit(v)}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && view === "grid" && (
            <div className="text-center py-20 text-muted-foreground">No venues match the current filters.</div>
          )}
        </main>
      </div>

      <AddEditVenueDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        venue={editTarget}
        onSaved={refresh}
        onDeleted={refresh}
      />
    </div>
  );
}