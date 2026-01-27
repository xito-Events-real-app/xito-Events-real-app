import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  RefreshCw, 
  Search,
  KeyRound,
  Loader2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getAccounts, AccountData } from "@/lib/accounts-api";
import { AccountCard } from "./AccountCard";
import { AccountDetailSheet } from "./AccountDetailSheet";
import { AddAccountDrawer } from "./AddAccountDrawer";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";

export function MobileAccounts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  const { data: accounts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get unique account types
  const accountTypes = useMemo(() => {
    const types = new Set<string>();
    accounts.forEach(acc => {
      if (acc.accountType) types.add(acc.accountType);
    });
    return Array.from(types).sort();
  }, [accounts]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch = !searchQuery || 
        acc.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.accountType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !selectedType || acc.accountType === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, selectedType]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Accounts refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleSelectAccount = (account: AccountData) => {
    setSelectedAccount(account);
    setDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-pink-400" />
              <h1 className="text-xl font-bold text-white">My Accounts</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
              onClick={() => setAddDrawerOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
            </Button>
            <GlobalModeToggle />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>

        {/* Type Filter Chips */}
        {accountTypes.length > 0 && (
          <ScrollArea className="mt-3 -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              <Badge
                variant={selectedType === null ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap ${
                  selectedType === null 
                    ? 'bg-pink-600 text-white hover:bg-pink-700' 
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setSelectedType(null)}
              >
                All ({accounts.length})
              </Badge>
              {accountTypes.map(type => {
                const count = accounts.filter(a => a.accountType === type).length;
                return (
                  <Badge
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    className={`cursor-pointer whitespace-nowrap ${
                      selectedType === type 
                        ? 'bg-pink-600 text-white hover:bg-pink-700' 
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedType(type)}
                  >
                    {type} ({count})
                  </Badge>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <KeyRound className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No accounts found</p>
          </div>
        ) : (
          filteredAccounts.map(account => (
            <AccountCard
              key={account.rowNumber}
              account={account}
              onSelect={handleSelectAccount}
            />
          ))
        )}
      </div>

      {/* Detail Sheet */}
      <AccountDetailSheet
        account={selectedAccount}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Add Account Drawer */}
      <AddAccountDrawer
        open={addDrawerOpen}
        onOpenChange={setAddDrawerOpen}
      />
    </div>
  );
}
