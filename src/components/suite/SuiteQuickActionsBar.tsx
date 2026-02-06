import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, DollarSign, Search, X, ChevronRight, RefreshCw } from "lucide-react";
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
import { MasterSearchButton } from "./MasterSearchButton";
import { MasterSyncButton } from "./MasterSyncButton";

// Helper to parse quotation amount as number
function parseQuotationAmount(finalQuotation: string): number {
  if (!finalQuotation) return 0;
  const match = finalQuotation.match(/NPR\s*([\d,]+)/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10) || 0;
  }
  return 0;
}

interface SuiteQuickActionsBarProps {
  variant?: 'desktop' | 'mobile';
}

export function SuiteQuickActionsBar({ variant = 'desktop' }: SuiteQuickActionsBarProps) {
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
    navigate("/client-tracker/quick-add");
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

  if (variant === 'mobile') {
    return (
      <>
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-full overflow-hidden">
          <Button
            onClick={handleAddClient}
            className="h-9 w-full min-w-0 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md rounded-xl font-semibold gap-1 text-[10px] px-1"
          >
            <UserPlus className="w-3 h-3 shrink-0" />
            <span className="truncate">Add Client</span>
          </Button>
          
          <Button
            onClick={handleAddPayment}
            className="h-9 w-full min-w-0 overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md rounded-xl font-semibold gap-1 text-[10px] px-1"
          >
            <DollarSign className="w-3 h-3 shrink-0" />
            <span className="truncate">Add Payment</span>
          </Button>
        </div>

        {/* Client Selection Drawer */}
        <Drawer open={isPaymentListOpen} onOpenChange={setIsPaymentListOpen}>
          <DrawerContent className="bg-white border-gray-200 max-h-[85vh]">
            <DrawerHeader className="text-left border-b border-gray-200 pb-4">
              <DrawerTitle className="text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Select Client for Payment
              </DrawerTitle>
              <DrawerDescription className="text-gray-500">
                Choose a booked client to record payment
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="p-4 space-y-2">
                {filteredClients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
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
                          "bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300",
                          "group shadow-sm hover:shadow-md"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-700">
                              {client.clientName}
                            </p>
                            {quotation > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-emerald-600">
                                  Paid: {formatNPR(paid)}
                                </span>
                                {remaining > 0 && (
                                  <span className="text-xs text-amber-600">
                                    • Remaining: {formatNPR(remaining)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
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
          />
        )}
      </>
    );
  }

  // Desktop variant - horizontal bar with equal-sized buttons
  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleAddClient}
          className="h-10 min-w-[140px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md rounded-full font-semibold gap-2 px-6"
        >
          <UserPlus className="w-4 h-4" />
          Add Client
        </Button>
        
        <Button
          onClick={handleAddPayment}
          className="h-10 min-w-[140px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md rounded-full font-semibold gap-2 px-6"
        >
          <DollarSign className="w-4 h-4" />
          Add Payment
        </Button>
        
        <MasterSyncButton />
      </div>

      {/* Client Selection Drawer */}
      <Drawer open={isPaymentListOpen} onOpenChange={setIsPaymentListOpen}>
        <DrawerContent className="bg-white border-gray-200 max-h-[85vh]">
          <DrawerHeader className="text-left border-b border-gray-200 pb-4">
            <DrawerTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Select Client for Payment
            </DrawerTitle>
            <DrawerDescription className="text-gray-500">
              Choose a booked client to record payment
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-4 space-y-2">
              {filteredClients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
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
                        "bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300",
                        "group shadow-sm hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-700">
                            {client.clientName}
                          </p>
                          {quotation > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-emerald-600">
                                Paid: {formatNPR(paid)}
                              </span>
                              {remaining > 0 && (
                                <span className="text-xs text-amber-600">
                                  • Remaining: {formatNPR(remaining)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
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
        />
      )}
    </>
  );
}
