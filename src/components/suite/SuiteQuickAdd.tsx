import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, DollarSign, Search, X, ChevronRight } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { BookedClientData } from "@/lib/sheets-api";
import { getTotalPaid, formatNPR } from "@/lib/client-card-utils";
import PaymentDrawer from "@/components/finance/PaymentDrawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Helper to parse quotation amount as number
function parseQuotationAmount(finalQuotation: string): number {
  if (!finalQuotation) return 0;
  const match = finalQuotation.match(/NPR\s*([\d,]+)/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10) || 0;
  }
  return 0;
}

export function SuiteQuickAdd() {
  const navigate = useNavigate();
  const [isPaymentListOpen, setIsPaymentListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<BookedClientData | null>(null);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  
  const { clients: bookedClients } = useBookedCachedData();

  // Filter clients based on search
  const filteredClients = bookedClients.filter((client) =>
    client.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = () => {
    navigate("/client-tracker/add");
  };

  const handleAddPayment = () => {
    setIsPaymentListOpen(true);
  };

  const handleSelectClient = (client: BookedClientData) => {
    setSelectedClient(client);
    setIsPaymentListOpen(false);
    setIsPaymentDrawerOpen(true);
  };

  const handlePaymentAdded = () => {
    setSelectedClient(null);
    setSearchQuery("");
  };

  return (
    <>
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleAddClient}
          className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl font-semibold gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Client
        </Button>
        
        <Button
          onClick={handleAddPayment}
          className="h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl font-semibold gap-2"
        >
          <DollarSign className="w-5 h-5" />
          Add Payment
        </Button>
      </div>

      {/* Client Selection Drawer */}
      <Drawer open={isPaymentListOpen} onOpenChange={setIsPaymentListOpen}>
        <DrawerContent className="bg-slate-900 border-slate-700 max-h-[85vh]">
          <DrawerHeader className="text-left border-b border-slate-700 pb-4">
            <DrawerTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Select Client for Payment
            </DrawerTitle>
            <DrawerDescription className="text-slate-400">
              Choose a booked client to record payment
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-4 space-y-2">
              {filteredClients.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  {searchQuery ? "No clients found" : "No booked clients available"}
                </p>
              ) : (
                filteredClients.map((client) => {
                  const quotation = parseQuotationAmount(client.finalQuotation || "");
                  const paid = getTotalPaid(client.paymentsMade || "");
                  const remaining = quotation - paid;
                  
                  return (
                    <button
                      key={client.registeredDateTimeAD || client.bookedRowNumber}
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all",
                        "bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700 hover:border-emerald-500/50",
                        "group"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate group-hover:text-emerald-300">
                            {client.clientName}
                          </p>
                          {quotation > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-emerald-400">
                                Paid: {formatNPR(paid)}
                              </span>
                              {remaining > 0 && (
                                <span className="text-xs text-amber-400">
                                  • Remaining: {formatNPR(remaining)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Payment Drawer */}
      {selectedClient && (
        <PaymentDrawer
          isOpen={isPaymentDrawerOpen}
          onClose={() => {
            setIsPaymentDrawerOpen(false);
            setSelectedClient(null);
          }}
          clientName={selectedClient.clientName}
          rowNumber={selectedClient.bookedRowNumber || selectedClient.originalRowNumber}
          registeredDateTimeAD={selectedClient.registeredDateTimeAD || ""}
          existingPaymentsMade={selectedClient.paymentsMade || ""}
          existingPaymentDatesAD={selectedClient.paymentDatesAD || ""}
          finalQuotationAmount={parseQuotationAmount(selectedClient.finalQuotation || "")}
          onPaymentAdded={handlePaymentAdded}
          sourceSheet="booked"
        />
      )}
    </>
  );
}
