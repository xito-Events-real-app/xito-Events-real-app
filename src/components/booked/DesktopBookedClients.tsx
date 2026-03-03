import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, Users, Bell, AlertTriangle, Phone, MessageCircle, LayoutGrid, Table as TableIcon } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { BookedClientData } from "@/lib/sheets-api";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import EventClientCard from "./EventClientCard";
import NepaliDateFilter from "./NepaliDateFilter";
import { getMonthName, parseEventDetails } from "@/lib/nepali-months";
import { getClientDetailPath } from "@/lib/client-navigation";
import NepaliDate from "nepali-date-converter";

const DesktopBookedClients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, isLoading, refreshData, isSyncing } = useBookedCachedData();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const getDaysUntilEvent = (client: BookedClientData): number | null => {
    let eventDate: Date | null = null;
    if (client.eventDateAD) {
      const parsed = new Date(client.eventDateAD);
      if (!isNaN(parsed.getTime())) eventDate = parsed;
    }
    if (!eventDate && client.eventYear && client.eventMonth && client.eventDay) {
      try {
        const bsYear = parseInt(client.eventYear);
        const bsMonth = parseInt(client.eventMonth);
        const bsDay = parseInt(client.eventDay);
        if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay) && !client.eventDay.includes('*')) {
          const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
          const adDate = nepaliDate.toJsDate();
          if (adDate && !isNaN(adDate.getTime())) eventDate = adDate;
        }
      } catch (error) {}
    }
    if (!eventDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0); eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const hasMissingDate = (client: BookedClientData) => !client.eventYear || !client.eventMonth || !client.eventDay || client.eventDay.includes('*');

  const filteredClients = clients.filter(client => {
    if (filterYear && client.eventYear !== filterYear.toString()) return false;
    if (filterMonth && client.eventMonth !== filterMonth.toString()) return false;
    return true;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    const daysA = getDaysUntilEvent(a); const daysB = getDaysUntilEvent(b);
    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1; if (daysB === null) return -1;
    return daysA - daysB;
  });

  const urgentClients = sortedClients.filter(c => { const d = getDaysUntilEvent(c); return d !== null && d >= 0 && d <= 7; });
  const upcomingClients = sortedClients.filter(c => { const d = getDaysUntilEvent(c); return d !== null && d > 7 && d <= 30; });
  const missingDateClients = clients.filter(hasMissingDate);

  const resetFilters = () => { setFilterYear(null); setFilterMonth(null); };

  const getCountdownBadge = (days: number | null, hasMissing: boolean) => {
    if (hasMissing) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50"><AlertTriangle className="h-3 w-3 mr-1" />Date!</Badge>;
    if (days === null) return <Badge variant="outline" className="text-slate-500">TBD</Badge>;
    if (days <= 7) return <Badge className="bg-red-500 animate-pulse">{days}d</Badge>;
    if (days <= 30) return <Badge className="bg-orange-500">{days}d</Badge>;
    if (days <= 60) return <Badge className="bg-amber-500">{days}d</Badge>;
    return <Badge variant="outline" className="text-green-400 border-green-400">{days}d</Badge>;
  };

  const formatNepaliEventDate = (year: string, month: string, day: string): string => {
    if (!year || !month || !day) return 'TBD';
    return `${year} ${getMonthName(month)} ${day.includes('*') ? '**' : day}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Booked Events</h1>
              <p className="text-sm text-slate-400">{clients.length} confirmed bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}><LayoutGrid className="h-4 w-4 mr-1" />Cards</Button>
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4 mr-1" />Table</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={refreshData} disabled={isLoading || isSyncing}><RefreshCw className={`h-4 w-4 text-slate-400 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30"><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-blue-400" /><div><p className="text-xs text-blue-400">Total</p><p className="text-xl font-bold text-blue-300">{clients.length}</p></div></CardContent></Card>
          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30"><CardContent className="p-4 flex items-center gap-3"><Bell className="h-5 w-5 text-red-400 animate-pulse" /><div><p className="text-xs text-red-400">Urgent (≤7d)</p><p className="text-xl font-bold text-red-300">{urgentClients.length}</p></div></CardContent></Card>
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-orange-400" /><div><p className="text-xs text-orange-400">Upcoming (8-30d)</p><p className="text-xl font-bold text-orange-300">{upcomingClients.length}</p></div></CardContent></Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-400" /><div><p className="text-xs text-amber-400">Missing Dates</p><p className="text-xl font-bold text-amber-300">{missingDateClients.length}</p></div></CardContent></Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50 mb-6"><CardContent className="p-4 flex items-center justify-between">
          <NepaliDateFilter selectedYear={filterYear} selectedMonth={filterMonth} onYearChange={setFilterYear} onMonthChange={setFilterMonth} onReset={resetFilters} />
          <p className="text-sm text-slate-400">Showing {sortedClients.length} of {clients.length}</p>
        </CardContent></Card>

        {isLoading ? <div className="grid grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 bg-slate-800/50" />)}</div>
        : sortedClients.length === 0 ? <Card className="bg-slate-800/50"><CardContent className="py-12 text-center"><Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400 text-lg">No events found</p></CardContent></Card>
        : viewMode === 'cards' ? <div className="grid grid-cols-3 gap-4">{/* BUGFIX: Using registeredDateTimeAD for stable React reconciliation; bookedRowNumber is not globally unique. */sortedClients.map(c => <EventClientCard key={c.registeredDateTimeAD || `${c.bookedRowNumber}-${c.clientName}`} client={c} />)}</div>
        : <TooltipProvider>
            <Card className="bg-slate-800/50 border-slate-700/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Client</TableHead>
                    <TableHead className="text-slate-400">Event Date</TableHead>
                    <TableHead className="text-slate-400">Events</TableHead>
                    <TableHead className="text-slate-400">Days Left</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                    <TableHead className="text-slate-400">Handler</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map(client => {
                    const days = getDaysUntilEvent(client);
                    const missing = hasMissingDate(client);
                    const parsedEvents = parseEventDetails(
                      client.events || '',
                      client.eventYear || '',
                      client.eventMonth || '',
                      client.eventDay || ''
                    );
                    return (
                      <TableRow 
                        // BUGFIX: Using registeredDateTimeAD for stable React reconciliation; bookedRowNumber is not globally unique.
                        key={client.registeredDateTimeAD || `${client.bookedRowNumber}-${client.clientName}`} 
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <button 
                            onClick={() => navigate(getClientDetailPath(client), { state: { from: location.pathname } })}
                            className="font-medium text-white hover:text-blue-400 transition-colors cursor-pointer text-left"
                          >
                            {client.clientName}
                          </button>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex flex-col gap-0.5">
                            {parsedEvents.length > 0 ? parsedEvents.map((event, i) => (
                              <span key={i} className="whitespace-nowrap">
                                {event.year} {event.monthName} {event.day.includes('*') ? '**' : event.day}
                              </span>
                            )) : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          <div className="flex flex-col gap-0.5">
                            {client.events?.split('\n').filter(Boolean).map((e, i) => <span key={i}>{e}</span>) || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{getCountdownBadge(days, missing)}</TableCell>
                        <TableCell className="text-slate-300">{client.eventCity || '-'}</TableCell>
                        <TableCell className="text-slate-300">{client.clientHandler || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`tel:${client.contactNo}`, '_self')}>
                                  <Phone className="h-4 w-4 text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{client.contactNo || 'No number'}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openWhatsApp(client.whatsappNo || '')}>
                                  <MessageCircle className="h-4 w-4 text-green-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{client.whatsappNo || client.contactNo || 'No number'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TooltipProvider>}
      </div>
    </div>
  );
};

export default DesktopBookedClients;
