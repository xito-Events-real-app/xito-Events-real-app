import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, DollarSign, Users, TrendingUp, Phone, MessageCircle, Clock, LayoutGrid, Table as TableIcon, Receipt, Database, History } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { BookedClientData } from "@/lib/sheets-api";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import FinanceClientCard from "./FinanceClientCard";
import PaymentHistorySheet from "./PaymentHistorySheet";
import { getMonthName } from "@/lib/nepali-months";
import { DesktopFinanceSidebar, PaymentStatus } from "./DesktopFinanceSidebar";
import { cn } from "@/lib/utils";

// Handler color palette (same as Dashboard)
const handlerColors = [
  'text-violet-400',
  'text-cyan-400',
  'text-emerald-400',
  'text-orange-400',
  'text-pink-400',
  'text-amber-400',
];

// Background versions for badges
const handlerBgColors = [
  'bg-violet-500/20 border-violet-500/50',
  'bg-cyan-500/20 border-cyan-500/50',
  'bg-emerald-500/20 border-emerald-500/50',
  'bg-orange-500/20 border-orange-500/50',
  'bg-pink-500/20 border-pink-500/50',
  'bg-amber-500/20 border-amber-500/50',
];

// Parse events for a client (handles newline-delimited multi-event format)
const parseClientEvents = (client: BookedClientData) => {
  const events = client.events?.split('\n').filter(Boolean) || [];
  const years = client.eventYear?.split('\n').filter(Boolean) || [];
  const months = client.eventMonth?.split('\n').filter(Boolean) || [];
  const days = client.eventDay?.split('\n').filter(Boolean) || [];
  
  return events.map((eventName, i) => ({
    eventName: eventName.trim(),
    year: years[i] || '',
    month: months[i] || '',
    monthName: getMonthName(parseInt(months[i] || '0', 10)),
    day: days[i] || '',
  }));
};

