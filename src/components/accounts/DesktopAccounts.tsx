import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  RefreshCw, 
  Search,
  KeyRound,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getAccounts, AccountData } from "@/lib/accounts-api";
import { AccountTable } from "./AccountTable";
import { AccountTypeSidebar } from "./AccountTypeSidebar";
import { AccountDetailSheet } from "./AccountDetailSheet";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";

export function DesktopAccounts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: accounts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get unique account types and their counts
  const { accountTypes, typeCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach(acc => {
      if (acc.accountType) {
        counts[acc.accountType] = (counts[acc.accountType] || 0) + 1;
      }
    });
    return {
      accountTypes: Object.keys(counts).sort(),
      typeCounts: counts
    };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <AccountTypeSidebar
        accountTypes={accountTypes}
        typeCounts={typeCounts}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        totalCount={accounts.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <h1 className="text-2xl font-bold text-white">My Accounts</h1>
              </div>
              {selectedType && (
                <span className="text-slate-400">
                  / {selectedType} ({filteredAccounts.length})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by ID, type, or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                />
              </div>
              <Button 
                variant="outline" 
                className="border-slate-700 text-white hover:bg-slate-700"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <GlobalModeToggle />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 p-6 overflow-auto">
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
            <AccountTable
              accounts={filteredAccounts}
              onSelectAccount={handleSelectAccount}
            />
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <AccountDetailSheet
        account={selectedAccount}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
