import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, DollarSign, Users, TrendingUp, Phone, MessageCircle, Clock, LayoutGrid, Table as TableIcon, Receipt, Database, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getBookedClients, resyncAllBookedClients, fullResyncAllBookedClients, BookedClientData, SyncDetail } from "@/lib/sheets-api";
import FinanceClientCard from "./FinanceClientCard";
import PaymentHistorySheet from "./PaymentHistorySheet";
import { SyncReportSheet } from "../booked/SyncReportSheet";
import { getMonthName } from "@/lib/nepali-months";
import { DesktopFinanceSidebar, PaymentStatus } from "./DesktopFinanceSidebar";
import { cn } from "@/lib/utils";

const DesktopFinanceManager = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isFullResyncing, setIsFullResyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>('all');
  const [selectedClient, setSelectedClient] = useState<BookedClientData | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  
  // New sidebar filter states
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // Sync report state
  const [syncReportOpen, setSyncReportOpen] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    copiedCount: number;
    syncedCount: number;
    skippedCount: number;
    notFoundCount: number;
    totalBooked: number;
    syncDetails?: SyncDetail[];
  } | null>(null);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await getBookedClients();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResyncAll = async () => {
    try {
      setIsResyncing(true);
      const result = await resyncAllBookedClients();
      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} clients`);
      } else {
        toast.info("All clients are up to date");
      }
      await fetchClients();
    } catch (error) {
      console.error("Error resyncing:", error);
      toast.error("Failed to resync");
    } finally {
      setIsResyncing(false);
    }
  };

  const handleFullResync = async () => {
    try {
      setIsFullResyncing(true);
      const result = await fullResyncAllBookedClients(true);
      
      setSyncReport({
        copiedCount: result.copiedCount,
        syncedCount: result.syncedCount,
        skippedCount: result.skippedCount,
        notFoundCount: result.notFoundCount,
        totalBooked: result.totalBooked,
        syncDetails: result.syncDetails
      });
      
      setSyncReportOpen(true);
      await fetchClients();
    } catch (error) {
      console.error("Error performing full resync:", error);
      toast.error("Failed to perform full resync");
    } finally {
      setIsFullResyncing(false);
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
  const collectionRate = totalBookedValue > 0 ? (totalPaidValue / totalBookedValue) * 100 : 0;

  // Get payment status for a client
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

  // Extract available months from client event dates
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, string>();
    clients.forEach(client => {
      if (client.eventYear && client.eventMonth) {
        const key = `${client.eventYear}-${client.eventMonth}`;
        const monthName = getMonthName(client.eventMonth);
        monthSet.set(key, `${monthName} ${client.eventYear}`);
      }
    });
    return Array.from(monthSet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [clients]);

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

  // Filter clients
  const filteredClients = clients.filter(client => {
    // Handler filter
    if (selectedHandler && client.clientHandler?.trim().toUpperCase() !== selectedHandler) {
      return false;
    }
    
    // Month filter
    if (selectedMonth) {
      const clientMonthKey = `${client.eventYear}-${client.eventMonth}`;
      if (clientMonthKey !== selectedMonth) return false;
    }
    
    // Payment status filter
    if (paymentFilter !== 'all') {
      const status = getPaymentStatus(client);
      if (status !== paymentFilter) return false;
    }
    
    return true;
  });

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
                variant="outline"
                onClick={handleFullResync}
                disabled={isFullResyncing}
                className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
              >
                {isFullResyncing ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-pulse" />
                    Full Syncing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Full Resync
                  </>
                )}
              </Button>
              <Button
                variant="default"
                onClick={handleResyncAll}
                disabled={isResyncing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isResyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resync
                  </>
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
                    <p className="text-xs text-amber-400">Pending ({collectionRate.toFixed(0)}%)</p>
                    <p className="text-xl font-bold text-amber-300">
                      NPR {remainingValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Card className="bg-slate-800/50 border-slate-700/50 mb-6">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-xs text-slate-400">Active Filters:</span>
                {selectedHandler && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    Handler: {selectedHandler}
                  </Badge>
                )}
                {paymentFilter !== 'all' && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    Status: {paymentFilter.replace('-', ' ')}
                  </Badge>
                )}
                {selectedMonth && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    Month: {availableMonths.find(m => m.value === selectedMonth)?.label}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-slate-400 hover:text-white"
                  onClick={() => {
                    setSelectedHandler(null);
                    setPaymentFilter('all');
                    setSelectedMonth(null);
                  }}
                >
                  Clear All
                </Button>
                <span className="text-sm text-slate-400">
                  Showing {sortedClients.length} of {clients.length}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Client List */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-40 bg-slate-800/50" />
              ))}
            </div>
          ) : sortedClients.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="py-12 text-center">
                <DollarSign className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4 text-lg">No clients match your filters</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedHandler(null);
                    setPaymentFilter('all');
                    setSelectedMonth(null);
                  }}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-3 gap-4">
              {sortedClients.map((client) => (
                <FinanceClientCard key={client.bookedRowNumber} client={client} onRefresh={fetchClients} />
              ))}
            </div>
          ) : (
            <TooltipProvider>
              <Card className="bg-slate-800/50 border-slate-700/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Client</TableHead>
                    <TableHead className="text-slate-400">Event Date</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Quote</TableHead>
                    <TableHead className="text-slate-400">Paid</TableHead>
                    <TableHead className="text-slate-400">Remaining</TableHead>
                    <TableHead className="text-slate-400">Progress</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map((client) => {
                    const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
                    const quotationAmount = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;
                    
                    let paidAmount = 0;
                    if (client.paymentsMade) {
                      client.paymentsMade.split('\n').forEach(entry => {
                        const match = entry.match(/NPR\s*([\d,]+)/);
                        if (match) paidAmount += parseInt(match[1].replace(/,/g, ''));
                      });
                    }
                    
                    const remaining = quotationAmount - paidAmount;
                    const progress = quotationAmount > 0 ? (paidAmount / quotationAmount) * 100 : 0;
                    const status = getPaymentStatus(client);
                    
                    return (
                      <TableRow 
                        key={client.bookedRowNumber} 
                        className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => handleRowClick(client)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{client.clientName}</p>
                            <p className="text-xs text-slate-400">{client.clientHandler || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatNepaliEventDate(client.eventYear, client.eventMonth, client.eventDay)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(status)}
                        </TableCell>
                        <TableCell className="text-emerald-400 font-medium whitespace-nowrap">
                          NPR {quotationAmount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-green-400 whitespace-nowrap">
                          NPR {paidAmount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-amber-400 whitespace-nowrap">
                          NPR {remaining.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-slate-400 w-10">{progress.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(`tel:${client.contactNo}`, '_self')}
                                >
                                  <Phone className="h-4 w-4 text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{client.contactNo || 'No number'}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(`https://wa.me/${client.whatsappNo?.replace(/\D/g, '')}`, '_blank')}
                                >
                                  <MessageCircle className="h-4 w-4 text-green-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{client.whatsappNo || client.contactNo || 'No number'}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRowClick(client)}
                                >
                                  <History className="h-4 w-4 text-emerald-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View/Edit Payment History</p>
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
            </TooltipProvider>
          )}
        </div>

        {/* Payment History Sheet */}
        {selectedClient && (
          <PaymentHistorySheet
            isOpen={isPaymentHistoryOpen}
            onClose={() => {
              setIsPaymentHistoryOpen(false);
              setSelectedClient(null);
            }}
            clientName={selectedClient.clientName}
            paymentsMade={selectedClient.paymentsMade || ''}
            finalQuotation={selectedClient.finalQuotation || ''}
            remainingPayment={selectedClient.remainingPayment || ''}
            rowNumber={selectedClient.bookedRowNumber}
            registeredDateTimeAD={selectedClient.registeredDateTimeAD}
            paymentDatesAD={selectedClient.paymentDatesAD || ''}
            onPaymentAdded={fetchClients}
          />
        )}
        
        {/* Sync Report Sheet */}
        <SyncReportSheet
          open={syncReportOpen}
          onOpenChange={setSyncReportOpen}
          report={syncReport}
        />
      </div>
    </div>
  );
};

export default DesktopFinanceManager;
