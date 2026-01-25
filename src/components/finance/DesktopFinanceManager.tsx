import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, DollarSign, Users, TrendingUp, Phone, MessageCircle, Clock, Percent, LayoutGrid, Table as TableIcon, Receipt, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getBookedClients, resyncAllBookedClients, fullResyncAllBookedClients, BookedClientData } from "@/lib/sheets-api";
import FinanceClientCard from "./FinanceClientCard";
import PaymentHistorySheet from "./PaymentHistorySheet";
import NepaliDateFilter from "../booked/NepaliDateFilter";
import { getMonthName } from "@/lib/nepali-months";

const DesktopFinanceManager = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isFullResyncing, setIsFullResyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'fully-paid' | 'partial' | 'no-payment'>('all');
  const [selectedClient, setSelectedClient] = useState<BookedClientData | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);

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
      const result = await fullResyncAllBookedClients();
      if (result.syncedCount > 0) {
        toast.success(`Full sync: Updated ${result.syncedCount} clients with all data`);
      } else {
        toast.info("All data is already synchronized");
      }
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

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (filterYear && client.eventYear !== filterYear.toString()) return false;
    if (filterMonth && client.eventMonth !== filterMonth.toString()) return false;
    
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

  const resetFilters = () => {
    setFilterYear(null);
    setFilterMonth(null);
    setPaymentFilter('all');
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-emerald-900/50 px-6 py-4">
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
              <h1 className="text-2xl font-bold text-white">Finance Manager</h1>
              <p className="text-sm text-emerald-400">{clients.length} clients tracked</p>
            </div>
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

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700/50 mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NepaliDateFilter
                selectedYear={filterYear}
                selectedMonth={filterMonth}
                onYearChange={setFilterYear}
                onMonthChange={setFilterMonth}
                onReset={resetFilters}
              />
              
              <div className="h-6 w-px bg-slate-600" />
              
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'fully-paid', label: 'Fully Paid' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'no-payment', label: 'No Payment' },
                ].map(({ value, label }) => (
                  <Badge
                    key={value}
                    variant={paymentFilter === value ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      paymentFilter === value 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'border-slate-600 text-slate-400 hover:text-white'
                    }`}
                    onClick={() => setPaymentFilter(value as typeof paymentFilter)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            
            <p className="text-sm text-slate-400">
              Showing {sortedClients.length} of {clients.length} clients
            </p>
          </CardContent>
        </Card>

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
              <Button variant="outline" onClick={resetFilters}>
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
                                <Receipt className="h-4 w-4 text-emerald-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Payment History</p>
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
    </div>
  );
};

export default DesktopFinanceManager;
