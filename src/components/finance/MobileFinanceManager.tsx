import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, DollarSign, Users, TrendingUp, Clock, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BookedClientData } from "@/lib/sheets-api";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import FinanceClientCard from "./FinanceClientCard";
import NepaliDateFilter from "../booked/NepaliDateFilter";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";

const MobileFinanceManager = () => {
  const navigate = useNavigate();
  const { clients, isLoading, refreshData, isSyncing } = useBookedCachedData();
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'fully-paid' | 'partial' | 'no-payment'>('all');
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);

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

  const handlers = useMemo(() => {
    const handlerMap = new Map<string, number>();
    clients.forEach(client => {
      const handler = client.clientHandler?.trim().toUpperCase();
      if (handler) handlerMap.set(handler, (handlerMap.get(handler) || 0) + 1);
    });
    return Array.from(handlerMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [clients]);

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

  const filteredClients = clients.filter(client => {
    if (selectedHandler && client.clientHandler?.trim().toUpperCase() !== selectedHandler) return false;
    if (filterYear && client.eventYear !== filterYear.toString()) return false;
    if (filterMonth && client.eventMonth !== filterMonth.toString()) return false;
    if (paymentFilter !== 'all') {
      const status = getPaymentStatus(client);
      if (status !== paymentFilter) return false;
    }
    return true;
  });

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

  const resetFilters = () => { setFilterYear(null); setFilterMonth(null); setPaymentFilter('all'); setSelectedHandler(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900">
      <GlobalModeToggle />
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-emerald-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Finance Manager</h1>
              <p className="text-xs text-emerald-400">{clients.length} clients</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refreshData} disabled={isSyncing} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-6">
        {isLoading ? (
          <div className="space-y-3 pt-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 bg-slate-800/50" />)}</div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-400" /></div>
                    <div><p className="text-xs text-emerald-400">Total Value</p><p className="text-lg font-bold text-emerald-300">₹{(totalBookedValue / 1000).toFixed(0)}K</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg"><DollarSign className="h-4 w-4 text-green-400" /></div>
                    <div><p className="text-xs text-green-400">Received</p><p className="text-lg font-bold text-green-300">₹{(totalPaidValue / 1000).toFixed(0)}K</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg"><Clock className="h-4 w-4 text-amber-400" /></div>
                    <div><p className="text-xs text-amber-400">Pending</p><p className="text-lg font-bold text-amber-300">₹{(remainingValue / 1000).toFixed(0)}K</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg"><Percent className="h-4 w-4 text-blue-400" /></div>
                    <div><p className="text-xs text-blue-400">Collection</p><p className="text-lg font-bold text-blue-300">{collectionRate.toFixed(0)}%</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Handler Pills */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                <Badge variant={selectedHandler === null ? 'default' : 'outline'} className={`cursor-pointer whitespace-nowrap ${selectedHandler === null ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-400 hover:text-white'}`} onClick={() => setSelectedHandler(null)}>All ({clients.length})</Badge>
                {handlers.map(handler => (
                  <Badge key={handler.name} variant={selectedHandler === handler.name ? 'default' : 'outline'} className={`cursor-pointer whitespace-nowrap ${selectedHandler === handler.name ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-400 hover:text-white'}`} onClick={() => setSelectedHandler(handler.name)}>{handler.name} ({handler.count})</Badge>
                ))}
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-3 space-y-3">
                <NepaliDateFilter selectedYear={filterYear} selectedMonth={filterMonth} onYearChange={setFilterYear} onMonthChange={setFilterMonth} onReset={resetFilters} />
                <div className="flex gap-1.5 flex-wrap">
                  {[{ value: 'all', label: 'All' }, { value: 'fully-paid', label: 'Fully Paid' }, { value: 'partial', label: 'Partial' }, { value: 'no-payment', label: 'No Payment' }].map(({ value, label }) => (
                    <Badge key={value} variant={paymentFilter === value ? 'default' : 'outline'} className={`cursor-pointer text-xs ${paymentFilter === value ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-400 hover:text-white'}`} onClick={() => setPaymentFilter(value as typeof paymentFilter)}>{label}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Showing {sortedClients.length} of {clients.length} clients</p>
            </div>

            <div className="space-y-3">
              {sortedClients.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="py-8 text-center">
                    <DollarSign className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No clients match your filters</p>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-2">Reset Filters</Button>
                  </CardContent>
                </Card>
              ) : (
                sortedClients.map((client) => <FinanceClientCard key={client.bookedRowNumber} client={client} onRefresh={refreshData} />)
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MobileFinanceManager;
