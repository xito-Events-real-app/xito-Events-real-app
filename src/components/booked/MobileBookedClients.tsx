import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, DollarSign, Phone, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getBookedClients, migrateExistingBookedClients, BookedClientData } from "@/lib/sheets-api";
import BookedClientCard from "./BookedClientCard";

const MobileBookedClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await getBookedClients();
      setClients(data);
    } catch (error) {
      console.error("Error fetching booked clients:", error);
      toast.error("Failed to load booked clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      const result = await migrateExistingBookedClients();
      toast.success(`Migrated ${result.migratedCount} clients`);
      await fetchClients();
    } catch (error) {
      console.error("Error migrating clients:", error);
      toast.error("Failed to migrate clients");
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate summary stats
  const totalBookedValue = clients.reduce((sum, client) => {
    const match = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
  }, 0);

  const totalPaidValue = clients.reduce((sum, client) => {
    if (!client.paymentsMade) return sum;
    const payments = client.paymentsMade.split('\n');
    return sum + payments.reduce((pSum, entry) => {
      const match = entry.match(/NPR\s*([\d,]+)/);
      return pSum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);
  }, 0);

  const remainingValue = totalBookedValue - totalPaidValue;

  // Sort by event date (closest first)
  const sortedClients = [...clients].sort((a, b) => {
    if (!a.eventDateAD && !b.eventDateAD) return 0;
    if (!a.eventDateAD) return 1;
    if (!b.eventDateAD) return -1;
    return new Date(a.eventDateAD).getTime() - new Date(b.eventDateAD).getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Booked Clients</h1>
              <p className="text-xs text-slate-400">{clients.length} confirmed bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMigrate}
              disabled={isMigrating}
              className="text-xs"
            >
              {isMigrating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchClients}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-400">Total Booked</p>
            <p className="text-sm font-bold text-emerald-300">
              ₹{(totalBookedValue / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-400">Received</p>
            <p className="text-sm font-bold text-blue-300">
              ₹{(totalPaidValue / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-amber-400">Pending</p>
            <p className="text-sm font-bold text-amber-300">
              ₹{(remainingValue / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <ScrollArea className="flex-1 px-4 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 bg-slate-800/50" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No booked clients yet</p>
              <Button variant="outline" size="sm" onClick={handleMigrate} disabled={isMigrating}>
                {isMigrating ? "Syncing..." : "Sync Existing Bookings"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedClients.map((client) => (
              <BookedClientCard key={client.bookedRowNumber} client={client} onRefresh={fetchClients} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MobileBookedClients;