const DesktopFinanceManager = () => {
  const navigate = useNavigate();
  const { clients, isLoading, refreshData, isSyncing } = useBookedCachedData();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>('all');
  const [selectedClient, setSelectedClient] = useState<BookedClientData | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  
  // New sidebar filter states
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // Get payment status for a client - MUST be defined before useMemo that uses it
  const getPaymentStatus = (client: BookedClientData): 'fully-paid' | 'partial' | 'no-payment' => {
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

    if (paidAmount >= quotationAmount && quotationAmount > 0) return 'fully-paid';
    if (paidAmount > 0) return 'partial';
    return 'no-payment';
  };

  // Filter clients (moved up so stats can use filteredClients)
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Handler filter
      if (selectedHandler && client.clientHandler?.trim().toUpperCase() !== selectedHandler) {
        return false;
      }
      
      // Month filter - handles multi-event clients
      if (selectedMonth) {
        const years = client.eventYear?.split('\n').filter(Boolean) || [];
        const months = client.eventMonth?.split('\n').filter(Boolean) || [];
        
        let hasMatchingMonth = false;
        for (let i = 0; i < Math.max(years.length, months.length); i++) {
          const year = years[i]?.trim() || years[0]?.trim();
          const month = months[i]?.trim() || months[0]?.trim();
          if (`${year}-${month}` === selectedMonth) {
            hasMatchingMonth = true;
            break;
          }
        }
        if (!hasMatchingMonth) return false;
      }
      
      // Payment status filter
      if (paymentFilter !== 'all') {
        const status = getPaymentStatus(client);
        if (status !== paymentFilter) return false;
      }
      
      return true;
    });
  }, [clients, selectedHandler, selectedMonth, paymentFilter]);

  // Calculate summary stats FROM FILTERED CLIENTS
  const totalBookedValue = useMemo(() => {
    return filteredClients.reduce((sum, client) => {
      const match = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);
  }, [filteredClients]);

  const totalPaidValue = useMemo(() => {
    return filteredClients.reduce((sum, client) => {
      if (!client.paymentsMade) return sum;
      const payments = client.paymentsMade.split('\n');
      return sum + payments.reduce((pSum, entry) => {
        const match = entry.match(/NPR\s*([\d,]+)/);
        return pSum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
      }, 0);
    }, 0);
  }, [filteredClients]);

  const remainingValue = useMemo(() => totalBookedValue - totalPaidValue, [totalBookedValue, totalPaidValue]);
  const collectionRate = useMemo(() => totalBookedValue > 0 ? (totalPaidValue / totalBookedValue) * 100 : 0, [totalBookedValue, totalPaidValue]);

  // Extract unique handlers from clients
  const handlers = useMemo(() => {
    const handlerMap = new Map<string, number>();
    clients.forEach(client => {
      const handler = client.clientHandler?.trim().toUpperCase();
      if (handler) {
        handlerMap.set(handler, (handlerMap.get(handler) || 0) + 1);
      }
    });
    return Array.from(handlerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Extract available months from client event dates (handles multi-event clients)
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, string>();
    clients.forEach(client => {
      // Parse multi-event dates (newline-delimited)
      const years = client.eventYear?.split('\n').filter(Boolean) || [];
      const months = client.eventMonth?.split('\n').filter(Boolean) || [];
      
      // Add each unique year-month combination
      for (let i = 0; i < Math.max(years.length, months.length); i++) {
        const year = years[i]?.trim() || years[0]?.trim();
        const month = months[i]?.trim() || months[0]?.trim();
        
        if (year && month) {
          const key = `${year}-${month}`;
          const monthName = getMonthName(parseInt(month, 10));
          monthSet.set(key, `${monthName} ${year}`);
        }
      }
    });
    return Array.from(monthSet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value)); // Most recent first
  }, [clients]);

  // Create handler-to-color mapping
  const handlerColorMap = useMemo(() => {
    const map = new Map<string, { text: string; bg: string }>();
    handlers.forEach((handler, idx) => {
      map.set(handler.name, {
        text: handlerColors[idx % handlerColors.length],
        bg: handlerBgColors[idx % handlerBgColors.length],
      });
    });
    return map;
  }, [handlers]);

  // Calculate payment counts for sidebar
  const paymentCounts = useMemo(() => {
    const counts = {
      all: clients.length,
      'fully-paid': 0,
      partial: 0,
      'no-payment': 0,
    };
    
    clients.forEach(client => {
      const status = getPaymentStatus(client);
      counts[status]++;
    });
    
    return counts;
  }, [clients]);

  // filteredClients is now defined above (moved for stats calculation)

  // Sort by remaining payment (highest first)
  const sortedClients = [...filteredClients].sort((a, b) => {
    const getRemaining = (client: BookedClientData) => {
      const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
      const quotation = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;
      let paid = 0;
      if (client.paymentsMade) {
        client.paymentsMade.split('\n').forEach(entry => {
          const match = entry.match(/NPR\s*([\d,]+)/);
          if (match) paid += parseInt(match[1].replace(/,/g, ''));
        });
      }
      return quotation - paid;
    };
    return getRemaining(b) - getRemaining(a);
  });

  const handleRowClick = (client: BookedClientData) => {
    setSelectedClient(client);
    setIsPaymentHistoryOpen(true);
  };

  const formatNepaliEventDate = (year: string, month: string, day: string): string => {
    if (!year || !month || !day) return 'TBD';
    return `${year} ${getMonthName(month)} ${day}`;
  };

  const getPaymentStatusBadge = (status: 'fully-paid' | 'partial' | 'no-payment') => {
    switch (status) {
      case 'fully-paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Partial</Badge>;
      case 'no-payment':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Unpaid</Badge>;
    }
  };

  // Check if any filter is active
  const hasActiveFilters = selectedHandler !== null || selectedMonth !== null || paymentFilter !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900">
      {/* Sidebar */}
      <DesktopFinanceSidebar
        totalClients={clients.length}
        handlers={handlers}
        selectedHandler={selectedHandler}
        onHandlerFilter={setSelectedHandler}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        paymentCounts={paymentCounts}
        selectedMonth={selectedMonth}
        onMonthFilter={setSelectedMonth}
        availableMonths={availableMonths}
      />

      {/* Main Content - offset by sidebar width */}
      <div className="ml-64 transition-all duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-emerald-900/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Finance Manager</h1>
              <p className="text-sm text-emerald-400">{clients.length} clients tracked</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-1" />
                  Table
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={isLoading || isSyncing}
              >
                <RefreshCw className={`h-4 w-4 text-slate-400 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
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
                    <p className="text-xl font-bold text-blue-300">{filteredClients.length}</p>
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
                    <p className="text-xs text-emerald-400">Total Value</p>
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
                    <p className="text-xs text-green-400">Collected</p>
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
                    <Clock className="h-5 w-5 text-amber-400" />
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 bg-slate-800/50" />
              ))}
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedClients.map((client) => (
                <FinanceClientCard 
                  key={client.bookedRowNumber} 
                  client={client} 
                  onRefresh={refreshData} 
                />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Client</TableHead>
                    <TableHead className="text-slate-400">Handler</TableHead>
                    <TableHead className="text-slate-400">Event Date</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Total</TableHead>
                    <TableHead className="text-slate-400 text-right">Paid</TableHead>
                    <TableHead className="text-slate-400 text-right">Pending</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map((client) => {
                    const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
                    const quotation = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;
                    
                    let paid = 0;
                    if (client.paymentsMade) {
                      client.paymentsMade.split('\n').forEach(entry => {
                        const match = entry.match(/NPR\s*([\d,]+)/);
                        if (match) paid += parseInt(match[1].replace(/,/g, ''));
                      });
                    }
                    
                    const pending = quotation - paid;
                    const status = getPaymentStatus(client);
                    const parsedEvents = parseClientEvents(client);
                    
                    // Handler colors
                    const handler = client.clientHandler?.trim().toUpperCase() || '';
                    const colors = handlerColorMap.get(handler) || { text: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/50' };

                    return (
                      <TableRow 
                        key={client.bookedRowNumber} 
                        className="border-slate-700 hover:bg-slate-700/30 cursor-pointer group"
                        onClick={() => handleRowClick(client)}
                      >
                        <TableCell className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                          {client.clientName}
                        </TableCell>
                        <TableCell>
                          {handler && (
                            <Badge variant="outline" className={`${colors.bg} ${colors.text} border`}>
                              {handler}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">
                          <div className="flex flex-col gap-1">
                            {parsedEvents.slice(0, 2).map((event, idx) => (
                              <div key={idx}>
                                {formatNepaliEventDate(event.year, event.month, event.day)}
                              </div>
                            ))}
                            {parsedEvents.length > 2 && (
                              <div className="text-slate-500">+{parsedEvents.length - 2} more</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(status)}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {quotation > 0 ? `₹${(quotation / 1000).toFixed(1)}K` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-emerald-400 font-medium">
                          {paid > 0 ? `₹${(paid / 1000).toFixed(1)}K` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-amber-400 font-medium">
                          {pending > 0 ? `₹${(pending / 1000).toFixed(1)}K` : '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {client.contactNo && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                                      onClick={() => window.open(`tel:${client.contactNo}`)}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Call {client.contactNo}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {(client.whatsappNo || client.contactNo) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-green-400/10"
                                      onClick={() => openWhatsApp(client.whatsappNo || client.contactNo || '')}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>WhatsApp</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                                    onClick={() => handleRowClick(client)}
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View History</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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

      {/* Payment History Sheet */}
      {selectedClient && (
        <PaymentHistorySheet
          isOpen={isPaymentHistoryOpen}
          onClose={() => setIsPaymentHistoryOpen(false)}
          clientName={selectedClient.clientName || ''}
          paymentsMade={selectedClient.paymentsMade || ''}
          finalQuotation={selectedClient.finalQuotation || ''}
          remainingPayment={selectedClient.remainingPayment || ''}
          rowNumber={selectedClient.rowNumber || 0}
          registeredDateTimeAD={selectedClient.registeredDateTimeAD || ''}
          paymentDatesAD={selectedClient.paymentDatesAD || ''}
          onPaymentAdded={refreshData}
        />
      )}
    </div>
  );
};

export default DesktopFinanceManager;
