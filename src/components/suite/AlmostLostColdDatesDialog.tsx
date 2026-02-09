import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientData } from "@/lib/sheets-api";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";
import { AlertTriangle, Snowflake } from "lucide-react";

interface AlmostLostColdDatesDialogProps {
  type: 'almost-lost' | 'cold-dates';
  clients: ClientData[];
  statusOptions: string[];
  handlerOptions: string[];
  mindsetOptions: string[];
  paymentTypes: string[];
  banks: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlmostLostColdDatesDialog({
  type,
  clients,
  statusOptions,
  handlerOptions,
  mindsetOptions,
  paymentTypes,
  banks,
  open,
  onOpenChange,
}: AlmostLostColdDatesDialogProps) {
  const isAlmostLost = type === 'almost-lost';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className={`px-4 pt-4 pb-3 border-b ${isAlmostLost ? 'bg-amber-50' : 'bg-cyan-50'}`}>
          <DialogTitle className="flex items-center gap-2">
            {isAlmostLost ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <Snowflake className="w-5 h-5 text-cyan-600" />
            )}
            <span className={isAlmostLost ? 'text-amber-800' : 'text-cyan-800'}>
              {isAlmostLost ? 'Almost Lost' : 'Cold Dates'}
            </span>
            <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${isAlmostLost ? 'bg-amber-200 text-amber-700' : 'bg-cyan-200 text-cyan-700'}`}>
              {clients.length}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isAlmostLost
              ? 'Clients with events in less than 1 month — act fast!'
              : 'Clients on dates with enquiries but zero bookings'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-3 py-2">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No clients found
            </p>
          ) : (
            <div className="space-y-2 pb-4">
              {clients.map((client, i) => (
                <FreshClientCard
                  key={client.rowNumber || i}
                  client={client}
                  statusOptions={statusOptions}
                  handlerOptions={handlerOptions}
                  mindsetOptions={mindsetOptions}
                  paymentTypes={paymentTypes}
                  banks={banks}
                  currentStatusCategory={isAlmostLost ? 'ALMOST LOST' : 'COLD DATES'}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
