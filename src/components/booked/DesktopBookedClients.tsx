import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, DollarSign, Users, TrendingUp, Phone, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getBookedClients, migrateExistingBookedClients, BookedClientData } from "@/lib/sheets-api";
import BookedClientCard from "./BookedClientCard";
import { getMonthName } from "@/lib/nepali-months";

const DesktopBookedClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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

  // Calculate days until event
  const getDaysUntilEvent = (eventDateAD: string | undefined): number | null => {
    if (!eventDateAD) return null;
    const eventDate = new Date(eventDateAD);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getCountdownBadge = (days: number | null) => {
    if (days === null) return null;
    if (days <= 7) return <Badge className="bg-red-500 animate-pulse">⏰ {days}d</Badge>;
    if (days <= 30) return <Badge className="bg-orange-500">📅 {days}d</Badge>;
    if (days <= 60) return <Badge className="bg-amber-500">{days}d</Badge>;
    return <Badge variant="outline" className="text-green-400 border-green-400">{days}d</Badge>;
  };

  // Format event date in Nepali format (e.g., "2082 MAGH 12")
  const formatNepaliEventDate = (eventYear: string, eventMonth: string, eventDay: string): string => {
    if (!eventYear || !eventMonth || !eventDay) return 'TBD';
    const monthName = getMonthName(eventMonth);
    return `${eventYear} ${monthName} ${eventDay}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Booked Clients</h1>
              <p className="text-sm text-slate-400">{clients.length} confirmed bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleMigrate}
              disabled={isMigrating}
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Bookings"
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-blue-400">Total Clients</p>
                  <p className="text-xl font-bold text-blue-300">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-emerald-400">Total Booked Value</p>
                  <p className="text-xl font-bold text-emerald-300">
                    NPR {totalBookedValue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-green-400">Received</p>
                  <p className="text-xl font-bold text-green-300">
                    NPR {totalPaidValue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-amber-400">Pending</p>
                  <p className="text-xl font-bold text-amber-300">
                    NPR {remainingValue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 bg-slate-800/50" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4 text-lg">No booked clients yet</p>
              <p className="text-slate-500 mb-6 text-sm">
                When you mark clients as "BOOKED" in Client Tracker, they will appear here.
              </p>
              <Button variant="outline" onClick={handleMigrate} disabled={isMigrating}>
                {isMigrating ? "Syncing..." : "Sync Existing Bookings"}
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-3 gap-4">
            {sortedClients.map((client) => (
              <BookedClientCard key={client.bookedRowNumber} client={client} onRefresh={fetchClients} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Event Date</TableHead>
                  <TableHead className="text-slate-400">Countdown</TableHead>
                  <TableHead className="text-slate-400">Events</TableHead>
                  <TableHead className="text-slate-400">Final Quote</TableHead>
                  <TableHead className="text-slate-400">Paid</TableHead>
                  <TableHead className="text-slate-400">Remaining</TableHead>
                  <TableHead className="text-slate-400">Handler</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => {
                  const days = getDaysUntilEvent(client.eventDateAD);
                  const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
                  const quotationAmount = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;
                  
                  let paidAmount = 0;
                  if (client.paymentsMade) {
                    const payments = client.paymentsMade.split('\n');
                    paidAmount = payments.reduce((sum, entry) => {
                      const match = entry.match(/NPR\s*([\d,]+)/);
                      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
                    }, 0);
                  }
                  
                  return (
                    <TableRow key={client.bookedRowNumber} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{client.clientName}</p>
                          <p className="text-xs text-slate-400">{client.eventLocation}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {formatNepaliEventDate(client.eventYear, client.eventMonth, client.eventDay)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCountdownBadge(days)}
                          {days !== null && (
                            <span className="text-xs text-slate-500">
                              ({days > 0 ? `${days} days left` : days === 0 ? 'Today!' : `${Math.abs(days)} days ago`})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        <div className="flex flex-col gap-0.5">
                          {client.events?.split('\n').filter(Boolean).map((event, idx) => (
                            <span key={idx} className="whitespace-nowrap">{event}</span>
                          )) || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-emerald-400 font-medium whitespace-nowrap">
                        NPR {quotationAmount.toLocaleString('en-IN')}/-
                      </TableCell>
                      <TableCell className="text-green-400 whitespace-nowrap">
                        NPR {paidAmount.toLocaleString('en-IN')}/-
                      </TableCell>
                      <TableCell className="text-amber-400 whitespace-nowrap">
                        NPR {(quotationAmount - paidAmount).toLocaleString('en-IN')}/-
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {client.clientHandler || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`tel:${client.contactNo}`, '_self')}
                          >
                            <Phone className="h-4 w-4 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`https://wa.me/${client.whatsappNo?.replace(/\D/g, '')}`, '_blank')}
                          >
                            <MessageCircle className="h-4 w-4 text-green-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DesktopBookedClients;
