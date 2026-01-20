import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, DollarSign, Phone, MessageCircle, AlertTriangle, Users, TrendingUp, Clock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getBookedClients, migrateExistingBookedClients, resyncAllBookedClients, BookedClientData } from "@/lib/sheets-api";
import BookedClientCard from "./BookedClientCard";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import NepaliDate from "nepali-date-converter";

const MobileBookedClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

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

  const handleResyncAll = async () => {
    try {
      setIsResyncing(true);
      const result = await resyncAllBookedClients();
      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} clients with latest data`);
      } else {
        toast.info("All clients are already up to date");
      }
      await fetchClients();
    } catch (error) {
      console.error("Error resyncing clients:", error);
      toast.error("Failed to resync clients");
    } finally {
      setIsResyncing(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate days until event
  const getDaysUntilEvent = (client: BookedClientData): number | null => {
    let eventDate: Date | null = null;
    
    if (client.eventDateAD) {
      const parsed = new Date(client.eventDateAD);
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed;
      }
    }
    
    if (!eventDate && client.eventYear && client.eventMonth && client.eventDay) {
      try {
        const bsYear = parseInt(client.eventYear);
        const bsMonth = parseInt(client.eventMonth);
        const bsDay = parseInt(client.eventDay);
        
        if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay) && !client.eventDay.includes('*')) {
          const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
          const adDate = nepaliDate.toJsDate();
          if (adDate && !isNaN(adDate.getTime())) {
            eventDate = adDate;
          }
        }
      } catch (error) {
        console.error('Error converting Nepali date:', error);
      }
    }
    
    if (!eventDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

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
    const daysA = getDaysUntilEvent(a);
    const daysB = getDaysUntilEvent(b);
    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1;
    if (daysB === null) return -1;
    return daysA - daysB;
  });

  // Get urgent events (within 7 days)
  const urgentClients = sortedClients.filter(client => {
    const days = getDaysUntilEvent(client);
    return days !== null && days >= 0 && days <= 7;
  });

  // Get upcoming events (8-30 days)
  const upcomingClients = sortedClients.filter(client => {
    const days = getDaysUntilEvent(client);
    return days !== null && days > 7 && days <= 30;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Global Mode Toggle */}
      <GlobalModeToggle showMute={false} />

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
            <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
              <Button
                variant={viewMode === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs px-2 h-7"
                onClick={() => setViewMode('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs px-2 h-7"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchClients}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <ScrollArea className="flex-1 px-4 pb-6">
          {isLoading ? (
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 bg-slate-800/50" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Users className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-400">Total Bookings</p>
                        <p className="text-xl font-bold text-blue-300">{clients.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-400">Total Value</p>
                        <p className="text-lg font-bold text-emerald-300">
                          ₹{(totalBookedValue / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-green-400">Received</p>
                        <p className="text-lg font-bold text-green-300">
                          ₹{(totalPaidValue / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Clock className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-400">Pending</p>
                        <p className="text-lg font-bold text-amber-300">
                          ₹{(remainingValue / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Urgent Events */}
              {urgentClients.length > 0 && (
                <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <Bell className="h-4 w-4 animate-pulse" />
                      Urgent Events ({urgentClients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {urgentClients.slice(0, 3).map((client) => {
                      const days = getDaysUntilEvent(client);
                      return (
                        <div 
                          key={client.bookedRowNumber}
                          className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                          onClick={() => setViewMode('list')}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{client.clientName}</p>
                            <p className="text-xs text-slate-400 truncate">{client.eventLocation}</p>
                          </div>
                          <Badge className="bg-red-500 animate-pulse text-xs ml-2">
                            {days === 0 ? 'TODAY!' : `${days}d`}
                          </Badge>
                        </div>
                      );
                    })}
                    {urgentClients.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-red-400"
                        onClick={() => setViewMode('list')}
                      >
                        View all {urgentClients.length} urgent events
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Events */}
              {upcomingClients.length > 0 && (
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming ({upcomingClients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {upcomingClients.slice(0, 3).map((client) => {
                      const days = getDaysUntilEvent(client);
                      return (
                        <div 
                          key={client.bookedRowNumber}
                          className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                          onClick={() => setViewMode('list')}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{client.clientName}</p>
                            <p className="text-xs text-slate-400 truncate">{client.eventLocation}</p>
                          </div>
                          <Badge className="bg-orange-500 text-xs ml-2">{days}d</Badge>
                        </div>
                      );
                    })}
                    {upcomingClients.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-orange-400"
                        onClick={() => setViewMode('list')}
                      >
                        View all {upcomingClients.length} upcoming
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sync Buttons */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-400 mb-2 text-center">
                      Sync payment data from Client Tracker
                    </p>
                    <Button
                      variant="default"
                      onClick={handleResyncAll}
                      disabled={isResyncing || isMigrating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isResyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Resyncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resync All Data
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="border-t border-slate-700/50 pt-3">
                    <p className="text-xs text-slate-500 mb-2 text-center">
                      Add new booked clients from tracker
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleMigrate}
                      disabled={isMigrating || isResyncing}
                      className="w-full"
                      size="sm"
                    >
                      {isMigrating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        "Migrate New Bookings"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* All Clients Preview */}
              {clients.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-300">All Bookings</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-blue-400"
                      onClick={() => setViewMode('list')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {sortedClients.slice(0, 3).map((client) => (
                      <BookedClientCard key={client.bookedRowNumber} client={client} onRefresh={fetchClients} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 px-4 pb-6">
          {/* Summary Stats Bar */}
          <div className="py-3 grid grid-cols-3 gap-2">
            <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
              <CardContent className="p-2 text-center">
                <p className="text-[10px] text-emerald-400">Total</p>
                <p className="text-xs font-bold text-emerald-300">
                  ₹{(totalBookedValue / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
              <CardContent className="p-2 text-center">
                <p className="text-[10px] text-blue-400">Received</p>
                <p className="text-xs font-bold text-blue-300">
                  ₹{(totalPaidValue / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
              <CardContent className="p-2 text-center">
                <p className="text-[10px] text-amber-400">Pending</p>
                <p className="text-xs font-bold text-amber-300">
                  ₹{(remainingValue / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client List */}
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
      )}
    </div>
  );
};

export default MobileBookedClients;
